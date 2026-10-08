// 正文渲染 + 图片 Lightbox：正文 HTML 由后端 ArticleMedia 生成，
// 图片以 button[data-lightbox] 形式存在，点击进入全屏查看器（支持左右切换与滑动）。

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface LightboxImage {
  src: string;
  caption?: string;
}

function Lightbox({
  images,
  index,
  onClose,
  onIndex,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndex: (index: number) => void;
}) {
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const image = images[index];

  const prev = useCallback(() => {
    onIndex((index - 1 + images.length) % images.length);
  }, [index, images.length, onIndex]);

  const next = useCallback(() => {
    onIndex((index + 1) % images.length);
  }, [index, images.length, onIndex]);

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
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  if (!image) return null;

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="图片查看器"
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
        if (Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
          deltaX > 0 ? prev() : next();
        }
      }}
    >
      <button type="button" className="lightbox-btn lightbox-close" aria-label="关闭" onClick={onClose}>
        <X />
      </button>
      {images.length > 1 ? (
        <button type="button" className="lightbox-btn lightbox-prev" aria-label="上一张" onClick={(e) => { e.stopPropagation(); prev(); }}>
          <ChevronLeft />
        </button>
      ) : null}
      {images.length > 1 ? (
        <button type="button" className="lightbox-btn lightbox-next" aria-label="下一张" onClick={(e) => { e.stopPropagation(); next(); }}>
          <ChevronRight />
        </button>
      ) : null}
      <img src={image.src} alt={image.caption || ''} onClick={(event) => event.stopPropagation()} />
      {image.caption ? <div className="lightbox-caption">{image.caption}</div> : null}
      <div className="lightbox-count">
        {index + 1} / {images.length}
      </div>
    </div>
  );
}

export default function ArticleBody({ html, group }: { html: string; group: string }) {
  const [viewer, setViewer] = useState<{ images: LightboxImage[]; index: number } | null>(null);

  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest?.('[data-lightbox]') as HTMLElement | null;
    if (!target || target.dataset.lightbox !== group) return;
    event.preventDefault();

    const container = event.currentTarget;
    const buttons = Array.from(container.querySelectorAll<HTMLElement>(`[data-lightbox="${group}"]`));
    const images = buttons.map((button) => ({
      src: button.dataset.full ?? '',
      caption: button.dataset.caption,
    }));
    const index = buttons.indexOf(target);

    setViewer({ images, index: Math.max(0, index) });
  };

  return (
    <div className="article-body" onClick={onClick}>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {viewer ? (
        <Lightbox
          images={viewer.images}
          index={viewer.index}
          onClose={() => setViewer(null)}
          onIndex={(index) => setViewer((state) => (state ? { ...state, index } : state))}
        />
      ) : null}
    </div>
  );
}
