// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

using OurStory.Core;
using OurStory.Core.Entities;
using OurStory.Core.Time;
using OurStory.Services.Moments;
using OurStory.Web.Infrastructure;
using System.Net;
using System.Text.RegularExpressions;

namespace OurStory.Web.Api;

/// <summary>
/// 相册接口：把全部已发布点滴里的照片（封面 + 正文配图）汇总成一份影集。
/// 上锁的回忆只对登录的情侣可见，草稿不出现。
/// </summary>
public static partial class SpaGalleryEndpoints {
    public static void MapSpaGalleryEndpoints(this WebApplication app) {
        ArgumentNullException.ThrowIfNull(app);

        _ = app.MapGet("/api/gallery", async (
            HttpContext context,
            IMomentService moments,
            MediaUrls media,
            SiteClock clock,
            CancellationToken cancellationToken) => {
                var isOwner = context.User.IsOwner();

                // 个人站点体量下一次性取回全部记录再过滤，最直观。
                var page = await moments.ListForAdminAsync(1, 1000, null, cancellationToken);
                var published = page.Items
                    .Where(moment => moment.Status == MomentStatus.Published && (isOwner || !moment.IsProtected))
                    .OrderBy(moment => moment.MomentDate)
                    .ThenBy(moment => moment.Id)
                    .ToArray();

                var photos = new List<object>();
                foreach (var moment in published) {
                    var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                    // 封面优先；封面没写进正文时图注用章节标题
                    if (!string.IsNullOrEmpty(moment.CoverUrl) && seen.Add(moment.CoverUrl)) {
                        photos.Add(Photo(moment, moment.CoverUrl, moment.Title, clock, media));
                    }

                    // 正文配图：alt 作为图注
                    foreach (Match match in ImageTags().Matches(moment.ContentHtml)) {
                        var source = WebUtility.HtmlDecode(Attribute(match.Value, "src"));
                        if (source.Length == 0
                            || (media.LocalKey(source) is null && !media.CanResize(source))
                            || !seen.Add(source)) {
                            continue;
                        }

                        photos.Add(Photo(moment, source, WebUtility.HtmlDecode(Attribute(match.Value, "alt")), clock, media));
                    }
                }

                return Results.Json(new { total = photos.Count, photos });
            });
    }

    private static object Photo(Moment moment, string source, string caption, SiteClock clock, MediaUrls media) => new {
        src = source,
        thumb = media.Preview(source),
        caption = string.IsNullOrWhiteSpace(caption) ? null : caption,
        momentId = moment.Id,
        momentSlug = moment.Slug,
        momentTitle = moment.Title,
        momentDate = clock.ToLocal(moment.MomentDate).ToString("yyyy-MM-dd"),
        url = $"/moments/{moment.Slug}"
    };

    private static string Attribute(string tag, string name) {
        var pattern = name switch {
            "src" => Source(),
            "alt" => Alternate(),
            _ => Source()
        };
        var match = pattern.Match(tag);
        return match.Success ? match.Groups["value"].Value : string.Empty;
    }

    [GeneratedRegex("""<img\b[^>]*>""", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex ImageTags();

    [GeneratedRegex("""\bsrc\s*=\s*(?:"(?<value>[^"]*)"|'(?<value>[^']*)')""", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex Source();

    [GeneratedRegex("""\balt\s*=\s*(?:"(?<value>[^"]*)"|'(?<value>[^']*)')""", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex Alternate();
}
