// 相册灯箱：入场缩放、左右滑动切换、衬线图注、跳回章节入口。

import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [direction, setDirection] = useState<0 | 1 | -1>(0);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const photo = photos[index];

  const go = useCallback(
    (next: number, dir: 1 | -1) => {
      setDirection(dir);
      onIndex((next + photos.length) % photos.length);
    },
    [photos.length, onIndex],
  );

  const prev = useCallback(() => go(index - 1, -1), [go, index]);
  const next = useCallback(() => go(index + 1, 1), [go, index]);

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
        <img
          key={photo.src + index}
          className={`lightbox-img lightbox-img--${direction === 0 ? 'in' : direction > 0 ? 'next' : 'prev'}`}
          src={photo.src}
          alt={photo.caption ?? photo.momentTitle}
        />
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
