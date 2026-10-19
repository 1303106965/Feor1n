// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

using Microsoft.AspNetCore.Antiforgery;
using Microsoft.EntityFrameworkCore;
using OurStory.Core.Entities;
using OurStory.Core.Time;
using OurStory.Data;
using OurStory.Services.Storage;
using OurStory.Web.Infrastructure;

namespace OurStory.Web.Api;

/// <summary>
/// 相册接口：独立于点滴的相册体系。
/// 访客可以浏览相册和照片，管理员可以自定义分类、上传与删除照片。
/// </summary>
public static partial class SpaGalleryEndpoints {
    public static void MapSpaGalleryEndpoints(this WebApplication app) {
        ArgumentNullException.ThrowIfNull(app);

        _ = app.MapGet("/api/gallery/albums", async (
            OurStoryDbContext db,
            SiteClock clock,
            MediaUrls media,
            CancellationToken cancellationToken) => {
                var albums = await db.PhotoAlbums
                    .Include(album => album.Photos)
                    .OrderBy(album => album.SortOrder)
                    .ThenBy(album => album.Id)
                    .AsNoTracking()
                    .ToArrayAsync(cancellationToken);

                return Results.Json(new {
                    albums = albums.Select(album => AlbumCard(album, clock, media)),
                    total = albums.Sum(album => album.Photos.Count)
                });
            });

        _ = app.MapGet("/api/gallery/albums/{id:int}", async (
            int id,
            OurStoryDbContext db,
            SiteClock clock,
            MediaUrls media,
            CancellationToken cancellationToken) => {
                var album = await db.PhotoAlbums
                    .Include(item => item.Photos)
                    .AsNoTracking()
                    .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
                if (album is null) {
                    return Results.NotFound();
                }

                return Results.Json(new {
                    album = AlbumCard(album, clock, media),
                    photos = album.Photos
                        .OrderByDescending(photo => photo.UploadedAt)
                        .ThenByDescending(photo => photo.Id)
                        .Select(photo => PhotoPayload(photo, clock, media))
                });
            });

        _ = app.MapPost("/api/gallery/albums", async (
            AlbumRequest? request,
            HttpContext context,
            OurStoryDbContext db,
            IAntiforgery antiforgery,
            CancellationToken cancellationToken) => {
                if (await SpaPayloads.ValidateAntiforgeryAsync(context, antiforgery) is { } invalid) {
                    return invalid;
                }

                if (!context.User.IsOwner()) {
                    return Results.Json(new { ok = false, error = "只有主人才能整理相册。" },
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var body = request ?? new AlbumRequest(null, null);
                var title = (body.Title ?? string.Empty).Trim();
                if (title.Length is 0 or > 60) {
                    return Results.Json(new { ok = false, error = "相册名称需要 1-60 个字符。" },
                        statusCode: StatusCodes.Status400BadRequest);
                }

                var now = DateTimeOffset.UtcNow;
                var maxSort = await db.PhotoAlbums.MaxAsync(album => (int?)album.SortOrder, cancellationToken) ?? 0;
                var album = new PhotoAlbum {
                    Title = title,
                    Description = string.IsNullOrWhiteSpace(body.Description) ? null : body.Description!.Trim(),
                    SortOrder = maxSort + 1,
                    CreatedAt = now,
                    UpdatedAt = now
                };
                _ = db.PhotoAlbums.Add(album);
                _ = await db.SaveChangesAsync(cancellationToken);

                return Results.Json(new { ok = true, id = album.Id });
            });

        _ = app.MapPatch("/api/gallery/albums/{id:int}", async (
            int id,
            AlbumRequest? request,
            HttpContext context,
            OurStoryDbContext db,
            IAntiforgery antiforgery,
            CancellationToken cancellationToken) => {
                if (await SpaPayloads.ValidateAntiforgeryAsync(context, antiforgery) is { } invalid) {
                    return invalid;
                }

                if (!context.User.IsOwner()) {
                    return Results.Json(new { ok = false, error = "只有主人才能整理相册。" },
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var album = await db.PhotoAlbums.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
                if (album is null) {
                    return Results.NotFound();
                }

                var body = request ?? new AlbumRequest(null, null);
                var title = (body.Title ?? string.Empty).Trim();
                if (title.Length is 0 or > 60) {
                    return Results.Json(new { ok = false, error = "相册名称需要 1-60 个字符。" },
                        statusCode: StatusCodes.Status400BadRequest);
                }

                album.Title = title;
                album.Description = string.IsNullOrWhiteSpace(body.Description) ? null : body.Description!.Trim();
                album.UpdatedAt = DateTimeOffset.UtcNow;
                _ = await db.SaveChangesAsync(cancellationToken);

                return Results.Json(new { ok = true });
            });

        _ = app.MapDelete("/api/gallery/albums/{id:int}", async (
            int id,
            HttpContext context,
            OurStoryDbContext db,
            IAntiforgery antiforgery,
            CancellationToken cancellationToken) => {
                if (await SpaPayloads.ValidateAntiforgeryAsync(context, antiforgery) is { } invalid) {
                    return invalid;
                }

                if (!context.User.IsOwner()) {
                    return Results.Json(new { ok = false, error = "只有主人才能整理相册。" },
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var album = await db.PhotoAlbums.Include(item => item.Photos)
                    .FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
                if (album is null) {
                    return Results.NotFound();
                }

                _ = db.PhotoAlbums.Remove(album);
                _ = await db.SaveChangesAsync(cancellationToken);

                return Results.Json(new { ok = true });
            });

        _ = app.MapPost("/api/gallery/albums/{id:int}/photos", async (
            int id,
            HttpRequest httpRequest,
            HttpContext context,
            OurStoryDbContext db,
            IAttachmentService attachments,
            IAntiforgery antiforgery,
            CancellationToken cancellationToken) => {
                if (await SpaPayloads.ValidateAntiforgeryAsync(context, antiforgery) is { } invalid) {
                    return invalid;
                }

                if (!context.User.IsOwner()) {
                    return Results.Json(new { ok = false, error = "只有主人才能上传照片。" },
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var album = await db.PhotoAlbums.FirstOrDefaultAsync(item => item.Id == id, cancellationToken);
                if (album is null) {
                    return Results.NotFound();
                }

                var form = await httpRequest.ReadFormAsync(cancellationToken);
                var files = form.Files;
                if (files.Count == 0) {
                    return Results.Json(new { ok = false, error = "还没有选要上传的照片。" },
                        statusCode: StatusCodes.Status400BadRequest);
                }

                var now = DateTimeOffset.UtcNow;
                var added = 0;
                foreach (var file in files) {
                    if (file.Length == 0) {
                        continue;
                    }

                    await using var stream = file.OpenReadStream();
                    var result = await attachments.UploadAsync(stream, file.FileName, file.Length, cancellationToken);
                    if (!result.Success) {
                        if (added > 0) {
                            album.UpdatedAt = now;
                            _ = await db.SaveChangesAsync(cancellationToken);
                        }

                        return Results.Json(new { ok = false, error = $"{file.FileName}：{result.Error}" },
                            statusCode: StatusCodes.Status400BadRequest);
                    }

                    _ = db.AlbumPhotos.Add(new AlbumPhoto {
                        AlbumId = album.Id,
                        Url = result.Url,
                        UploadedAt = now
                    });
                    added++;
                }

                if (added == 0) {
                    return Results.Json(new { ok = false, error = "还没有选要上传的照片。" },
                        statusCode: StatusCodes.Status400BadRequest);
                }

                album.UpdatedAt = now;
                _ = await db.SaveChangesAsync(cancellationToken);

                return Results.Json(new { ok = true, count = added });
            });

        _ = app.MapDelete("/api/gallery/albums/{id:int}/photos/{photoId:long}", async (
            int id,
            long photoId,
            HttpContext context,
            OurStoryDbContext db,
            IMediaLibraryService library,
            MediaUrls media,
            IAntiforgery antiforgery,
            CancellationToken cancellationToken) => {
                if (await SpaPayloads.ValidateAntiforgeryAsync(context, antiforgery) is { } invalid) {
                    return invalid;
                }

                if (!context.User.IsOwner()) {
                    return Results.Json(new { ok = false, error = "只有主人才能整理相册。" },
                        statusCode: StatusCodes.Status403Forbidden);
                }

                var photo = await db.AlbumPhotos
                    .FirstOrDefaultAsync(item => item.Id == photoId && item.AlbumId == id, cancellationToken);
                if (photo is null) {
                    return Results.NotFound();
                }

                _ = db.AlbumPhotos.Remove(photo);
                _ = await db.SaveChangesAsync(cancellationToken);

                // 示例图片等静态资源没有对象键，直接跳过文件清理
                var objectKey = media.LocalKey(photo.Url);
                if (objectKey is not null) {
                    _ = await library.DeleteAsync(objectKey, cancellationToken);
                }

                return Results.Json(new { ok = true });
            });
    }

    private static object AlbumCard(PhotoAlbum album, SiteClock clock, MediaUrls media) {
        DateTimeOffset? latest = album.Photos.Count == 0
            ? null
            : album.Photos.Max(photo => photo.UploadedAt);
        return new {
            id = album.Id,
            title = album.Title,
            description = album.Description,
            cover = album.Photos.Count == 0
                ? null
                : media.Preview(album.Photos
                    .OrderByDescending(photo => photo.UploadedAt)
                    .ThenByDescending(photo => photo.Id)
                    .First().Url),
            photoCount = album.Photos.Count,
            latestUpload = latest is null ? null : clock.ToLocal(latest.Value).ToString("yyyy-MM-dd")
        };
    }

    private static object PhotoPayload(AlbumPhoto photo, SiteClock clock, MediaUrls media) => new {
        id = photo.Id,
        url = photo.Url,
        thumb = media.Preview(photo.Url),
        caption = photo.Caption,
        uploadedAt = clock.ToLocal(photo.UploadedAt).ToString("yyyy-MM-dd HH:mm"),
        uploadedOn = clock.ToLocal(photo.UploadedAt).ToString("yyyy-MM-dd")
    };

    public sealed record AlbumRequest(string? Title, string? Description);
}
