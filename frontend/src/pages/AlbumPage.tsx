// 相册详情：大画廊。照片按上传日期（年月）分组，瀑布流铺开，点开进入全屏灯箱。

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Pencil } from 'lucide-react';
import { api } from '../lib/api';
import { useBootstrap } from '../context/BootstrapContext';
import AlbumLightbox from '../components/AlbumLightbox';
import type { AlbumDetailData, AlbumPhoto } from '../lib/types';

export default function AlbumPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: bootstrap } = useBootstrap();
  const isOwner = bootstrap?.me.isOwner ?? false;
  const [data, setData] = useState<AlbumDetailData | null>(null);
  const [missing, setMissing] = useState(false);
  const [viewer, setViewer] = useState<{ index: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadRef = useRef<HTMLInputElement>(null);

  const albumId = Number(id);

  const load = useCallback(() => {
    if (!Number.isFinite(albumId) || albumId <= 0) {
      setMissing(true);
      return;
    }
    api.album(albumId)
      .then(setData)
      .catch(() => setMissing(true));
  }, [albumId]);

  useEffect(() => {
    load();
  }, [load]);

  const months = useMemo(() => {
    if (!data) return [];
    const buckets = new Map<string, AlbumPhoto[]>();
    for (const photo of data.photos) {
      const month = photo.uploadedOn.slice(0, 7);
      const bucket = buckets.get(month) ?? [];
      bucket.push(photo);
      buckets.set(month, bucket);
    }
    return Array.from(buckets.entries());
  }, [data]);

  const indexById = useMemo(() => {
    const map = new Map<number, number>();
    (data?.photos ?? []).forEach((photo, index) => map.set(photo.id, index));
    return map;
  }, [data]);

  if (missing) {
    return (
      <div className="empty-state">
        <span className="ghost-num">404</span>
        <p className="kicker">LOST ALBUM</p>
        <p className="display-md" style={{ marginTop: 12 }}>
          这本相册不在了。
        </p>
        <Link to="/gallery" className="chapter-link" style={{ marginTop: 22 }}>
          返回相册
        </Link>
      </div>
    );
  }

  if (!data) {
    return <div className="spinner" />;
  }

  const album = data.album;
  const dateRange = data.photos.length > 0
    ? `${data.photos[data.photos.length - 1].uploadedOn} ~ ${data.photos[0].uploadedOn}`
    : null;

  const onUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      await api.uploadPhotos(album.id, Array.from(files));
      load();
    } catch (error) {
      alert(error instanceof Error ? error.message : '上传失败，稍后再试。');
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  };

  const onRename = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') ?? '').trim();
    if (!title) return;
    try {
      await api.updateAlbum(album.id, {
        title,
        description: String(formData.get('description') ?? '').trim() || undefined,
      });
      setEditing(false);
      load();
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存失败，稍后再试。');
    }
  };

  const onDeleteAlbum = async () => {
    if (!window.confirm(`删除相册「${album.title}」？`)) return;
    try {
      await api.deleteAlbum(album.id);
      navigate('/gallery');
    } catch (error) {
      alert(error instanceof Error ? error.message : '删除失败，稍后再试。');
    }
  };

  const onDeletePhoto = async (photo: AlbumPhoto) => {
    if (!window.confirm('删除这张照片？')) return;
    try {
      await api.deletePhoto(album.id, photo.id);
      load();
      setViewer(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : '删除失败，稍后再试。');
    }
  };

  return (
    <>
      <header className="page-head album-head">
        <Link to="/gallery" className="album-back" data-reveal="fade">
          <ArrowLeft /> 相册
        </Link>
        {editing ? (
          <form className="album-form album-form--wide" onSubmit={(event) => void onRename(event)}>
            <input name="title" defaultValue={album.title} maxLength={60} required aria-label="相册名称" />
            <input name="description" defaultValue={album.description ?? ''} maxLength={200} placeholder="一句话描述（可选）" aria-label="相册描述" />
            <div className="album-form-actions">
              <button type="submit">保存</button>
              <button type="button" onClick={() => setEditing(false)}>取消</button>
            </div>
          </form>
        ) : (
          <>
            <h1 className="display-lg" data-reveal style={{ '--rd': '80ms' } as CSSProperties}>
              {album.title}
            </h1>
            <div className="page-head-sub" data-reveal style={{ '--rd': '160ms' } as CSSProperties}>
              <span>{data.photos.length} 张照片</span>
              {dateRange ? <span>{dateRange}</span> : null}
            </div>
          </>
        )}
        {isOwner && !editing ? (
          <div className="album-toolbar" data-reveal style={{ '--rd': '220ms' } as CSSProperties}>
            <button type="button" className="album-upload" disabled={uploading} onClick={() => uploadRef.current?.click()}>
              <ImagePlus /> {uploading ? '上传中…' : '上传照片'}
            </button>
            <button type="button" className="album-tool" aria-label="编辑相册信息" onClick={() => setEditing(true)}>
              <Pencil />
            </button>
            <button type="button" className="album-tool album-tool--danger" aria-label="删除相册" onClick={() => void onDeleteAlbum()}>
              删除相册
            </button>
            <input
              ref={uploadRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => void onUpload(event.target.files)}
            />
          </div>
        ) : null}
      </header>

      <div className="album-wrap">
        {data.photos.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 320 }}>
            <p className="kicker">EMPTY ALBUM</p>
            <p className="display-md" style={{ marginTop: 12 }}>
              这本相册还空着。
            </p>
          </div>
        ) : (
          months.map(([month, photos]) => {
            const [year, monthNumber] = month.split('-');
            return (
              <section key={month} className="album-month">
                <div className="gallery-year-head" data-reveal="fade">
                  <span className="year-num">{year}</span>
                  <span className="album-month-name">{Number(monthNumber)} 月</span>
                  <span className="rule" style={{ flex: 1 }} />
                  <span className="meta">{photos.length} PHOTOS</span>
                </div>
                <div className="album-masonry">
                  {photos.map((photo) => (
                    <button
                      type="button"
                      key={photo.id}
                      className="album-photo"
                      data-reveal="fade"
                      onClick={() => setViewer({ index: indexById.get(photo.id) ?? 0 })}
                      aria-label={`查看照片：${photo.caption ?? photo.uploadedOn}`}
                    >
                      <img src={photo.thumb} alt={photo.caption ?? photo.uploadedOn} loading="lazy" decoding="async" />
                      {photo.caption ? <span className="album-photo-cap">{photo.caption}</span> : null}
                    </button>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      {viewer ? (
        <AlbumLightbox
          photos={data.photos}
          index={viewer.index}
          onClose={() => setViewer(null)}
          onIndex={(index) => setViewer({ index })}
          onDelete={isOwner ? onDeletePhoto : undefined}
        />
      ) : null}
    </>
  );
}
