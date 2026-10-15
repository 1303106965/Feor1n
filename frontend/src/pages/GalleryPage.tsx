// 相册：编辑式马赛克。按年份分组，错落网格 + 遮罩渐入，点击进入全屏灯箱。

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { api } from '../lib/api';
import type { GalleryData, GalleryPhoto } from '../lib/types';
import GalleryLightbox from '../components/GalleryLightbox';

// 桌面 12 列、移动 2 列的错落跨列节奏（每 3 张一组）
const DESKTOP_SPANS = [5, 4, 3];
const MOBILE_SPANS = [2, 1, 1];

export default function GalleryPage() {
  const [data, setData] = useState<GalleryData | null>(null);
  const [viewer, setViewer] = useState<{ photos: GalleryPhoto[]; index: number } | null>(null);
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 860px)').matches);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)');
    const onChange = () => setCompact(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    void api.gallery().then(setData).catch(() => setData({ total: 0, photos: [] }));
  }, []);

  const years = useMemo(() => {
    const buckets = new Map<string, GalleryPhoto[]>();
    for (const photo of data?.photos ?? []) {
      const year = photo.momentDate.slice(0, 4);
      const bucket = buckets.get(year) ?? [];
      bucket.push(photo);
      buckets.set(year, bucket);
    }
    return Array.from(buckets.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [data]);

  if (!data) {
    return <div className="spinner" />;
  }

  const chapters = new Set(data.photos.map((photo) => photo.momentSlug)).size;
  const allPhotos = data.photos;

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
          <span>{data.total} 帧光影</span>
          <span>出自 {chapters} 个章节</span>
        </div>
      </header>

      <div className="gallery-wrap">
        {allPhotos.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 320 }}>
            <p className="kicker">EMPTY ALBUM</p>
            <p className="display-md" style={{ marginTop: 12 }}>
              影集还是一片留白。
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
              把带照片的故事写进「点滴」，光影自会在此聚拢。
            </p>
          </div>
        ) : (
          years.map(([year, photos]) => (
            <section key={year} className="gallery-year">
              <div className="gallery-year-head" data-reveal="fade">
                <span className="year-num">{year}</span>
                <span className="rule" style={{ flex: 1 }} />
                <span className="meta">{photos.length} PHOTOS</span>
              </div>
              <div className="gallery-grid">
                {photos.map((photo, index) => {
                  const globalIndex = allPhotos.indexOf(photo);
                  const span = compact
                    ? MOBILE_SPANS[index % MOBILE_SPANS.length]
                    : DESKTOP_SPANS[index % DESKTOP_SPANS.length];
                  return (
                    <div
                      key={`${photo.momentSlug}-${index}`}
                      className="gallery-cell-wrap"
                      data-reveal="fade"
                      style={{
                        gridColumn: `span ${span}`,
                        '--rd': `${(index % 3) * 90}ms`,
                      } as CSSProperties}
                    >
                      <button
                        type="button"
                        className="gallery-cell mask-reveal"
                        onClick={() => setViewer({ photos: allPhotos, index: globalIndex })}
                        aria-label={`查看照片：${photo.caption ?? photo.momentTitle}`}
                      >
                        <img src={photo.thumb} alt={photo.caption ?? photo.momentTitle} loading="lazy" decoding="async" />
                        <span className="g-index">N°{String(globalIndex + 1).padStart(2, '0')}</span>
                        <span className="gallery-overlay">
                          {photo.caption ? <span className="g-cap">{photo.caption}</span> : null}
                          <span className="g-meta">
                            {photo.momentDate} · {photo.momentTitle}
                          </span>
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>

      {viewer ? (
        <GalleryLightbox
          photos={viewer.photos}
          index={viewer.index}
          onClose={() => setViewer(null)}
          onIndex={(index) => setViewer((state) => (state ? { ...state, index } : state))}
        />
      ) : null}
    </>
  );
}
