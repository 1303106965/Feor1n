// 轻量 fetch 封装：统一 JSON 解析、错误提示与防伪令牌头。

import type {
  AnniversariesData,
  AnniversaryDetailData,
  BootstrapData,
  CalendarData,
  AlbumDetailData,
  AlbumListData,
  HomeData,
  MomentDetailData,
  MomentsPageData,
  TimelineData,
} from './types';

let antiforgeryToken = '';

export function setAntiforgeryToken(token: string) {
  antiforgeryToken = token;
}

export class ApiError extends Error {
  status: number;
  payload: { ok?: boolean; error?: string; [key: string]: unknown };

  constructor(status: number, payload: Record<string, unknown>) {
    super((payload.error as string) || `请求失败（${status}）`);
    this.status = status;
    this.payload = payload as { ok?: boolean; error?: string };
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof URLSearchParams) && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (init?.method && init.method !== 'GET' && antiforgeryToken) {
    headers.set('RequestVerificationToken', antiforgeryToken);
  }

  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' });

  if (response.status === 204) {
    return undefined as T;
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = (await response.json()) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    // 令牌过期：刷新一次防伪令牌后重放一次请求
    if (response.status === 400 && typeof payload.error === 'string' && payload.error.includes('刷新')) {
      const token = await refreshAntiforgery();
      if (token && init) {
        headers.set('RequestVerificationToken', token);
        const retry = await fetch(path, { ...init, headers, credentials: 'same-origin' });
        if (retry.ok) {
          return (await retry.json()) as T;
        }
      }
    }
    throw new ApiError(response.status, payload);
  }

  return payload as T;
}

export async function refreshAntiforgery(): Promise<string | null> {
  try {
    const response = await fetch('/api/antiforgery', { credentials: 'same-origin' });
    const data = (await response.json()) as { token: string };
    setAntiforgeryToken(data.token);
    return data.token;
  } catch {
    return null;
  }
}

export const api = {
  bootstrap: () => request<BootstrapData>('/api/bootstrap'),
  home: () => request<HomeData>('/api/home'),
  moments: (page: number) => request<MomentsPageData>(`/api/moments?page=${page}`),
  moment: (slug: string) => request<MomentDetailData>(`/api/moments/${encodeURIComponent(slug)}`),
  unlockMoment: (slug: string, password: string) =>
    request<{ ok: boolean; error?: string }>(`/api/moments/${encodeURIComponent(slug)}/unlock`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  postComment: (slug: string, body: { author?: string; mail?: string; url?: string; text: string; replyTo?: number }) =>
    request<{ ok: boolean; error?: string; id?: number }>(`/api/moments/${encodeURIComponent(slug)}/comments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  anniversaries: () => request<AnniversariesData>('/api/anniversaries'),
  anniversary: (id: number) => request<AnniversaryDetailData>(`/api/anniversaries/${id}`),
  timeline: (skip: number, take = 10) =>
    request<TimelineData>(`/api/anniversaries/timeline?skip=${skip}&take=${take}`),
  upcoming: (skip: number, take = 10) =>
    request<TimelineData>(`/api/anniversaries/upcoming?skip=${skip}&take=${take}`),
  calendar: (params: { calendar?: 'solar' | 'lunar'; year?: number; month?: number; leap?: boolean }) => {
    const query = new URLSearchParams();
    if (params.calendar) query.set('calendar', params.calendar);
    if (params.year) query.set('year', String(params.year));
    if (params.month) query.set('month', String(params.month));
    if (params.leap) query.set('leap', 'true');
    return request<CalendarData>(`/api/anniversaries/calendar?${query.toString()}`);
  },
  login: (userName: string, password: string, rememberMe: boolean) =>
    request<{ ok: boolean; error?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userName, password, rememberMe }),
    }),
  albums: () => request<AlbumListData>('/api/gallery/albums'),
  album: (id: number) => request<AlbumDetailData>(`/api/gallery/albums/${id}`),
  createAlbum: (body: { title: string; description?: string }) =>
    request<{ ok: boolean; id?: number; error?: string }>('/api/gallery/albums', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateAlbum: (id: number, body: { title: string; description?: string }) =>
    request<{ ok: boolean; error?: string }>(`/api/gallery/albums/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteAlbum: (id: number) =>
    request<{ ok: boolean; error?: string }>(`/api/gallery/albums/${id}`, { method: 'DELETE' }),
  uploadPhoto: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<{ ok: boolean; count?: number; error?: string }>(`/api/gallery/albums/${id}/photos`, {
      method: 'POST',
      body: form,
    });
  },
  deletePhoto: (albumId: number, photoId: number) =>
    request<{ ok: boolean; error?: string }>(`/api/gallery/albums/${albumId}/photos/${photoId}`, {
      method: 'DELETE',
    }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST', body: '{}' }),
};
