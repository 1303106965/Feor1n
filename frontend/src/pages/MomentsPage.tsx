// 点滴档案：编辑式索引。发丝线分隔的条目列表，悬停浮现封面。

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useBootstrap } from '../context/BootstrapContext';
import { formatDate } from '../lib/time';
import type { MomentsPageData } from '../lib/types';

export default function MomentsPage() {
  const { data } = useBootstrap();
  const [pageData, setPageData] = useState<MomentsPageData | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (page: number, append: boolean) => {
    setLoadingMore(true);
    try {
      const next = await api.moments(page);
      setPageData((prev) => (append && prev ? { ...next, items: [...prev.items, ...next.items] } : next));
    } catch {
      setError('加载失败，稍后再试试。');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    void load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data || !pageData) {
    return <div className="spinner" />;
  }

  const startYear = data.site.loveStartedAt.slice(0, 4);

  return (
    <>
      <header className="page-head">
        <p className="kicker" data-reveal="fade">
          THE ARCHIVE
        </p>
        <h1 className="display-lg" data-reveal style={{ '--rd': '80ms' } as CSSProperties}>
          点滴
        </h1>
        <div className="page-head-sub" data-reveal style={{ '--rd': '160ms' } as CSSProperties}>
          <span>{pageData.totalCount} 个瞬间</span>
          <span>相伴第 {pageData.loveDays} 天</span>
          <span>始于 {startYear}</span>
        </div>
      </header>

      {error ? <div className="error-banner" style={{ margin: '0 var(--gutter)' }}>{error}</div> : null}

      <div className="archive-list">
        {pageData.items.map((item, index) => (
          <Link
            key={item.id}
            to={`/moments/${item.slug}`}
            className="archive-row"
            data-reveal="fade"
            style={{ '--rd': `${Math.min(index, 8) * 50}ms` } as CSSProperties}
          >
            <span className="archive-index">{String(index + 1).padStart(2, '0')}</span>
            <span>
              <span className="archive-title">{item.title}</span>
              <span className="archive-date" style={{ display: 'block', marginTop: 4 }}>
                {formatDate(item.momentDate)}
                {item.loveDay > 0 ? ` · 第 ${item.loveDay} 天` : ''}
                {item.isLocked ? ' · 上锁' : ''}
              </span>
            </span>
            <span className="archive-location">{item.location || item.mood || '—'}</span>
            {item.coverThumb ? (
              <span className="archive-thumb">
                <img src={item.coverThumb} alt="" loading="lazy" decoding="async" />
              </span>
            ) : null}
          </Link>
        ))}

        {pageData.totalCount === 0 ? (
          <div className="empty-state">
            <p className="kicker">EMPTY REEL</p>
            <p className="display-md" style={{ marginTop: 12 }}>
              胶卷尚未感光。
            </p>
            <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
              写下第一页故事，这里便会慢慢长出时间的纹理。
            </p>
          </div>
        ) : null}

        {pageData.hasNext ? (
          <div className="archive-more">
            <button
              type="button"
              className="auth-submit"
              style={{ width: 'auto', padding: '12px 34px', background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)' }}
              disabled={loadingMore}
              onClick={() => void load(pageData.page + 1, true)}
            >
              {loadingMore ? '载入中' : '继续翻阅'}
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
