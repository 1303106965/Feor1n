// 纪念日故事页：杂志式章节排版。

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDateLong } from '../lib/time';
import type { AnniversaryDetailData } from '../lib/types';
import ArticleBody from '../components/ArticleBody';

export default function AnniversaryDetailPage() {
  const { id = '' } = useParams();
  const [data, setData] = useState<AnniversaryDetailData | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const numeric = Number(id);
    if (!Number.isFinite(numeric)) {
      setMissing(true);
      return;
    }
    void api
      .anniversary(numeric)
      .then(setData)
      .catch((err) => {
        if (err instanceof Error && 'status' in err && (err as { status: number }).status === 404) {
          setMissing(true);
        }
      });
  }, [id]);

  if (missing) {
    return (
      <div className="empty-state">
        <span className="ghost-num">404</span>
        <p className="kicker">LOST DATE</p>
        <p className="display-md" style={{ marginTop: 12 }}>
          这个纪念日暂时走丢了。
        </p>
        <Link to="/anniversaries" className="chapter-link" style={{ marginTop: 22 }}>
          回到纪念日
        </Link>
      </div>
    );
  }

  if (!data) return <div className="spinner" />;

  const item = data.item;

  return (
    <article className="article">
      <header className="article-head">
        <p className="kicker" data-reveal="fade">
          {item.kindName}
          {item.repeatYearly ? ' · 每年重逢' : ''}
          {item.isPrivate ? ' · 仅情侣可见' : ''}
        </p>
        <h1 className="display-lg" data-reveal style={{ '--rd': '80ms' } as CSSProperties}>
          {item.title}
        </h1>
        <div className="article-head-meta" data-reveal style={{ '--rd': '160ms' } as CSSProperties}>
          <span>
            {item.calendarName} {formatDateLong(item.originalDate)}
          </span>
          {item.lunarDate ? <span>原农历 {item.lunarDate}</span> : null}
          <span>由 {item.authorName} 记录</span>
        </div>
        <p
          className="meta"
          style={{ marginTop: 14, color: 'var(--accent)', '--rd': '220ms' } as CSSProperties}
          data-reveal
        >
          {item.isToday
            ? '就在今天'
            : item.nextDate === null
              ? '一次被好好收藏的日子'
              : `下一次还有 ${item.daysUntil} 天`}
        </p>
      </header>

      {data.storyHtml ? (
        <ArticleBody html={data.storyHtml} group={`anniversary-${item.id}`} />
      ) : item.note ? (
        <div className="article-body">
          <p>{item.note}</p>
        </div>
      ) : (
        <div className="article-body">
          <p style={{ textAlign: 'center', color: 'var(--muted)' }}>
            这一天的故事，还等着你们慢慢写下来。
          </p>
        </div>
      )}

      <nav className="article-next">
        <div className="article-next-grid">
          <div>
            {data.previous ? (
              <Link to={`/anniversaries/${data.previous.id}`}>
                <span className="meta">← 上一个日子</span>
                <span className="next-title">{data.previous.title}</span>
              </Link>
            ) : null}
          </div>
          <div style={{ textAlign: 'right' }}>
            {data.next ? (
              <Link to={`/anniversaries/${data.next.id}`}>
                <span className="meta">下一个日子 →</span>
                <span className="next-title">{data.next.title}</span>
              </Link>
            ) : null}
          </div>
        </div>
      </nav>

      <p style={{ textAlign: 'center', marginTop: 56 }}>
        <Link to="/anniversaries" className="chapter-link">
          返回纪念日
        </Link>
      </p>
    </article>
  );
}
