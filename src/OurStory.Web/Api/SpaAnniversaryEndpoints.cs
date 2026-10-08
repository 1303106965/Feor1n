// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

using OurStory.Core.Models;
using OurStory.Core.Time;
using OurStory.Services.Anniversaries;
using OurStory.Web.Infrastructure;

namespace OurStory.Web.Api;

/// <summary>
/// 纪念日的 SPA 接口：总览、时间轴、即将到来、公历/农历月历与完整故事。
/// 逻辑从原 Razor 页模型移植，载荷形状保持一致。
/// </summary>
public static class SpaAnniversaryEndpoints {
    public static void MapSpaAnniversaryEndpoints(this WebApplication app) {
        ArgumentNullException.ThrowIfNull(app);

        _ = app.MapGet("/api/anniversaries", async (
            HttpContext context,
            IAnniversaryService anniversaries,
            SiteClock clock,
            MediaUrls media,
            CancellationToken cancellationToken) => {
                var today = clock.Today;
                var items = await anniversaries.GetForViewerAsync(context.User.IsOwner(), cancellationToken);
                var privateCount = await anniversaries.CountPrivateAsync(cancellationToken);

                return Results.Json(new {
                    today = today.ToString("yyyy-MM-dd"),
                    privateCount,
                    items = items.Select(item => SpaPayloads.MapAnniversary(item, today, media)).ToArray()
                });
            });

        _ = app.MapGet("/api/anniversaries/timeline", async (
            HttpContext context,
            int? skip,
            int? take,
            IAnniversaryService anniversaries,
            SiteClock clock,
            MediaUrls media,
            CancellationToken cancellationToken) => {
                var today = clock.Today;
                var source = (await anniversaries.GetForViewerAsync(context.User.IsOwner(), cancellationToken))
                    .OrderByDescending(item => item.OriginalDate)
                    .ThenByDescending(item => item.Id)
                    .ToArray();
                return Results.Json(Page(source, today, media, skip ?? 0, take ?? 10));
            });

        _ = app.MapGet("/api/anniversaries/upcoming", async (
            HttpContext context,
            int? skip,
            int? take,
            IAnniversaryService anniversaries,
            SiteClock clock,
            MediaUrls media,
            CancellationToken cancellationToken) => {
                var today = clock.Today;
                var source = (await anniversaries.GetForViewerAsync(context.User.IsOwner(), cancellationToken))
                    .Where(item => item.RepeatYearly && !item.IsArchived)
                    .OrderBy(item => item.DaysUntil)
                    .ThenBy(item => item.Title)
                    .ToArray();
                return Results.Json(Page(source, today, media, skip ?? 0, take ?? 10));
            });

        _ = app.MapGet("/api/anniversaries/calendar", async (
            HttpContext context,
            string? calendar,
            int? year,
            int? month,
            bool? leap,
            IAnniversaryService anniversaries,
            SiteClock clock,
            MediaUrls media,
            CancellationToken cancellationToken) => {
                var items = await anniversaries.GetForViewerAsync(context.User.IsOwner(), cancellationToken);
                var today = clock.Today;
                var lunarMode = string.Equals(calendar, "lunar", StringComparison.OrdinalIgnoreCase);
                var todayLunar = ChineseLunarCalendar.FromSolar(today);

                var viewYear = year ?? (lunarMode ? todayLunar.Year : today.Year);
                var viewMonth = month ?? (lunarMode ? todayLunar.Month : today.Month);
                var isLeap = leap ?? false;

                DateOnly firstDate;
                int days;
                if (lunarMode) {
                    viewYear = Math.Clamp(viewYear, ChineseLunarCalendar.MinimumYear, ChineseLunarCalendar.MaximumYear);
                    viewMonth = Math.Clamp(viewMonth, 1, 12);
                    if (ChineseLunarCalendar.LeapMonth(viewYear) != viewMonth) {
                        isLeap = false;
                    }

                    firstDate = ChineseLunarCalendar.ToSolar(new ChineseLunarDate(viewYear, viewMonth, 1, isLeap));
                    days = ChineseLunarCalendar.DaysInMonth(viewYear, viewMonth, isLeap);
                } else {
                    viewYear = Math.Clamp(viewYear, ChineseLunarCalendar.MinimumYear, ChineseLunarCalendar.MaximumYear);
                    viewMonth = Math.Clamp(viewMonth, 1, 12);
                    isLeap = false;
                    firstDate = new DateOnly(viewYear, viewMonth, 1);
                    days = DateTime.DaysInMonth(viewYear, viewMonth);
                }

                var leading = ((int)firstDate.DayOfWeek + 6) % 7;
                var rows = Math.Max(5, (int)Math.Ceiling((leading + days) / 7d));
                var cells = Enumerable.Range(0, rows * 7).Select(index => {
                    var solarDate = firstDate.AddDays(index - leading);
                    var lunarDate = ChineseLunarCalendar.FromSolar(solarDate);
                    var outside = lunarMode
                        ? lunarDate.Year != viewYear || lunarDate.Month != viewMonth || lunarDate.IsLeapMonth != isLeap
                        : solarDate.Year != viewYear || solarDate.Month != viewMonth;
                    var records = items.Where(item => AnniversaryTimeline.OccursOn(item, solarDate))
                        .OrderBy(item => item.Title)
                        .Select(CalendarRecord)
                        .ToArray();
                    return new {
                        solarDate = solarDate.ToString("yyyy-MM-dd"),
                        solarYear = solarDate.Year,
                        solarMonth = solarDate.Month,
                        lunarYear = lunarDate.Year,
                        lunarMonth = lunarDate.Month,
                        lunarLeap = lunarDate.IsLeapMonth,
                        primary = lunarMode
                            ? ChineseLunarCalendar.DayName(lunarDate.Day)
                            : solarDate.Day.ToString(System.Globalization.CultureInfo.InvariantCulture),
                        secondary = lunarMode
                            ? $"{solarDate.Month}/{solarDate.Day}"
                            : lunarDate.Day == 1
                                ? ChineseLunarCalendar.MonthName(lunarDate.Month, lunarDate.IsLeapMonth)
                                : ChineseLunarCalendar.DayName(lunarDate.Day),
                        solarLabel = solarDate.ToString("yyyy 年 M 月 d 日"),
                        lunarLabel = lunarDate.DisplayText,
                        weekday = WeekdayName(solarDate.DayOfWeek),
                        weekend = solarDate.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday,
                        outside,
                        isToday = solarDate == today,
                        records
                    };
                }).ToArray();

                var months = lunarMode ? LunarMonthOptions(viewYear) : SolarMonthOptions();
                var (Previous, Next) = lunarMode
                    ? LunarNavigation(viewYear, viewMonth, isLeap)
                    : SolarNavigation(viewYear, viewMonth);
                var originalYears = items.Select(item => item.OriginalDate.Year).DefaultIfEmpty(today.Year);
                var minimumYear = lunarMode
                    ? Math.Max(ChineseLunarCalendar.MinimumYear, items.Select(item => ChineseLunarCalendar.FromSolar(item.OriginalDate).Year).DefaultIfEmpty(todayLunar.Year).Min())
                    : Math.Max(ChineseLunarCalendar.MinimumYear, originalYears.Min());
                var maximumYear = lunarMode
                    ? Math.Min(ChineseLunarCalendar.MaximumYear, Math.Max(todayLunar.Year + 10, viewYear))
                    : Math.Min(ChineseLunarCalendar.MaximumYear, Math.Max(today.Year + 10, viewYear));

                return Results.Json(new {
                    calendar = lunarMode ? "lunar" : "solar",
                    year = viewYear,
                    month = viewMonth,
                    leap = isLeap,
                    monthKey = MonthKey(viewMonth, isLeap),
                    minimumYear,
                    maximumYear,
                    rows,
                    months,
                    previous = Previous,
                    next = Next,
                    cells
                });
            });

        _ = app.MapGet("/api/anniversaries/{id:int}", async (
            int id,
            HttpContext context,
            IAnniversaryService anniversaries,
            ArticleMedia articleMedia,
            SiteClock clock,
            MediaUrls media,
            CancellationToken cancellationToken) => {
                var sequence = (await anniversaries.GetForViewerAsync(context.User.IsOwner(), cancellationToken))
                    .OrderByDescending(item => item.OriginalDate)
                    .ThenByDescending(item => item.Id)
                    .ToArray();
                var index = Array.FindIndex(sequence, item => item.Id == id);
                if (index < 0) {
                    return Results.NotFound();
                }

                var item = sequence[index];
                var story = await articleMedia.RenderAsync(item.NoteHtml, $"anniversary-{item.Id}", cancellationToken);

                return Results.Json(new {
                    item = SpaPayloads.MapAnniversary(item, clock.Today, media),
                    storyHtml = SpaPayloads.HtmlToString(story),
                    previous = index > 0
                        ? new { id = sequence[index - 1].Id, title = sequence[index - 1].Title, url = sequence[index - 1].Url }
                        : null,
                    next = index + 1 < sequence.Length
                        ? new { id = sequence[index + 1].Id, title = sequence[index + 1].Title, url = sequence[index + 1].Url }
                        : null
                });
            });
    }

