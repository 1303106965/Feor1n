// 首页 = 一部关于两个人的电影。
// 第一屏：电影海报（年份 / 名字 / 克制短句 / 沉浸大图）。
// 之后：按时间正序的章节场景，最后一幕 TODAY 黑场收尾。

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { useBootstrap } from '../context/BootstrapContext';
import { loveElapsed, formatDate } from '../lib/time';
import { useParallax } from '../lib/motion';
import type { AnniversaryItem, MomentCard } from '../lib/types';

export default function HomePage() {
  const { data } = useBootstrap();
  const [moments, setMoments] = useState<MomentCard[] | null>(null);
  const [anniversaries, setAnniversaries] = useState<AnniversaryItem[]>([]);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    void (async () => {
      try {
        const all: MomentCard[] = [];
        let page = 1;
        for (;;) {
          const payload = await api.moments(page);
          all.push(...payload.items);
          if (!payload.hasNext) break;
          page += 1;
        }
        all.reverse(); // 电影按时间正序：从开始讲到现在
        setMoments(all);
      } catch {
        setMoments([]);
      }
    })();
    void api.anniversaries().then((payload) => setAnniversaries(payload.items)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!data) return null;

  const site = data.site;
  const elapsed = loveElapsed(site.loveStartedAt, now);
  const startYear = site.loveStartedAt.slice(0, 4);
  const chapters = moments ?? [];
  const poster = chapters[0] ?? chapters[chapters.length - 1];
  const nextAnniversary = anniversaries
    .filter((item) => item.repeatYearly && !item.isArchived && item.daysUntil !== null)
    .sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0))[0];

  return (
    <>
      {/* ============ 第一屏 · 电影海报 ============ */}
      <section className="film-hero">
        {poster?.coverUrl ? (
          <div className="hero-media kenburns">
            <img src={poster.coverUrl} alt="" />
          </div>
        ) : (
          <div className="hero-media" style={{ background: 'var(--black)' }} />
        )}
        <div className="hero-scrim" />
        <div className="hero-content">
          <p className="hero-kicker" data-reveal="fade">
            A PRIVATE FILM · EST. {startYear}
          </p>
          <h1 className="hero-names" data-reveal style={{ '--rd': '120ms' } as CSSProperties}>
            {site.boyName} <em>&amp;</em> {site.girlName}
          </h1>
          <p className="hero-line" data-reveal style={{ '--rd': '240ms' } as CSSProperties}>
            {site.homeSentence}
          </p>
        </div>
        <div className="hero-meta-bar">
          <span>EST. {formatDate(site.loveStartedAt)}</span>
          <span className="hero-scroll-cue">
            <i />
            SCROLL
          </span>
          <span>CHAPTER 01 — {String(chapters.length + 1).padStart(2, '0')}</span>
        </div>
      </section>

      {/* ============ 章节 ============ */}
      {chapters.map((moment, index) => {
        const variant = index % 3 === 2 ? 'cinema' : index % 2 === 1 ? 'reverse' : 'normal';
        const num = String(index + 1).padStart(2, '0');

        if (variant === 'cinema') {
          return (
            <section key={moment.id} className="chapter chapter--cinema">
              <div className="parallax-box" style={{ position: 'absolute', inset: 0 }}>
                <ParallaxImage src={moment.coverUrl || ''} alt="" />
              </div>
              <div className="hero-scrim" style={{ background: 'linear-gradient(to top, rgba(10,9,8,.86), rgba(10,9,8,.18) 60%, rgba(10,9,8,.35))' }} />
              <div className="chapter-grid">
                <div className="chapter-body">
                  <p className="hero-kicker" data-reveal="fade">
                    CHAPTER {num} · {formatDate(moment.momentDate)}
                  </p>
                  <h2 className="chapter-title" data-reveal style={{ '--rd': '100ms' } as CSSProperties}>
                    {moment.title}
                  </h2>
                  {moment.excerpt ? (
                    <p className="chapter-excerpt" data-reveal style={{ '--rd': '200ms' } as CSSProperties}>
                      {moment.excerpt}
                    </p>
                  ) : null}
                  <Link className="chapter-link" to={`/moments/${moment.slug}`} data-reveal style={{ '--rd': '300ms' } as CSSProperties}>
                    阅读这一章 <ArrowRight />
                  </Link>
                </div>
              </div>
            </section>
          );
        }

        return (
          <section key={moment.id} className={`chapter${variant === 'reverse' ? ' chapter--reverse' : ''}`}>
            <div className="chapter-grid">
              <div className="chapter-meta" data-reveal="fade">
                <em>{num}</em> — {formatDate(moment.momentDate)}
                {moment.location ? ` · ${moment.location}` : ''}
              </div>
              <figure className="chapter-figure mask-reveal">
                <ParallaxImage src={moment.coverUrl || ''} alt="" />
              </figure>
              <div className="chapter-body">
                <p className="kicker" data-reveal="fade">
                  CHAPTER {num}
                </p>
                <h2 className="chapter-title" data-reveal style={{ '--rd': '80ms' } as CSSProperties}>
                  {moment.title}
                </h2>
                <p className="meta chapter-date">
                  {formatDate(moment.momentDate)}
                  {moment.location ? ` · ${moment.location}` : ''}
                  {moment.loveDay > 0 ? ` · 第 ${moment.loveDay} 天` : ''}
                </p>
                {moment.excerpt ? (
                  <p className="chapter-excerpt" data-reveal style={{ '--rd': '160ms' } as CSSProperties}>
                    {moment.excerpt}
                  </p>
                ) : null}
                <Link className="chapter-link" to={`/moments/${moment.slug}`} data-reveal style={{ '--rd': '240ms' } as CSSProperties}>
                  阅读这一章 <ArrowRight />
                </Link>
              </div>
            </div>
          </section>
        );
      })}

      {chapters.length === 0 ? (
        <section className="chapter">
          <p className="kicker">PROLOGUE</p>
          <h2 className="display-md" style={{ marginTop: 14 }}>
            故事还没有开拍。
          </h2>
          <p className="chapter-excerpt" style={{ marginTop: 12 }}>
            在后台写下第一条点滴，这里就会出现第一章。
          </p>
        </section>
      ) : null}

      {/* ============ TODAY · 黑场收尾 ============ */}
      <section className="chapter-today">
        <div className="today-inner">
          <p className="today-kicker" data-reveal="fade">
            FINAL CHAPTER · TODAY
          </p>
          <div className="today-counter" data-reveal>
            第 {elapsed.days} 天
            <small>AND COUNTING</small>
          </div>
          <p className="today-sub" data-reveal style={{ '--rd': '120ms' } as CSSProperties}>
            始于 {formatDate(site.loveStartedAt)} · 故事仍在继续
          </p>

          <div className="today-grid">
            <div className="today-cell" data-reveal style={{ '--rd': '80ms' } as CSSProperties}>
              <p className="meta">Together</p>
              <div className="value">
                {elapsed.days}
                <em> 天 {String(elapsed.hours).padStart(2, '0')}:{String(elapsed.minutes).padStart(2, '0')}:{String(elapsed.seconds).padStart(2, '0')}</em>
              </div>
            </div>
            <div className="today-cell" data-reveal style={{ '--rd': '160ms' } as CSSProperties}>
              <p className="meta">Next Stop</p>
              <div className="value">
                {nextAnniversary ? (
                  <>
                    {nextAnniversary.title}
                    <em> · {nextAnniversary.daysUntil} 天后</em>
                  </>
                ) : (
                  <em>尚未标记</em>
                )}
              </div>
            </div>
            <div className="today-cell" data-reveal style={{ '--rd': '240ms' } as CSSProperties}>
              <p className="meta">Archive</p>
              <div className="value">
                {data.counts.moments}
                <em> 章 · {data.counts.anniversaries} 个纪念日</em>
              </div>
            </div>
          </div>

          <div className="today-links" data-reveal style={{ '--rd': '300ms' } as CSSProperties}>
            <Link to="/anniversaries">查看纪念日</Link>
            <Link to="/moments">翻阅档案</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function ParallaxImage({ src, alt }: { src: string; alt: string }) {
  const ref = useParallax<HTMLImageElement>(0.09);
  if (!src) return null;
  return <img ref={ref} src={src} alt={alt} loading="lazy" decoding="async" data-reveal-img />;
}
