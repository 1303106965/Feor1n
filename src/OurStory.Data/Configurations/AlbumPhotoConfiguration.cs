// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OurStory.Core.Entities;

namespace OurStory.Data.Configurations;

/// <summary>
/// 配置相册照片实体映射
/// </summary>
public class AlbumPhotoConfiguration : IEntityTypeConfiguration<AlbumPhoto> {
    /// <summary>
    /// 配置数据库表、字段和索引
    /// </summary>
    public void Configure(EntityTypeBuilder<AlbumPhoto> builder) {
        _ = builder.ToTable("album_photos");
        _ = builder.HasKey(item => item.Id);
        _ = builder.Property(item => item.Url).HasMaxLength(500).IsRequired();
        _ = builder.Property(item => item.Caption).HasMaxLength(120);
        _ = builder.HasIndex(item => new { item.AlbumId, item.UploadedAt });
    }
}
