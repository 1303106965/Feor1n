// 相册灯箱：入场缩放、左右滑动切换、衬线图注、跳回章节入口。

import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { GalleryPhoto } from '../lib/types';

interface GalleryLightboxProps {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onIndex: (index: number) => void;
}

export default function GalleryLightbox({ photos, index, onClose, onIndex }: GalleryLightboxProps) {
  const navigate = useNavigate();
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const photo = photos[index];

  const go = useCallback(
    (next: number) => {
      onIndex((next + photos.length) % photos.length);
    },
    [photos.length, onIndex],
  );

  const prev = useCallback(() => go(index - 1), [go, index]);
  const next = useCallback(() => go(index + 1), [go, index]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') prev();
      if (event.key === 'ArrowRight') next();
    },
    [onClose, prev, next],
  );

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onKeyDown]);

  const resetTilt = useCallback(() => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) translate3d(0, 0, 0)';
    el.style.setProperty('--glare-x', '50%');
    el.style.setProperty('--glare-y', '32%');
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const el = tiltRef.current;
      if (!el) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;

      el.style.transform = `perspective(1200px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 10).toFixed(2)}deg) translate3d(${(px * 9).toFixed(2)}px, ${(py * 9).toFixed(2)}px, 0)`;
      el.style.setProperty('--glare-x', `${((px + 0.5) * 100).toFixed(2)}%`);
      el.style.setProperty('--glare-y', `${((py + 0.5) * 100).toFixed(2)}%`);
    },
    [],
  );

  useEffect(() => {
    resetTilt();
  }, [index, resetTilt]);

  if (!photo) return null;

  const openChapter = () => {
    onClose();
    navigate(photo.url);
  };

  return (
    <div
      className="lightbox lightbox--gallery"
      role="dialog"
      aria-modal="true"
      aria-label="相册查看器"
      onClick={onClose}
      onPointerMove={onPointerMove}
      onPointerLeave={resetTilt}
      onTouchStart={(event) => {
        touchRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      }}
      onTouchEnd={(event) => {
        const start = touchRef.current;
        touchRef.current = null;
        if (!start) return;
        const deltaX = event.changedTouches[0].clientX - start.x;
        const deltaY = event.changedTouches[0].clientY - start.y;
        if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
          deltaX > 0 ? prev() : next();
        }
      }}
    >
      <button type="button" className="lightbox-btn lightbox-close" aria-label="关闭" onClick={onClose}>
        <X />
      </button>
      {photos.length > 1 ? (
        <button type="button" className="lightbox-btn lightbox-prev" aria-label="上一张" onClick={(e) => { e.stopPropagation(); prev(); }}>
          <ChevronLeft />
        </button>
      ) : null}
      {photos.length > 1 ? (
        <button type="button" className="lightbox-btn lightbox-next" aria-label="下一张" onClick={(e) => { e.stopPropagation(); next(); }}>
          <ChevronRight />
        </button>
      ) : null}

      <div className="lightbox-stage" onClick={(event) => event.stopPropagation()}>
        <div className="gallery-photo" key={photo.src + index}>
          <div className="gallery-photo-tilt" ref={tiltRef}>
            <div className="gallery-photo-sheen" aria-hidden="true" />
            <img
              className="gallery-photo-img"
              src={photo.src}
              alt={photo.caption ?? photo.momentTitle}
            />
          </div>
        </div>
        <div className="lightbox-caption">
          {photo.caption ?? photo.momentTitle}
          <span className="lightbox-caption-sub">
            {photo.momentDate} · {photo.momentTitle}
          </span>
        </div>
        <button type="button" className="lightbox-from" onClick={openChapter}>
          打开这一章 <ArrowRight />
        </button>
        <div className="lightbox-count">
          {String(index + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
}
