import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="empty-state">
      <span className="ghost-num">404</span>
      <p className="kicker">LOST REEL</p>
      <p className="display-md" style={{ marginTop: 12 }}>
        这一页似乎迷了路。
      </p>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
        它或许被移走了，或许从未真正存在。
      </p>
      <Link to="/" className="chapter-link" style={{ marginTop: 22 }}>
        回到序章
      </Link>
    </div>
  );
}
