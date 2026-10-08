// 全局状态：bootstrap 数据 + 主题模式。
// localStorage 键与后台共用，前台手动切换的配色在 /admin 里同样生效。

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, setAntiforgeryToken } from '../lib/api';
import type { BootstrapData, HeartbeatSummary } from '../lib/types';

type ThemeMode = 'auto' | 'light' | 'dark';

interface BootstrapContextValue {
  data: BootstrapData | null;
  loading: boolean;
  error: string | null;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  setHeartbeat: (summary: HeartbeatSummary) => void;
  refresh: () => void;
}

const BootstrapContext = createContext<BootstrapContextValue | null>(null);

const STORAGE_KEY = 'cc-color-mode';

function systemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.dataset.themeMode = mode;
  root.dataset.theme = mode === 'auto' ? (systemDark() ? 'dark' : 'light') : mode;
}

export function BootstrapProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'auto';
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await api.bootstrap();
      setAntiforgeryToken(payload.antiforgeryToken);
      setData(payload);
      const mode = payload.site.colorMode === 'light' || payload.site.colorMode === 'dark'
        ? payload.site.colorMode
        : 'auto';
      const saved = localStorage.getItem(STORAGE_KEY);
      setThemeModeState(saved === 'light' || saved === 'dark' ? saved : mode);
      document.title = payload.site.title;
    } catch (err) {
      setError(err instanceof Error ? err.message : '站点数据加载失败。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    applyTheme(themeMode);
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (themeMode === 'auto') applyTheme('auto');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [themeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, mode);
    setThemeModeState(mode);
  }, []);

  const setHeartbeat = useCallback((summary: HeartbeatSummary) => {
    setData((prev) => (prev ? { ...prev, heartbeat: { ...prev.heartbeat, summary } } : prev));
  }, []);

  const value = useMemo(
    () => ({ data, loading, error, themeMode, setThemeMode, setHeartbeat, refresh: load }),
    [data, loading, error, themeMode, setThemeMode, setHeartbeat, load],
  );

  return <BootstrapContext.Provider value={value}>{children}</BootstrapContext.Provider>;
}

export function useBootstrap(): BootstrapContextValue {
  const value = useContext(BootstrapContext);
  if (!value) throw new Error('useBootstrap must be used within BootstrapProvider');
  return value;
}
