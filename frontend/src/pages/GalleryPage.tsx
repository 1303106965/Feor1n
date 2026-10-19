// 相册墙：独立相册体系。每本相册一张封面，点进去是按上传日期分组的大画廊。

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { useBootstrap } from '../context/BootstrapContext';
import type { AlbumCard } from '../lib/types';

const DESKTOP_SPANS = [5, 4, 3];
const MOBILE_SPANS = [2, 1, 1];

export default function GalleryPage() {
  const { data: bootstrap } = useBootstrap();
  const isOwner = bootstrap?.me.isOwner ?? false;
  const [data, setData] = useState<{ total: number; albums: AlbumCard[] } | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AlbumCard | null>(null);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 860px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)');
    const onChange = () => setCompact(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const load = useCallback(() => {
    void api.albums().then(setData).catch(() => setData({ total: 0, albums: [] }));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get('title') ?? '').trim();
    if (!title) return;
    try {
      await api.createAlbum({ title, description: String(formData.get('description') ?? '').trim() || undefined });
      form.reset();
      setCreating(false);
      load();
    } catch (error) {
      alert(error instanceof Error ? error.message : '创建失败，稍后再试。');
    }
  };

  const onUpdate = async (album: AlbumCard, event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get('title') ?? '').trim();
    if (!title) return;
    try {
      await api.updateAlbum(album.id, {
        title,
        description: String(formData.get('description') ?? '').trim() || undefined,
      });
      setEditing(null);
      load();
    } catch (error) {
      alert(error instanceof Error ? error.message : '保存失败，稍后再试。');
    }
  };

  const onDelete = async (album: AlbumCard) => {
    if (!window.confirm(`删除相册「${album.title}」？里面的 ${album.photoCount} 张照片会一并移除。`)) return;
    try {
      await api.deleteAlbum(album.id);
      load();
    } catch (error) {
      alert(error instanceof Error ? error.message : '删除失败，稍后再试。');
    }
  };

  if (!data) {
    return <div className="spinner" />;
  }

  return (
    <>
      <header className="page-head">
        <p className="kicker" data-reveal="fade">
          THE ALBUM
        </p>
        <h1 className="display-lg" data-reveal style={{ '--rd': '80ms' } as CSSProperties}>
          相册
        </h1>
        <div className="page-head-sub" data-reveal style={{ '--rd': '160ms' } as CSSProperties}>
          <span>{data.albums.length} 本相册</span>
          <span>{data.total} 帧光影</span>
        </div>
      </header>

      <div className="album-wall">
        <div className="album-grid">
          {data.albums.map((album, index) => {
            const span = compact
              ? MOBILE_SPANS[index % MOBILE_SPANS.length]
              : DESKTOP_SPANS[index % DESKTOP_SPANS.length];
            return (
              <div
                key={album.id}
                className="album-cell-wrap"
                data-reveal="fade"
                style={{ gridColumn: `span ${span}`, '--rd': `${(index % 3) * 90}ms` } as CSSProperties}
              >
                {editing?.id === album.id ? (
                  <form className="album-form" onSubmit={(event) => void onUpdate(album, event)}>
                    <input name="title" defaultValue={album.title} maxLength={60} required aria-label="相册名称" />
                    <input name="description" defaultValue={album.description ?? ''} maxLength={200} placeholder="一句话描述（可选）" aria-label="相册描述" />
                    <div className="album-form-actions">
                      <button type="submit">保存</button>
                      <button type="button" onClick={() => setEditing(null)}>取消</button>
                    </div>
                  </form>
                ) : (
                  <div className="album-cell">
                    <Link to={`/gallery/${album.id}`} className="album-cover" aria-label={`打开相册：${album.title}`}>
                      {album.cover ? (
                        <img src={album.cover} alt={album.title} loading="lazy" decoding="async" />
                      ) : (
                        <span className="album-cover-empty" aria-hidden="true" />
                      )}
                      <span className="album-overlay">
                        <span className="album-title">{album.title}</span>
                        <span className="album-meta">
                          {album.photoCount} 张{album.latestUpload ? ` · 最近 ${album.latestUpload}` : ''}
                        </span>
                      </span>
                    </Link>
                    {album.description ? <p className="album-desc">{album.description}</p> : null}
                    {isOwner ? (
                      <span className="album-tools">
                        <button type="button" aria-label="编辑相册" onClick={() => setEditing(album)}>
                          <Pencil />
                        </button>
                        <button type="button" aria-label="删除相册" onClick={() => void onDelete(album)}>
                          <Trash2 />
                        </button>
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}

          {isOwner && !creating ? (
            <button type="button" className="album-new" data-reveal="fade" onClick={() => setCreating(true)}>
              <Plus />
              <span>新建相册</span>
            </button>
          ) : null}
          {isOwner && creating ? (
            <div className="album-cell-wrap" style={{ gridColumn: 'span 4' }}>
              <form className="album-form" onSubmit={(event) => void onCreate(event)}>
                <input name="title" maxLength={60} placeholder="相册名称" required autoFocus />
                <input name="description" maxLength={200} placeholder="一句话描述（可选）" />
                <div className="album-form-actions">
                  <button type="submit">创建</button>
                  <button type="button" onClick={() => setCreating(false)}>取消</button>
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
