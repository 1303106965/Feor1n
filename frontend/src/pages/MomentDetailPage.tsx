// 点滴详情：杂志文章排版。首图主导、正文收窄、首字下沉、克制留言。

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useBootstrap } from '../context/BootstrapContext';
import { formatDate, formatDateTime } from '../lib/time';
import type { CommentNode, MomentDetailData } from '../lib/types';
import ArticleBody from '../components/ArticleBody';

export default function MomentDetailPage() {
  const { slug = '' } = useParams();
  const { data } = useBootstrap();
  const [detail, setDetail] = useState<MomentDetailData | null>(null);
  const [missing, setMissing] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const load = useCallback(async () => {
    try {
      const payload = await api.moment(slug);
      setDetail(payload);
      setMissing(false);
    } catch (err) {
      if (err instanceof Error && 'status' in err && (err as { status: number }).status === 404) {
        setMissing(true);
      }
    }
  }, [slug]);

  useEffect(() => {
    setDetail(null);
    setUnlockError('');
    void load();
  }, [load]);

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!unlockPassword) return;
    setUnlocking(true);
    setUnlockError('');
    try {
      const result = await api.unlockMoment(slug, unlockPassword);
      if (result.ok) {
        await load();
      } else {
        setUnlockError(result.error ?? '密语似乎不对。');
      }
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : '此刻风有些大，稍后再试。');
    } finally {
      setUnlocking(false);
    }
  };

  if (missing) {
    return (
      <div className="empty-state">
        <span className="ghost-num">404</span>
        <p className="kicker">LOST REEL</p>
        <p className="display-md" style={{ marginTop: 12 }}>
          这一章散落在风里了。
        </p>
        <Link to="/moments" className="chapter-link" style={{ marginTop: 22 }}>
          回到档案
        </Link>
      </div>
    );
  }

  if (!data || !detail) {
    return <div className="spinner" />;
  }

  const item = detail.detail;

  if (item.isLocked) {
    return (
      <div className="auth-wrap">
        <div className="auth-frame">
          <p className="kicker" style={{ textAlign: 'center' }}>
            PRIVATE CHAPTER
          </p>
          <h1 style={{ marginTop: 10 }}>这是一段被珍藏的回忆</h1>
          <p className="auth-hint" style={{ marginTop: 10 }}>
            输入密语，才能推开这扇门。
          </p>
          {unlockError ? <div className="error-banner">{unlockError}</div> : null}
          <form onSubmit={unlock}>
            <label className="auth-field">
              <span>访问密语</span>
              <input
                type="password"
                value={unlockPassword}
                onChange={(event) => setUnlockPassword(event.target.value)}
                autoFocus
              />
            </label>
            <button type="submit" className="auth-submit" disabled={unlocking}>
              {unlocking ? '正在开启' : '开启这段回忆'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <article className="article">
      <header className="article-head">
        <p className="kicker" data-reveal="fade">
          {formatDate(item.momentDate)}
          {item.loveDay > 0 ? ` · 第 ${item.loveDay} 天` : ''}
        </p>
        <h1 className="display-lg" data-reveal style={{ '--rd': '80ms' } as CSSProperties}>
          {item.title}
        </h1>
        <div className="article-head-meta" data-reveal style={{ '--rd': '160ms' } as CSSProperties}>
          {item.mood ? <span>{item.mood}</span> : null}
          {item.location ? <span>{item.location}</span> : null}
          <span>由 {item.authorName} 写就</span>
        </div>
      </header>

      {item.storyHtml ? (
        <ArticleBody html={item.storyHtml} group={`moment-${item.slug}`} />
      ) : null}

      <nav className="article-next">
        <div className="article-next-grid">
          <div>
            {item.previous ? (
              <Link to={`/moments/${item.previous.slug}`}>
                <span className="meta">← 上一章</span>
                <span className="next-title">{item.previous.title}</span>
              </Link>
            ) : null}
          </div>
          <div style={{ textAlign: 'right' }}>
            {item.next ? (
              <Link to={`/moments/${item.next.slug}`}>
                <span className="meta">下一章 →</span>
                <span className="next-title">{item.next.title}</span>
              </Link>
            ) : null}
          </div>
        </div>
      </nav>

      <Comments detail={detail} slug={item.slug} onChanged={() => void load()} />
    </article>
  );
}

function Comments({
  detail,
  slug,
  onChanged,
}: {
  detail: MomentDetailData;
  slug: string;
  onChanged: () => void;
}) {
  const meta = detail.comments;
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const [mail, setMail] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!text.trim()) {
      setError('留一句话再走吧。');
      return;
    }
    setSending(true);
    setError('');
    try {
      const result = await api.postComment(slug, {
        author: meta.isLoggedIn ? undefined : author.trim(),
        mail: meta.isLoggedIn ? undefined : mail.trim(),
        text: text.trim(),
        replyTo: replyTo ?? undefined,
      });
      if (result.ok) {
        setText('');
        setReplyTo(null);
        onChanged();
      } else {
        setError(result.error ?? '这段话没有送达。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '此刻风有些大，稍后再试。');
    } finally {
      setSending(false);
    }
  };

  if (!meta.allowGuestComments && !meta.isLoggedIn) {
    return null;
  }

  return (
    <section className="comments-wrap">
      <div className="comments-head">
        <h2>留言</h2>
        <span className="meta">{meta.totalCount} NOTES</span>
      </div>

      {meta.nodes.map((node) => (
        <CommentTree key={node.id} node={node} onReply={() => setReplyTo(node.id)} replyTarget={replyTo} />
      ))}

      {error ? <div className="error-banner" style={{ marginTop: 16 }}>{error}</div> : null}

      <form onSubmit={submit} style={{ marginTop: 28 }}>
        {replyTo !== null ? (
          <p className="meta" style={{ color: 'var(--accent)', marginBottom: 12 }}>
            正在回复 #{replyTo}
            <button
              type="button"
              style={{ marginLeft: 12, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              onClick={() => setReplyTo(null)}
            >
              [取消]
            </button>
          </p>
        ) : null}
        {!meta.isLoggedIn ? (
          <>
            <label className="auth-field">
              <span>称呼</span>
              <input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder="如何称呼你" maxLength={60} />
            </label>
            {meta.requireMail ? (
              <label className="auth-field">
                <span>邮箱</span>
              <input type="email" value={mail} onChange={(event) => setMail(event.target.value)} placeholder="只留给我们" maxLength={320} />
              </label>
            ) : null}
          </>
        ) : (
          <p className="meta" style={{ marginBottom: 12 }}>
            以 {meta.displayName} 的身份留言
          </p>
        )}
        <label className="auth-field">
          <span>写下想对彼此说的话</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            maxLength={2000}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid var(--line)',
              padding: '10px 0',
              fontSize: 15,
              color: 'var(--ink)',
              outline: 'none',
              borderRadius: 0,
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </label>
        <button type="submit" className="auth-submit" style={{ width: 'auto', padding: '12px 34px' }} disabled={sending}>
          {sending ? '正在送出' : '留下这段话'}
        </button>
      </form>
    </section>
  );
}

function CommentTree({
  node,
  onReply,
  replyTarget,
}: {
  node: CommentNode;
  onReply: () => void;
  replyTarget: number | null;
}) {
  return (
    <div className="comment-item">
      <div className="comment-meta">
        <span className="comment-author">{node.authorName}</span>
        {node.isOwner ? <span className="comment-role">Owner</span> : null}
        {node.isAuthor ? <span className="comment-role">Author</span> : null}
        <span className="comment-time">{formatDateTime(node.createdAt)}</span>
      </div>
      {node.replyToName ? (
        <p className="meta" style={{ marginTop: 4, color: 'var(--faint)' }}>
          回复 @{node.replyToName}
        </p>
      ) : null}
      <div className="comment-body" dangerouslySetInnerHTML={{ __html: node.contentHtml }} />
      <button
        type="button"
        className="comment-reply-btn"
        onClick={onReply}
        style={replyTarget === node.id ? { color: 'var(--accent)' } : undefined}
      >
        Reply
      </button>
      {node.replies.length > 0 ? (
        <div className="comment-replies">
          {node.replies.map((reply) => (
            <CommentTree key={reply.id} node={reply} onReply={onReply} replyTarget={replyTarget} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
