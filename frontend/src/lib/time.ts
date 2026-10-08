// 时间工具：相伴计时与日期格式化。

export interface LoveElapsed {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** 解析后端的本地时间字符串（无时区后缀），按本地时区理解 */
export function parseLocal(value: string): Date {
  return new Date(value.replace(' ', 'T'));
}

export function loveElapsed(startedAt: string, now: Date = new Date()): LoveElapsed {
  const start = parseLocal(startedAt).getTime();
  const distance = Math.max(0, now.getTime() - start);
  return {
    days: Math.floor(distance / 86400000),
    hours: Math.floor(distance / 3600000) % 24,
    minutes: Math.floor(distance / 60000) % 60,
    seconds: Math.floor(distance / 1000) % 60,
  };
}

/** 2025-02-14 → 2025.02.14 */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-');
  return `${year}.${month}.${day}`;
}

/** 2025-02-14 → 2025 年 2 月 14 日 */
export function formatDateLong(iso: string): string {
  const date = parseLocal(iso.slice(0, 10));
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

/** 2025-02-14 → 2 月 14 日 */
export function formatMonthDay(iso: string): string {
  const [, month, day] = iso.slice(0, 10).split('-').map(Number);
  return `${month} 月 ${day} 日`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
