// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Html;
using OurStory.Core;
using OurStory.Core.Models;
using OurStory.Web.Infrastructure;
using System.Text.Encodings.Web;

namespace OurStory.Web.Api;

/// <summary>
/// SPA 接口共用的 JSON 载荷组装：把服务层模型映射成前端直接能用的形状。
/// </summary>
internal static class SpaPayloads {
    /// <summary>
    /// 组装点滴卡片载荷，封面附带压缩规格地址
    /// </summary>
    public static object MapMoment(MomentCard card, MediaUrls media) => new {
        card.Id,
        card.Title,
        card.Slug,
        card.Excerpt,
        coverUrl = card.CoverUrl,
        coverThumb = media.Cover(card.CoverUrl),
        card.Mood,
        card.Location,
        momentDate = card.MomentDate,
        card.IsLocked,
        card.IsProtected,
        card.AuthorName,
        card.CommentCount,
        card.LoveDay,
        url = card.Url
    };

    /// <summary>
    /// 组装纪念日条目载荷，包含时间轴、即将到来与月历都需要的字段
    /// </summary>
    public static object MapAnniversary(AnniversaryOccurrence item, DateOnly today, MediaUrls media) => new {
        item.Id,
        item.Title,
        item.Note,
        noteHtml = item.NoteHtml,
        summary = item.Summary,
        item.AuthorName,
        coverUrl = item.CoverUrl,
        coverThumb = media.Cover(item.CoverUrl),
        kind = item.Kind.ToString().ToLowerInvariant(),
        kindName = AnniversaryKinds.Name(item.Kind),
        kindIcon = AnniversaryKinds.Icon(item.Kind),
        calendarType = item.CalendarType.ToString().ToLowerInvariant(),
        calendarName = item.CalendarName,
        lunarDate = item.CalendarType == AnniversaryCalendarType.Lunar ? item.LunarDate.ShortText : string.Empty,
        originalDate = item.OriginalDate.ToString("yyyy-MM-dd"),
        nextDate = item.NextDate?.ToString("yyyy-MM-dd"),
        item.DaysUntil,
        dayNumber = Math.Max(1, today.DayNumber - item.OriginalDate.DayNumber + 1),
        item.RepeatYearly,
        item.IsPrivate,
        item.IsArchived,
        isToday = item.IsToday,
        url = item.Url
    };

    /// <summary>
    /// 把 Razor 的 <see cref="IHtmlContent"/> 渲染成字符串，交给前端按 HTML 直接展示
    /// </summary>
    public static string HtmlToString(IHtmlContent content) {
        using var writer = new StringWriter();
        content.WriteTo(writer, HtmlEncoder.Default);
        return writer.ToString();
    }

    /// <summary>
    /// JSON 端点不参与表单绑定的自动防伪校验，这里手动校验
    /// SPA 在 <c>RequestVerificationToken</c> 请求头里带上 /api/antiforgery 下发的令牌。
    /// </summary>
    public static async Task<IResult?> ValidateAntiforgeryAsync(HttpContext context, IAntiforgery antiforgery) {
        if (await antiforgery.IsRequestValidAsync(context)) {
            return null;
        }

        return Results.Json(
            new { ok = false, error = "页面停留太久啦，刷新一下再试。" },
            statusCode: StatusCodes.Status400BadRequest);
    }
}
