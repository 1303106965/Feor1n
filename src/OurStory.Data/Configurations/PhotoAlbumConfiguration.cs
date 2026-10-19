// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OurStory.Core.Entities;

namespace OurStory.Data.Configurations;

/// <summary>
/// 配置相册实体映射
/// </summary>
public class PhotoAlbumConfiguration : IEntityTypeConfiguration<PhotoAlbum> {
    /// <summary>
    /// 配置数据库表、字段和索引
    /// </summary>
    public void Configure(EntityTypeBuilder<PhotoAlbum> builder) {
        _ = builder.ToTable("photo_albums");
        _ = builder.HasKey(item => item.Id);
        _ = builder.Property(item => item.Title).HasMaxLength(60).IsRequired();
        _ = builder.Property(item => item.Description).HasMaxLength(200);
        _ = builder.Property(item => item.SortOrder).HasDefaultValue(0);
        _ = builder.HasMany(item => item.Photos)
            .WithOne(photo => photo.Album)
            .HasForeignKey(photo => photo.AlbumId)
            .OnDelete(DeleteBehavior.Cascade);
        _ = builder.HasIndex(item => item.SortOrder);
    }
}
