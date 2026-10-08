// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

using Microsoft.AspNetCore.Antiforgery;
using OurStory.Core.Models;
using OurStory.Core.Time;
using OurStory.Services.Comments;
using OurStory.Services.Moments;
using OurStory.Services.Settings;
using OurStory.Web.Infrastructure;

namespace OurStory.Web.Api;

/// <summary>
/// 点点滴滴的 SPA 接口：分页列表、详情、密码解锁与留言。
/// </summary>
public static class SpaMomentEndpoints {
    public static void MapSpaMomentEndpoints(this WebApplication app) {
        ArgumentNullException.ThrowIfNull(app);

        _ = app.MapGet("/api/moments", async (
            HttpContext context,
            int? page,
            ISettingsService settings,
            IMomentService moments,
            MomentUnlockStore unlockStore,
            SiteClock clock,
            MediaUrls media,
            CancellationToken cancellationToken) => {
                var site = await settings.GetAsync(cancellationToken);
                var viewer = new MomentViewer(context.User.IsOwner(), unlockStore.UnlockedIds());
                var result = await moments.GetPageAsync(page is > 0 ? page.Value : 1, viewer, cancellationToken);

                return Results.Json(new {
                    items = result.Items.Select(card => SpaPayloads.MapMoment(card, media)).ToArray(),
                    page = result.Page,
                    pageSize = result.PageSize,
                    totalCount = result.TotalCount,
                    totalPages = result.TotalPages,
                    hasNext = result.HasNext,
                    loveDays = LoveTimeline.DayNumber(clock.LocalNow, site.LoveStartedAt)
                });
            });

        _ = app.MapGet("/api/moments/{slug}", async (
            string slug,
            HttpContext context,
            ISettingsService settings,
            IMomentService moments,
            ICommentService comments,
            ArticleMedia articleMedia,
            MomentUnlockStore unlockStore,
            CancellationToken cancellationToken) => {
                var site = await settings.GetAsync(cancellationToken);
                var viewer = new MomentViewer(context.User.IsOwner(), unlockStore.UnlockedIds());
                var detail = await moments.GetDetailAsync(slug, viewer, cancellationToken);
                if (detail is null) {
                    return Results.NotFound();
                }

                var story = await articleMedia.RenderAsync(detail.ContentHtml, $"moment-{detail.Slug}", cancellationToken);
                var nodes = detail.IsLocked
                    ? []
                    : await comments.GetTreeAsync(detail.Id, cancellationToken);

                return Results.Json(new {
                    detail = new {
                        detail.Id,
                        detail.Title,
                        detail.Slug,
                        storyHtml = SpaPayloads.HtmlToString(story),
                        detail.Mood,
                        detail.Location,
                        momentDate = detail.MomentDate,
                        detail.IsLocked,
                        detail.IsProtected,
                        detail.AllowComment,
                        detail.AuthorName,
                        detail.LoveDay,
                        detail.CommentCount,
                        previous = detail.Previous is null
                            ? null
                            : new { detail.Previous.Title, detail.Previous.Slug, url = detail.Previous.Url },
                        next = detail.Next is null
                            ? null
                            : new { detail.Next.Title, detail.Next.Slug, url = detail.Next.Url }
                    },
                    comments = new {
                        totalCount = detail.IsLocked ? 0 : detail.CommentCount,
                        requireMail = site.CommentsRequireMail,
                        allowGuestComments = site.AllowGuestComments,
                        isLoggedIn = context.User.IsOwner(),
                        displayName = site.RoleName(context.User.Role()),
                        nodes
                    }
                });
            });

        _ = app.MapPost("/api/moments/{slug}/unlock", async (
            string slug,
            UnlockRequest? request,
            HttpContext context,
            IMomentService moments,
            MomentUnlockStore unlockStore,
            IAntiforgery antiforgery,
            CancellationToken cancellationToken) => {
                if (await SpaPayloads.ValidateAntiforgeryAsync(context, antiforgery) is { } invalid) {
                    return invalid;
                }

                var momentId = await moments.UnlockAsync(slug, request?.Password ?? string.Empty, cancellationToken);
                if (momentId is null) {
                    return Results.Json(
                        new { ok = false, error = "密码不正确，请检查后重新输入。" },
                        statusCode: StatusCodes.Status403Forbidden);
                }

                unlockStore.Remember(momentId.Value);
                return Results.Json(new { ok = true });
            });

        _ = app.MapPost("/api/moments/{slug}/comments", async (
            string slug,
            CommentRequest? request,
            HttpContext context,
            ISettingsService settings,
            IMomentService moments,
            ICommentService comments,
            MomentUnlockStore unlockStore,
            VisitorIdentityAccessor visitors,
            IAntiforgery antiforgery,
            CancellationToken cancellationToken) => {
                if (await SpaPayloads.ValidateAntiforgeryAsync(context, antiforgery) is { } invalid) {
                    return invalid;
                }

                var site = await settings.GetAsync(cancellationToken);
                var viewer = new MomentViewer(context.User.IsOwner(), unlockStore.UnlockedIds());
                var detail = await moments.GetDetailAsync(slug, viewer, cancellationToken);
                if (detail is null) {
                    return Results.NotFound();
                }

                var isLoggedIn = context.User.IsOwner();
                if (!detail.AllowComment || (!isLoggedIn && !site.AllowGuestComments)) {
                    return Results.Json(
                        new { ok = false, error = "这里暂时不能留言。" },
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var body = request ?? new CommentRequest();
                var error = Validate(site, isLoggedIn, body.Author, body.Mail, body.Text);
                if (error is not null) {
                    return Results.Json(new { ok = false, error }, statusCode: StatusCodes.Status400BadRequest);
                }

                var who = await visitors.GetAsync(cancellationToken);
                var created = await comments.AddAsync(new CommentSubmission {
                    MomentId = detail.Id,
                    ParentId = body.ReplyTo > 0 ? body.ReplyTo : null,
                    AuthorId = isLoggedIn ? context.User.UserId() : null,
                    AuthorName = isLoggedIn ? site.RoleName(context.User.Role()) : body.Author!.Trim(),
                    AuthorMail = isLoggedIn ? null : body.Mail,
                    AuthorUrl = isLoggedIn ? null : body.Url,
                    Content = body.Text!,
                    VisitorHash = isLoggedIn ? null : who.VisitorHash
                }, cancellationToken);

                return Results.Json(new { ok = true, id = created.Id });
            });
    }

    private static string? Validate(SiteSettings site, bool isLoggedIn, string? author, string? mail, string? text) {
        if (string.IsNullOrWhiteSpace(text)) {
            return "留言内容不能为空。";
        }

        if (text.Length > 2000) {
            return "留言太长了，2000 字以内吧。";
        }

        if (isLoggedIn) {
            return null;
        }

        if (string.IsNullOrWhiteSpace(author)) {
            return "还没有填写称呼。";
        }

        if (site.CommentsRequireMail && string.IsNullOrWhiteSpace(mail)) {
            return "请填写邮箱。";
        }

        return null;
    }

    /// <summary>
    /// 解锁请求载荷
    /// </summary>
    public sealed record UnlockRequest(string? Password);

    /// <summary>
    /// 留言请求载荷
    /// </summary>
    public sealed record CommentRequest(
        string? Author = null,
        string? Mail = null,
        string? Url = null,
        string? Text = null,
        int ReplyTo = 0);
}
