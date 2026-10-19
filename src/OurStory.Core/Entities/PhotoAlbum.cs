// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

namespace OurStory.Core.Entities;

/// <summary>
/// 相册：独立于点滴存在的照片集合，分类名称由两个人自己定义
/// </summary>
public class PhotoAlbum {
    /// <summary>
    /// 获取或设置唯一标识
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// 获取或设置相册名称
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// 获取或设置相册描述
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// 获取或设置排序值；数值越小越靠前
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// 获取或设置相册内的照片
    /// </summary>
    public List<AlbumPhoto> Photos { get; set; } = [];

    /// <summary>
    /// 获取或设置创建时间
    /// </summary>
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// 获取或设置最后更新时间
    /// </summary>
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
