import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="empty-state">
      <span className="ghost-num">404</span>
      <p className="kicker">LOST REEL</p>
      <p className="display-md" style={{ marginTop: 12 }}>
        这一页暂时走丢了。
      </p>
      <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
        可能被移动过，也可能从来不曾存在。
      </p>
      <Link to="/" className="chapter-link" style={{ marginTop: 22 }}>
        回到片头
      </Link>
    </div>
  );
}
