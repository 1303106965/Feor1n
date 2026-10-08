// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Antiforgery;
using OurStory.Core;
using OurStory.Services.Accounts;
using OurStory.Services.Affinity;
using OurStory.Services.Anniversaries;
using OurStory.Services.Cycles;
using OurStory.Services.Heartbeats;
using OurStory.Services.Moments;
using OurStory.Services.Settings;
using OurStory.Services.Shop;
using OurStory.Web.Infrastructure;
using System.Globalization;
using System.Security.Claims;
using System.Security.Cryptography;

namespace OurStory.Web.Api;

/// <summary>
/// SPA 外壳数据接口：防伪令牌、站点设置、身份、心动令牌、登录登出，以及 SPA 的入口回退。
/// </summary>
public static class SpaShellEndpoints {
    public static void MapSpaShellEndpoints(this WebApplication app) {
        ArgumentNullException.ThrowIfNull(app);

        _ = app.MapGet("/api/antiforgery", (HttpContext context, IAntiforgery antiforgery) =>
            Results.Json(new { token = antiforgery.GetAndStoreTokens(context).RequestToken }));

        _ = app.MapGet("/api/heartbeat/token", async (
            VisitorIdentityAccessor visitors,
            HeartbeatTokenService tokens,
            CancellationToken cancellationToken) => {
                var who = await visitors.GetAsync(cancellationToken);
                return Results.Json(new { token = tokens.Issue(who) });
            });

        _ = app.MapGet("/api/bootstrap", async (
            HttpContext context,
            ISettingsService settings,
            IMomentService moments,
            IAnniversaryService anniversaries,
            IShopService shop,
            IAffinityService affinity,
            ICycleService cycles,
            IHeartbeatService heartbeats,
            VisitorIdentityAccessor visitors,
            HeartbeatTokenService tokens,
            IAntiforgery antiforgery,
            CancellationToken cancellationToken) => {
                var site = await settings.GetAsync(cancellationToken);

                var isOwner = context.User.IsOwner();
                var userId = context.User.UserId();
                var role = context.User.Role();

                var who = await visitors.GetAsync(cancellationToken);
                var heartbeatSummary = await heartbeats.GetSummaryAsync(who, cancellationToken);

                var momentsCount = await moments.CountPublishedAsync(cancellationToken);
                var anniversariesCount = await anniversaries.CountForViewerAsync(isOwner, cancellationToken);
                var shopPage = await shop.GetPageAsync(
                    new ShopQuery(PageSize: 1, Status: ShopItemStatus.Listed),
                    new ShopViewer(role, userId),
                    cancellationToken);

                var affinityStatus = userId is { } affinityUserId
                    ? await affinity.GetTodayStatusAsync(affinityUserId, role, cancellationToken)
                    : "登录后参与 · 仅限情侣";

                var cycleStatus = userId is { } cycleUserId
                    ? await cycles.GetHomeStatusAsync(cycleUserId, cancellationToken)
                    : "登录后查看 · 仅限情侣";

                var antiforgeryTokens = antiforgery.GetAndStoreTokens(context);

                return Results.Json(new {
                    site = new {
                        title = site.SiteTitle,
                        description = site.SiteDescription,
                        boyName = site.BoyName,
                        girlName = site.GirlName,
                        boySentence = site.BoySentence,
                        girlSentence = site.GirlSentence,
                        homeSentence = site.HomeSentence,
                        dailyNote = site.DailyNote,
                        loveStartedAt = site.LoveStartedAt,
                        colorMode = site.ColorMode
                    },
                    me = new {
                        isOwner,
                        role = role.ToString().ToLowerInvariant(),
                        displayName = site.RoleName(role)
                    },
                    antiforgeryToken = antiforgeryTokens.RequestToken,
                    heartbeat = new {
                        token = tokens.Issue(who),
                        summary = heartbeatSummary
                    },
                    counts = new {
                        moments = momentsCount,
                        anniversaries = anniversariesCount,
                        shop = shopPage.TotalCount
                    },
                    features = new {
                        affinity = affinityStatus,
                        cycles = cycleStatus
                    }
                });
            });

        _ = app.MapGet("/api/home", async (
            HttpContext context,
            ISettingsService settings,
            IMomentService moments,
            MomentUnlockStore unlockStore,
            MediaUrls media,
            CancellationToken cancellationToken) => {
                var site = await settings.GetAsync(cancellationToken);
                var viewer = new MomentViewer(context.User.IsOwner(), unlockStore.UnlockedIds());
                var latest = await moments.GetLatestAsync(3, viewer, cancellationToken);

                var loveLetter = site.LoveLetters.Count == 0
                    ? string.Empty
                    : site.LoveLetters[RandomNumberGenerator.GetInt32(site.LoveLetters.Count)];

                return Results.Json(new {
                    loveLetter,
                    latestMoments = latest.Select(card => SpaPayloads.MapMoment(card, media)).ToArray()
                });
            });

        _ = app.MapPost("/api/auth/login", async (
            LoginRequest? request,
            HttpContext context,
            IUserService users,
            IAntiforgery antiforgery,
            CancellationToken cancellationToken) => {
                if (await SpaPayloads.ValidateAntiforgeryAsync(context, antiforgery) is { } invalid) {
                    return invalid;
                }

                var userName = request?.UserName ?? string.Empty;
                var password = request?.Password ?? string.Empty;

                var user = await users.AuthenticateAsync(userName, password, cancellationToken);
                if (user is null) {
                    // 不区分「没这个人」和「口令不对」，避免把账号是否存在漏出去
                    return Results.Json(new { ok = false, error = "登录名或口令不对。" }, statusCode: StatusCodes.Status401Unauthorized);
                }

                var claims = new List<Claim>
                {
                    new(ClaimTypes.NameIdentifier, user.Id.ToString(CultureInfo.InvariantCulture)),
                    new(ClaimTypes.Name, user.UserName),
                    new(ClaimTypes.Role, user.Role.ToString())
                };

                var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);

                await context.SignInAsync(
                    CookieAuthenticationDefaults.AuthenticationScheme,
                    new ClaimsPrincipal(identity),
                    new AuthenticationProperties {
                        IsPersistent = request?.RememberMe ?? true,
                        ExpiresUtc = DateTimeOffset.UtcNow.AddDays(30)
                    });

                return Results.Json(new { ok = true });
            });