    private static object Page(AnniversaryOccurrence[] source, DateOnly today, MediaUrls media, int skip, int take) {
        skip = Math.Max(0, skip);
        take = Math.Clamp(take, 1, 10);
        var items = source.Skip(skip).Take(take)
            .Select(item => SpaPayloads.MapAnniversary(item, today, media))
            .ToArray();
        return new {
            items,
            hasMore = skip + items.Length < source.Length
        };
    }

    private static object CalendarRecord(AnniversaryOccurrence item) => new {
        item.Id,
        item.Title,
        item.Url,
        kind = item.Kind.ToString().ToLowerInvariant(),
        kindName = AnniversaryKinds.Name(item.Kind),
        kindIcon = AnniversaryKinds.Icon(item.Kind),
        item.RepeatYearly,
        item.IsPrivate,
        item.AuthorName,
        calendarName = item.CalendarName
    };

    private static string WeekdayName(DayOfWeek day) => day switch {
        DayOfWeek.Sunday => "星期日",
        DayOfWeek.Monday => "星期一",
        DayOfWeek.Tuesday => "星期二",
        DayOfWeek.Wednesday => "星期三",
        DayOfWeek.Thursday => "星期四",
        DayOfWeek.Friday => "星期五",
        _ => "星期六"
    };

    private static CalendarMonthOption[] SolarMonthOptions() => [.. Enumerable.Range(1, 12).Select(month =>
        new CalendarMonthOption(MonthKey(month, false), $"{month} 月"))];

