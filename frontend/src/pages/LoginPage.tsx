// 登录：克制的画廊式框架，无图标无装饰。

import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useBootstrap } from '../context/BootstrapContext';

export default function LoginPage() {
  const { data, refresh } = useBootstrap();
  const [searchParams] = useSearchParams();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const returnUrl = searchParams.get('ReturnUrl') ?? '/admin';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userName || !password) return;
    setBusy(true);
    setError('');
    try {
      const result = await api.login(userName, password, rememberMe);
      if (result.ok) {
        await refresh();
        // 目标是站内地址才跳转，挡掉开放重定向
        const target = returnUrl.startsWith('/') && !returnUrl.startsWith('//') ? returnUrl : '/admin';
        window.location.href = target;
      } else {
        setError(result.error ?? '登录失败。');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络开了个小差。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-frame">
        <span className="wordmark">{data?.site.title ?? 'Feor1n'}</span>
        <span className="kicker">PRIVATE ACCESS</span>
        <h1 style={{ marginTop: 12 }}>回到我们的故事</h1>
        <p className="auth-hint">一个只属于两个人的地方</p>

        {error ? <div className="error-banner">{error}</div> : null}

        <form onSubmit={submit}>
          <label className="auth-field">
            <span>登录名</span>
            <input
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              autoComplete="username"
              maxLength={32}
              autoFocus
              required
            />
          </label>
          <label className="auth-field">
            <span>口令</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="auth-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            三十天内不用再登录
          </label>
          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? '登录中' : '进入后台'}
          </button>
        </form>

        <Link to="/" className="auth-back">
          ← 回到首页
        </Link>
      </div>
    </div>
  );
}
