// 纪念日：编辑式时间轴 + 倒计时 + 极简月历。

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate } from '../lib/time';
import type { AnniversaryItem, CalendarData, TimelineData } from '../lib/types';

type TabKey = 'timeline' | 'upcoming' | 'calendar';

export default function AnniversariesPage() {
  const [items, setItems] = useState<AnniversaryItem[] | null>(null);
  const [privateCount, setPrivateCount] = useState(0);
  const [tab, setTab] = useState<TabKey>('timeline');

  useEffect(() => {
    void api
      .anniversaries()
      .then((data) => {
        setItems(data.items);
        setPrivateCount(data.privateCount);
      })
      .catch(() => setItems([]));
  }, []);

  const stats = useMemo(() => {
    const all = items ?? [];
    const yearly = all.filter((item) => item.repeatYearly && !item.isArchived);
    const next = yearly.reduce<AnniversaryItem | null>(
      (acc, item) => (item.daysUntil !== null && (!acc || (acc.daysUntil ?? 0) > (item.daysUntil ?? 0)) ? item : acc),
      null,
    );
    return { total: all.length, privateCount, yearly: yearly.length, next };
  }, [items, privateCount]);

  return (
    <>
      <header className="page-head">
        <p className="kicker" data-reveal="fade">
          THE CALENDAR OF US
        </p>
        <h1 className="display-lg" data-reveal style={{ '--rd': '80ms' } as CSSProperties}>
          纪念日
        </h1>
        <p className="page-head-sub" data-reveal style={{ '--rd': '160ms' } as CSSProperties}>
          <span>重要的日期，值得被重新看见。</span>
        </p>
      </header>

      <div className="anniv-stats">
        <div className="anniv-stat" data-reveal="fade">
          <p className="meta">珍藏过的日子</p>
          <div className="stat-value">{stats.total}</div>
          <div className="stat-extra">段被记住的光阴</div>
        </div>
        <div className="anniv-stat" data-reveal="fade" style={{ '--rd': '80ms' } as CSSProperties}>
          <p className="meta">只属于彼此</p>
          <div className="stat-value">{stats.privateCount}</div>
          <div className="stat-extra">个悄然收藏的日子</div>
        </div>
        <div className="anniv-stat" data-reveal="fade" style={{ '--rd': '160ms' } as CSSProperties}>
          <p className="meta">下一次重逢</p>
          <div className="stat-value">
            {stats.next ? formatDate(stats.next.nextDate ?? stats.next.originalDate).slice(5) : '—'}
          </div>
          <div className="stat-extra">{stats.next ? `距此还有 ${stats.next.daysUntil} 天` : '尚未写下'}</div>
        </div>
        <div className="anniv-stat" data-reveal="fade" style={{ '--rd': '240ms' } as CSSProperties}>
          <p className="meta">岁岁相见</p>
          <div className="stat-value">{stats.yearly}</div>
          <div className="stat-extra">个每年都会重逢的日子</div>
        </div>
      </div>

      <div className="tabs-underline" role="tablist" aria-label="纪念日视图">
        {(
          [
            ['timeline', '时间轴'],
            ['upcoming', '即将到来'],
            ['calendar', '月历'],
          ] as Array<[TabKey, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`tab-underline${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="anniv-panel" style={{ paddingTop: 30 }}>
        {tab === 'timeline' ? <TimelinePanel /> : null}
        {tab === 'upcoming' ? <UpcomingPanel /> : null}
        {tab === 'calendar' ? <CalendarPanel /> : null}
      </div>
    </>
  );
}

function TimelinePanel() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (skip: number, append: boolean) => {
    setLoading(true);
    try {
      const payload = await api.timeline(skip);
      setData((prev) => (append && prev ? { ...payload, items: [...prev.items, ...payload.items] } : payload));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0, false);
  }, [load]);

  if (!data) return <div className="spinner" />;

  if (data.items.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: 260 }}>
        <p className="kicker">EMPTY CALENDAR</p>
        <p style={{ marginTop: 12, color: 'var(--muted)', fontSize: 13 }}>
          还没有记下要等的日子，去添加一个吧。
        </p>
      </div>
    );
  }

  return (
    <div className="timeline-v">
      {data.items.map((item) => (
        <div key={item.id} className="timeline-entry">
          <Link to={`/anniversaries/${item.id}`}>
            <span className="entry-year">{item.originalDate.slice(0, 4)}</span>
            <span className="entry-title" style={{ display: 'block' }}>
              {item.title}
            </span>
          </Link>
          <div className="entry-meta">
            <span>{item.kindName}</span>
            <span>
              {item.calendarName} {formatDate(item.originalDate)}
            </span>
            {item.lunarDate ? <span>农历 {item.lunarDate}</span> : null}
            {item.repeatYearly ? <span>每年提醒</span> : null}
            {item.isPrivate ? <span>仅情侣可见</span> : null}
            <span>由 {item.authorName} 记录</span>
          </div>
          <span className="entry-days">DAY {item.dayNumber}</span>
        </div>
      ))}
      {data.hasMore ? (
        <div className="archive-more">
          <button
            type="button"
            className="auth-submit"
            style={{ width: 'auto', padding: '12px 34px', background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)' }}
            disabled={loading}
            onClick={() => void load(data.items.length, true)}
          >
            {loading ? '载入中' : '继续翻阅'}
          </button>
        </div>
      ) : (
        <p className="meta" style={{ textAlign: 'center', padding: '20px 0 40px' }}>
          全部回忆已显示
        </p>
      )}
    </div>
  );
}

function UpcomingPanel() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (skip: number, append: boolean) => {
    setLoading(true);
    try {
      const payload = await api.upcoming(skip);
      setData((prev) => (append && prev ? { ...payload, items: [...prev.items, ...payload.items] } : payload));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(0, false);
  }, [load]);

  if (!data) return <div className="spinner" />;

  if (data.items.length === 0) {
    return (
      <div className="empty-state" style={{ minHeight: 260 }}>
        <p className="kicker">NOTHING AHEAD</p>
        <p style={{ marginTop: 12, color: 'var(--muted)', fontSize: 13 }}>
          还没有每年重复的纪念日。
        </p>
      </div>
    );
  }

  return (
    <div>
      {data.items.map((item) => (
        <Link key={item.id} to={`/anniversaries/${item.id}`} className="archive-row">
          <span className="archive-index">{String(item.daysUntil).padStart(2, '0')}</span>
          <span>
            <span className="archive-title">{item.title}</span>
            <span className="archive-date" style={{ display: 'block', marginTop: 4 }}>
              {item.kindName} · 下一次 {formatDate(item.nextDate ?? item.originalDate)}
            </span>
          </span>
          <span className="archive-location">
            还有 <strong style={{ fontFamily: 'var(--font-display)', fontWeight: 400, fontSize: 20, color: 'var(--accent)' }}>{item.daysUntil}</strong> 天
          </span>
        </Link>
      ))}
      {data.hasMore ? (
        <div className="archive-more">
          <button
            type="button"
            className="auth-submit"
            style={{ width: 'auto', padding: '12px 34px', background: 'transparent', color: 'var(--ink)', border: '1px solid var(--line)' }}
            disabled={loading}
            onClick={() => void load(data.items.length, true)}
          >
            {loading ? '载入中' : '继续翻阅'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CalendarPanel() {
  const [data, setData] = useState<CalendarData | null>(null);
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar');
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    void api.calendar({ calendar }).then((payload) => {
      setData(payload);
      setYear(payload.year);
      setMonth(payload.month);
    });
  }, [calendar]);

  const go = (target: { year: number; month: number; leap: boolean }) => {
    void api.calendar({ calendar, year: target.year, month: target.month, leap: target.leap }).then((payload) => {
      setData(payload);
      setYear(payload.year);
      setMonth(payload.month);
    });
  };

  if (!data || year === null || month === null) return <div className="spinner" />;

  const selectedCell = data.cells.find((cell) => cell.solarDate === selected) ?? null;
  const monthOptions = data.months.filter((option) => option.value === String(month) || option.value === `${month}-leap`);
  const isLeapMonth = monthOptions.length > 0 && monthOptions[0].value.endsWith('-leap');

  return (
    <div>
      <div className="calendar-toolbar">
        <div className="calendar-toggles">
          <button
            type="button"
            className={`tab-underline${calendar === 'solar' ? ' active' : ''}`}
            aria-pressed={calendar === 'solar'}
            onClick={() => setCalendar('solar')}
          >
            公历
          </button>
          <button
            type="button"
            className={`tab-underline${calendar === 'lunar' ? ' active' : ''}`}
            aria-pressed={calendar === 'lunar'}
            onClick={() => setCalendar('lunar')}
          >
            农历
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button type="button" className="nav-icon-btn" aria-label="上一个月" onClick={() => go(data.previous)}>
            <ChevronLeft />
          </button>
          <span className="calendar-title">
            {year} 年 {isLeapMonth ? monthOptions[0].label : `${month} 月`}
          </span>
          <button type="button" className="nav-icon-btn" aria-label="下一个月" onClick={() => go(data.next)}>
            <ChevronRight />
          </button>
        </div>
      </div>

      <div className="calendar-selects" style={{ marginBottom: 16 }}>
        <select
          value={year}
          onChange={(event) => {
            const next = Number(event.target.value);
            void api.calendar({ calendar, year: next, month, leap: isLeapMonth }).then((payload) => {
              setData(payload);
              setYear(payload.year);
              setMonth(payload.month);
            });
          }}
        >
          {Array.from({ length: data.maximumYear - data.minimumYear + 1 }, (_, index) => data.minimumYear + index)
            .reverse()
            .map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
        </select>
        {calendar === 'lunar' ? (
          <select
            value={data.monthKey}
            onChange={(event) => {
              const [nextMonth, leapPart] = event.target.value.split('-');
              void api.calendar({ calendar, year, month: Number(nextMonth), leap: leapPart === 'leap' }).then((payload) => {
                setData(payload);
                setYear(payload.year);
                setMonth(payload.month);
              });
            }}
          >
            {data.months.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="calendar-grid">
        {['一', '二', '三', '四', '五', '六', '日'].map((weekday) => (
          <span key={weekday} className="calendar-weekday">
            {weekday}
          </span>
        ))}
        {data.cells.map((cell) => (
          <button
            key={cell.solarDate}
            type="button"
            className={`calendar-cell${cell.outside ? ' outside' : ''}${cell.isToday ? ' is-today' : ''}`}
            onClick={() => setSelected(selected === cell.solarDate ? null : cell.solarDate)}
          >
            <span className="cell-day">{cell.primary}</span>
            <span className="cell-secondary">{cell.secondary}</span>
            {cell.records.length > 0 ? <span className="cell-mark">{cell.records[0].title}</span> : null}
          </button>
        ))}
      </div>

      {selectedCell ? (
        <div className="calendar-day-panel">
          <h4>
            {selectedCell.solarLabel} · {selectedCell.lunarLabel}
          </h4>
          {selectedCell.records.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--muted)' }}>
              这一天还很安静，留待以后写进故事。
            </p>
          ) : (
            selectedCell.records.map((record) => (
              <Link key={record.id} to={`/anniversaries/${record.id}`}>
                <span>{record.title}</span>
                <span className="meta">{record.kindName}</span>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
