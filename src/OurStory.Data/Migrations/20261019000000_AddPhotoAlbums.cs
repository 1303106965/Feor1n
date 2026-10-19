// Copyright (c) 2026 Keeleycenc.
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OurStory.Data.Migrations;

/// <inheritdoc />
[DbContext(typeof(OurStoryDbContext))]
[Migration("20261019000000_AddPhotoAlbums")]
public sealed class AddPhotoAlbums : Migration {
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder) {
        migrationBuilder.CreateTable(
            name: "photo_albums",
            columns: table => new {
                Id = table.Column<int>(type: "INTEGER", nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                Title = table.Column<string>(type: "TEXT", maxLength: 60, nullable: false),
                Description = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                SortOrder = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 0),
                CreatedAt = table.Column<long>(type: "INTEGER", nullable: false),
                UpdatedAt = table.Column<long>(type: "INTEGER", nullable: false)
            },
            constraints: table => {
                table.PrimaryKey("PK_photo_albums", x => x.Id);
            });

        migrationBuilder.CreateTable(
            name: "album_photos",
            columns: table => new {
                Id = table.Column<long>(type: "INTEGER", nullable: false)
                    .Annotation("Sqlite:Autoincrement", true),
                AlbumId = table.Column<int>(type: "INTEGER", nullable: false),
                Url = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                Caption = table.Column<string>(type: "TEXT", maxLength: 120, nullable: true),
                UploadedAt = table.Column<long>(type: "INTEGER", nullable: false)
            },
            constraints: table => {
                table.PrimaryKey("PK_album_photos", x => x.Id);
                table.ForeignKey(
                    name: "FK_album_photos_photo_albums_AlbumId",
                    column: x => x.AlbumId,
                    principalTable: "photo_albums",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Cascade);
            });

        migrationBuilder.CreateIndex(
            name: "IX_photo_albums_SortOrder",
            table: "photo_albums",
            column: "SortOrder");

        migrationBuilder.CreateIndex(
            name: "IX_album_photos_AlbumId_UploadedAt",
            table: "album_photos",
            columns: new[] { "AlbumId", "UploadedAt" });
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder) {
        migrationBuilder.DropTable(name: "album_photos");
        migrationBuilder.DropTable(name: "photo_albums");
    }
}
