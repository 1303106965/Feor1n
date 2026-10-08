// 全站外壳：极简导航（透明 → 滚动浮现）、阅读进度线、黑色页脚。
// 导航与页脚保持「画廊式」克制，仅文字与发丝线。

import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Sun, MoonStar, SunMoon } from 'lucide-react';
import { useBootstrap } from '../context/BootstrapContext';
import { RevealRunner, useSmoothScroll, scrollToTop } from '../lib/motion';

const navItems = [
  { to: '/', label: '首页', end: true },
  { to: '/moments', label: '点滴', end: false },
  { to: '/anniversaries', label: '纪念日', end: false },
];

export default function Layout() {
  const { data, themeMode, setThemeMode } = useBootstrap();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useSmoothScroll();

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  // 导航浮现 + 阅读进度线
  useEffect(() => {
    const progress = document.querySelector<HTMLElement>('.progress-line');
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      progress?.style.setProperty('transform', `scaleX(${ratio})`);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [location.pathname]);

  useEffect(() => {
    scrollToTop();
  }, [location.pathname]);

  if (!data) {
    return null;
  }

  const site = data.site;
  const isDark = themeMode === 'dark' || (themeMode === 'auto' && systemDark);
  const cycleTheme = () => {
    const order: Array<'auto' | 'light' | 'dark'> = ['auto', 'light', 'dark'];
    setThemeMode(order[(order.indexOf(themeMode) + 1) % order.length]);
  };
  const ThemeIcon = themeMode === 'auto' ? SunMoon : isDark ? Sun : MoonStar;

  return (
    <div className="app-shell">
      <div className="progress-line" aria-hidden="true" />

      <header className={`top-nav${scrolled ? ' is-scrolled' : ''}`}>
        <div className="top-nav-inner">
          <Link to="/" className="wordmark" aria-label="回到首页">
            {site.title}
          </Link>
          <nav className="top-nav-links" aria-label="站内导航">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="top-nav-actions">
            <button
              type="button"
              className="nav-icon-btn"
              aria-label="切换配色"
              title="切换配色"
              onClick={cycleTheme}
            >
              <ThemeIcon />
            </button>
            <a className="nav-admin-link" href="/admin">
              管理
            </a>
          </div>
        </div>
      </header>

      <main className="app-main" id="main">
        <div className="page-enter" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-wordmark">{site.title}</div>
          <div className="footer-grid">
            <div className="footer-col">
              <p className="meta">About</p>
              <p className="footer-note">
                {site.description}。{site.homeSentence}
              </p>
            </div>
            <div className="footer-col">
              <p className="meta">Browse</p>
              <Link to="/moments">点滴档案</Link>
              <Link to="/anniversaries">纪念日</Link>
              <Link to="/admin">管理后台</Link>
            </div>
            <div className="footer-col">
              <p className="meta">More</p>
              <a href="/affinity">心有灵犀</a>
              <a href="/cycles">花信如期</a>
              <a href="/shop">心意商城</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} {site.title}</span>
            <span>{site.description}</span>
            <span>A PRIVATE FILM · MADE FOR TWO</span>
          </div>
        </div>
      </footer>

      <nav className="bottom-tabs" aria-label="底部导航">
        {navItems.map((item) => {
          const active = item.end ? location.pathname === item.to : location.pathname.startsWith(item.to);
          return (
            <Link key={item.to} to={item.to} className={`bottom-tab${active ? ' active' : ''}`}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <RevealRunner deps={[location.pathname]} />
    </div>
  );
}
