// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using OurStory.Core.Configuration;
using OurStory.Web.Infrastructure;
using System.Security.Cryptography;
using System.Text;

namespace OurStory.Web.Pages;

/// <summary>
/// 站点入口口令页。
///
/// 整站内容都在门禁后面，这里用配置里的 <c>Site.AccessCode</c> 校验口令，
/// 通过后签发通行 Cookie，口令一换旧 Cookie 自动失效。
/// </summary>
public class EnterModel(ActiveConfiguration configuration, IDataProtectionProvider protection) : PageModel {
    /// <summary>
    /// 获取或设置访客输入的口令
    /// </summary>
    [BindProperty]
    public string? Code { get; set; }

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
    /// 处理 GET 请求
    /// </summary>
    /// <returns>已通过门禁时直接进站，否则展示口令页</returns>
    public IActionResult OnGet() {
        if (IsUnlocked()) {
            return BackInside();
        }

        return Page();
    }

    /// <summary>
    /// 处理 POST 请求
    /// </summary>
    /// <returns>口令正确时签发 Cookie 并进站，否则留在本页提示</returns>
    public IActionResult OnPost() {
        var code = configuration.Site.AccessCode;
        var input = Code ?? string.Empty;

        if (code.Length == 0 || input.Length == 0 || !Matches(input, code)) {
            Error = "口令不对，再想想。";
            return Page();
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
}
