// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

namespace OurStory.Core.Entities;

/// <summary>
/// 相册照片：只从属于一个相册，与点滴正文互不引用
/// </summary>
public class AlbumPhoto {
    /// <summary>
    /// 获取或设置唯一标识
    /// </summary>
    public long Id { get; set; }

    /// <summary>
    /// 获取或设置所属相册编号
    /// </summary>
    public int AlbumId { get; set; }

    /// <summary>
    /// 获取或设置所属相册
    /// </summary>
    public PhotoAlbum? Album { get; set; }

    /// <summary>
    /// 获取或设置图片访问地址
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// 获取或设置图注
    /// </summary>
    public string? Caption { get; set; }

    /// <summary>
    /// 获取或设置上传时间；相册按这个时间分组展示
    /// </summary>
    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;
}
