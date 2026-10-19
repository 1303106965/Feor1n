// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

using Microsoft.AspNetCore.DataProtection;
using OurStory.Core.Configuration;
using System.Security.Cryptography;
using System.Text;

namespace OurStory.Web.Infrastructure;

/// <summary>
/// 整站门禁：入口口令与通行 Cookie 的签发、校验。
///
/// Cookie 里存的是「当前口令的指纹」再经数据保护签名，
/// 改不了也伪造不了；口令一换，旧 Cookie 全部失效。
/// </summary>
public static class SiteGate {
    /// <summary>
    /// 获取通行 Cookie 名称
    /// </summary>
    public const string CookieName = "ourstory.gate";

    private const string ProtectionPurpose = "OurStory.SiteGate";
    private static readonly TimeSpan Lifetime = TimeSpan.FromDays(30);

    /// <summary>
    /// 创建门禁专用的数据保护器
    /// </summary>
    /// <param name="provider">数据保护提供器</param>
    /// <returns>数据保护器</returns>
    public static IDataProtector CreateProtector(IDataProtectionProvider provider) =>
        provider.CreateProtector(ProtectionPurpose);

    /// <summary>
    /// 判断当前请求是否已经通过门禁
    /// </summary>
    /// <param name="context">HTTP 上下文</param>
    /// <param name="configuration">活动配置</param>
    /// <param name="protector">门禁数据保护器</param>
    /// <returns>是否已通过门禁</returns>
    public static bool IsUnlocked(HttpContext context, ActiveConfiguration configuration, IDataProtector protector) {
        var raw = context.Request.Cookies[CookieName];
        if (string.IsNullOrEmpty(raw)) {
            return false;
        }

        string payload;
        try {
            payload = protector.Unprotect(raw);
        } catch (CryptographicException) {
            return false;
        }

        var expected = Fingerprint(configuration.Site.AccessCode);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(payload),
            Encoding.UTF8.GetBytes(expected));
    }

    /// <summary>
    /// 签发通行 Cookie
    /// </summary>
    /// <param name="context">HTTP 上下文</param>
    /// <param name="protector">门禁数据保护器</param>
    /// <param name="code">当前生效的入口口令</param>
    public static void Unlock(HttpContext context, IDataProtector protector, string code) {
        context.Response.Cookies.Append(CookieName, protector.Protect(Fingerprint(code)), new CookieOptions {
            HttpOnly = true,
            SameSite = SameSiteMode.Lax,
            IsEssential = true,
            MaxAge = Lifetime,
            Secure = context.Request.IsHttps
        });
    }

    private static string Fingerprint(string code) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(code)));
}
