// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

using Microsoft.AspNetCore.DataProtection;
using OurStory.Core.Configuration;

namespace OurStory.Web.Infrastructure;

/// <summary>
/// 整站门禁中间件：没有通行 Cookie 的访客只能看到入口口令页。
///
/// 静态资源（脚本、样式、图片、附件）在它之前就已放行；
/// 口令页、错误页与健康检查明确豁免，接口返回 401 而不是重定向。
/// </summary>
public sealed class SiteGateMiddleware(RequestDelegate next) {
    /// <summary>
    /// 处理请求
    /// </summary>
    /// <param name="context">HTTP 上下文</param>
    /// <param name="configuration">活动配置</param>
    /// <param name="protection">数据保护提供器</param>
    public async Task InvokeAsync(HttpContext context, ActiveConfiguration configuration, IDataProtectionProvider protection) {
        // 配置里口令留空 = 明确关闭门禁
        var code = configuration.Site.AccessCode;
        if (string.IsNullOrEmpty(code) || IsExempt(context.Request.Path) || SiteGate.IsUnlocked(context, configuration, SiteGate.CreateProtector(protection))) {
            await next(context);
            return;
        }

        if (context.Request.Path.StartsWithSegments("/api")) {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new { ok = false, error = "请先输入入口口令。" });
            return;
        }

        if (HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method)) {
            var returnUrl = context.Request.Path + context.Request.QueryString;
            context.Response.Redirect($"/enter?returnUrl={Uri.EscapeDataString(returnUrl)}");
            return;
        }

        context.Response.StatusCode = StatusCodes.Status401Unauthorized;
    }

    private static bool IsExempt(PathString path) =>
        path.StartsWithSegments("/enter")
        || path.StartsWithSegments("/error")
        || path == "/healthz";
}

/// <summary>
/// 注册整站门禁中间件的扩展
/// </summary>
public static class SiteGateMiddlewareExtensions {
    /// <summary>
    /// 启用整站门禁
    /// </summary>
    /// <param name="app">应用构建器</param>
    /// <returns>应用构建器</returns>
    public static IApplicationBuilder UseSiteGate(this IApplicationBuilder app) =>
        app.UseMiddleware<SiteGateMiddleware>();
}
