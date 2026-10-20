// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using OurStory.Core;
using OurStory.Core.Configuration;
using OurStory.Core.Entities;
using OurStory.Web.Infrastructure;
using OurStory.Services.Accounts;
using OurStory.Services.Settings;
using System.Security.Cryptography;
using System.Security.Claims;
using System.Text;
using System.Globalization;

namespace OurStory.Web.Pages;

/// <summary>
/// 站点入口口令页。
///
/// 整站内容都在门禁后面，这里用配置里的 <c>Site.AccessCode</c> 校验口令，
/// 通过后签发通行 Cookie，口令一换旧 Cookie 自动失效。
/// </summary>
public class EnterModel(
    ActiveConfiguration configuration,
    IDataProtectionProvider protection,
    ISettingsService settings,
    IUserService users) : PageModel {
    /// <summary>
    /// 获取或设置访客输入的口令
    /// </summary>
    [BindProperty]
    public string? Code { get; set; }

    /// <summary>
    /// 获取或设置访客留下的名字；对上男主 / 女主名字时会自动登录对应账号
    /// </summary>
    [BindProperty]
    public string? Name { get; set; }

    /// <summary>
    /// 获取或设置通过门禁后要回到的站内地址
    /// </summary>
    [BindProperty(SupportsGet = true)]
    public string? ReturnUrl { get; set; }

    /// <summary>
    /// 获取口令校验失败时的提示
    /// </summary>
    public string? Error { get; private set; }

    /// <summary>
    /// 获取男主名字，用于入口页的快捷选择
    /// </summary>
    public string BoyName { get; private set; } = string.Empty;

    /// <summary>
    /// 获取女主名字，用于入口页的快捷选择
    /// </summary>
    public string GirlName { get; private set; } = string.Empty;

    /// <summary>
    /// 处理 GET 请求
    /// </summary>
    /// <returns>已通过门禁时直接进站，否则展示口令页</returns>
    public async Task<IActionResult> OnGetAsync() {
        var site = await settings.GetAsync();
        BoyName = site.BoyName;
        GirlName = site.GirlName;

        if (IsUnlocked()) {
            return BackInside();
        }

        return Page();
    }

    /// <summary>
    /// 处理 POST 请求
    /// </summary>
    /// <returns>口令正确时签发 Cookie 并进站，否则留在本页提示</returns>
    public async Task<IActionResult> OnPostAsync() {
        var code = configuration.Site.AccessCode;
        var input = Code ?? string.Empty;
        var name = (Name ?? string.Empty).Trim();

        if (code.Length == 0 || input.Length == 0 || !Matches(input, code)) {
            Error = "口令不对，再想想。";
            return Page();
        }

        if (name.Length == 0) {
            Error = "别忘了留下名字。";
            return Page();
        }

        var site = await settings.GetAsync();
        var role = ResolveRole(name, site.BoyName, site.GirlName);
        if (role is not null) {
            var user = (await users.ListAsync()).FirstOrDefault(candidate => candidate.Role == role);
            if (user is not null) {
                await SignInAsync(user);
            }
        }

        SiteGate.Unlock(HttpContext, SiteGate.CreateProtector(protection), code);
        return BackInside();
    }

    private bool IsUnlocked() =>
        configuration.Site.AccessCode.Length > 0
        && SiteGate.IsUnlocked(HttpContext, configuration, SiteGate.CreateProtector(protection));

    private LocalRedirectResult BackInside() =>
        LocalRedirect(!string.IsNullOrEmpty(ReturnUrl) && Url.IsLocalUrl(ReturnUrl) ? ReturnUrl : "/");

    private static bool Matches(string input, string code) =>
        CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(input)))),
            Encoding.UTF8.GetBytes(Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code)))));

    private static UserRole? ResolveRole(string name, string boyName, string girlName) {
        if (string.Equals(name, boyName, StringComparison.OrdinalIgnoreCase)) {
            return UserRole.Boy;
        }

        return string.Equals(name, girlName, StringComparison.OrdinalIgnoreCase)
            ? UserRole.Girl
            : null;
    }

    private async Task SignInAsync(User user) {
        var claims = new List<Claim> {
            new(ClaimTypes.NameIdentifier, user.Id.ToString(CultureInfo.InvariantCulture)),
            new(ClaimTypes.Name, user.UserName),
            new(ClaimTypes.Role, user.Role.ToString())
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties {
                IsPersistent = true,
                ExpiresUtc = DateTimeOffset.UtcNow.AddDays(30)
            });
    }
}
