// 动效系统：Lenis 平滑滚动、滚动渐入、图片视差、阅读进度。

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

let lenis: Lenis | null = null;

export function scrollToTop() {
  if (lenis) {
    lenis.scrollTo(0, { immediate: true });
  } else {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
}

export function useSmoothScroll() {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    let frame = 0;
    const raf = (time: number) => {
      lenis?.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis?.destroy();
      lenis = null;
    };
  }, []);
}

/** 路由变化后重新扫描并观察带 [data-reveal] / .mask-reveal / [data-reveal-img] 的元素 */
export function RevealRunner({ deps }: { deps: unknown[] }) {
  useEffect(() => {
    let observer: IntersectionObserver | null = null;
    const timer = window.setTimeout(() => {
      const targets = document.querySelectorAll<HTMLElement>(
        '[data-reveal]:not(.is-visible), .mask-reveal:not(.is-visible), img[data-reveal-img]:not(.is-visible)',
      );
      if (targets.length === 0) return;

      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              entry.target.classList.add('is-visible');
              observer?.unobserve(entry.target);
            }
          }
        },
        { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
      );
      targets.forEach((target) => observer?.observe(target));
    }, 80);

    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return null;
}

/** 图片视差：元素在视口中的偏移以平滑速率映射为 translateY */
export function useParallax<T extends HTMLElement>(speed = 0.1) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight;
      const offset = (rect.top + rect.height / 2 - viewport / 2) * speed;
      // 与 .parallax-box 的放大组合，避免位移后露出边缘
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(1.12)`;
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [speed]);

  return ref;
}
