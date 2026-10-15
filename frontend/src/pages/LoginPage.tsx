// 登录：克制的画廊式框架，无图标无装饰。

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useBootstrap } from '../context/BootstrapContext';

export default function LoginPage() {
  const { data, refresh } = useBootstrap();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const returnUrl = searchParams.get('ReturnUrl') ?? '/admin';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.login('boy', password, true);
      if (result.ok) {
        await refresh();
        // 目标是站内地址才跳转，挡掉开放重定向
        const target = returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/admin';
        window.location.href = target;
      } else {
        setError(result.error ?? '推门失败，再试一次。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '此刻风有些大，稍后再试。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-frame">
        <span className="wordmark">{data?.site.title ?? 'Feor1n'}</span>
        <span className="kicker">PRIVATE ACCESS</span>
        <h1 style={{ marginTop: 12 }}>管理入口</h1>
        <p className="auth-hint">输入口令后进入</p>

        {error ? <div className="error-banner">{error}</div> : null}

        <form onSubmit={submit}>
          <label className="auth-field">
            <span>口令</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? '正在验证' : '进入管理页'}
          </button>
        </form>

        <Link to="/" className="auth-back">
          ← 回到首页
        </Link>
      </div>
    </div>
  );
}