        _ = app.MapPost("/api/auth/logout", async (HttpContext context) => {
            await context.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Results.Json(new { ok = true });
        });

        _ = app.MapGet("/api/auth/me", async (
            HttpContext context,
            ISettingsService settings,
            CancellationToken cancellationToken) => {
                var site = await settings.GetAsync(cancellationToken);
                var role = context.User.Role();
                return Results.Json(new {
                    isOwner = context.User.IsOwner(),
                    role = role.ToString().ToLowerInvariant(),
                    displayName = site.RoleName(role)
                });
            });
    }

    /// <summary>
    /// SPA 入口回退：没有命中任何 Razor 页或接口的地址统一回到前端路由。
    /// 接口、后台、附件与错误页前缀不落入回退，保持各自的 404 语义。
    /// </summary>
    public static void MapSpaFallback(this WebApplication app) {
        ArgumentNullException.ThrowIfNull(app);

        app.MapFallback(async (HttpContext context, IWebHostEnvironment environment) => {
            var path = context.Request.Path.Value ?? "/";
            if (path.StartsWith("/api", StringComparison.OrdinalIgnoreCase)
                || path.StartsWith("/admin", StringComparison.OrdinalIgnoreCase)
                || path.StartsWith("/uploads", StringComparison.OrdinalIgnoreCase)
                || path.StartsWith("/media", StringComparison.OrdinalIgnoreCase)
                || path.StartsWith("/error", StringComparison.OrdinalIgnoreCase)) {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }

            var webRoot = environment.WebRootPath ?? Path.Combine(environment.ContentRootPath, "wwwroot");
            var index = Path.Combine(webRoot, "spa", "index.html");
            if (!File.Exists(index)) {
                context.Response.StatusCode = StatusCodes.Status404NotFound;
                return;
            }

            context.Response.ContentType = "text/html; charset=utf-8";
            await context.Response.WriteAsync(await File.ReadAllTextAsync(index));
        });
    }

    /// <summary>
    /// 登录请求载荷
    /// </summary>
    public sealed record LoginRequest(string? UserName, string? Password, bool RememberMe = true);
}