    private static CalendarMonthOption[] LunarMonthOptions(int year) {
        var leapMonth = ChineseLunarCalendar.LeapMonth(year);
        var result = new List<CalendarMonthOption>(13);
        for (var month = 1; month <= 12; month++) {
            result.Add(new CalendarMonthOption(MonthKey(month, false), ChineseLunarCalendar.MonthName(month)));
            if (leapMonth == month) {
                result.Add(new CalendarMonthOption(MonthKey(month, true), ChineseLunarCalendar.MonthName(month, true)));
            }
        }

        return [.. result];
    }

    private static (object Previous, object Next) SolarNavigation(int year, int month) {
        var current = new DateOnly(year, month, 1);
        return (CalendarTarget(current.AddMonths(-1).Year, current.AddMonths(-1).Month, false),
            CalendarTarget(current.AddMonths(1).Year, current.AddMonths(1).Month, false));
    }

    private static (object Previous, object Next) LunarNavigation(int year, int month, bool leap) {
        var values = LunarMonthOptions(year)
            .Select(option => option.Value)
            .ToArray();
        var key = MonthKey(month, leap);
        var index = Array.IndexOf(values, key);
        if (index > 0 && index + 1 < values.Length) {
            return (CalendarTarget(year, values[index - 1]), CalendarTarget(year, values[index + 1]));
        }

        if (index == 0) {
            var previousYear = Math.Max(ChineseLunarCalendar.MinimumYear, year - 1);
            var previousValues = LunarMonthOptions(previousYear)
                .Select(option => option.Value)
                .ToArray();
            return (CalendarTarget(previousYear, previousValues[^1]), CalendarTarget(year, values[1]));
        }

        var nextYear = Math.Min(ChineseLunarCalendar.MaximumYear, year + 1);
        var nextValues = LunarMonthOptions(nextYear)
            .Select(option => option.Value)
            .ToArray();
        return (CalendarTarget(year, values[^2]), CalendarTarget(nextYear, nextValues[0]));
    }

    private static object CalendarTarget(int year, int month, bool leap) => new { year, month, leap };

    private static object CalendarTarget(int year, string key) {
        var values = key.Split('-');
        return CalendarTarget(year, int.Parse(values[0], System.Globalization.CultureInfo.InvariantCulture), values.Length == 2);
    }

    private static string MonthKey(int month, bool leap) => $"{month}{(leap ? "-leap" : string.Empty)}";

    private sealed record CalendarMonthOption(string Value, string Label);
}
