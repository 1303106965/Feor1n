// 与后端 /api/* 返回结构一一对应的类型定义（camelCase）。

export interface SiteInfo {
  title: string;
  description: string;
  boyName: string;
  girlName: string;
  boySentence: string;
  girlSentence: string;
  homeSentence: string;
  dailyNote: string;
  loveStartedAt: string;
  metStartedAt: string;
  colorMode: 'auto' | 'light' | 'dark';
}

export interface MeInfo {
  isOwner: boolean;
  role: 'boy' | 'girl' | 'guest';
  displayName: string;
}

export interface HeartbeatStats {
  total: number;
  today: number;
  streak: number;
  best: number;
}

export interface HeartbeatSummary {
  role: 'boy' | 'girl' | 'guest';
  today: string;
  dailyLimit: number;
  totals: Record<string, number>;
  self: HeartbeatStats;
  display: HeartbeatStats;
}

export interface BootstrapData {
  site: SiteInfo;
  me: MeInfo;
  antiforgeryToken: string;
  heartbeat: { token: string; summary: HeartbeatSummary };
  counts: { moments: number; anniversaries: number; shop: number };
  features: { affinity: string; cycles: string };
}

export interface MomentCard {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  coverUrl: string;
  coverThumb: string;
  mood: string;
  location: string;
  momentDate: string;
  isLocked: boolean;
  isProtected: boolean;
  authorName: string;
  commentCount: number;
  loveDay: number;
  url: string;
}

export interface HomeData {
  loveLetter: string;
  latestMoments: MomentCard[];
}

export interface MomentsPageData {
  items: MomentCard[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  loveDays: number;
}

export interface CommentNode {
  id: number;
  authorName: string;
  authorUrl: string | null;
  contentHtml: string;
  createdAt: string;
  isOwner: boolean;
  isAuthor: boolean;
  isAtmosphere: boolean;
  avatarUrl: string;
  avatarTone: number;
  replyToId: number | null;
  replyToName: string | null;
  replies: CommentNode[];
}

export interface MomentDetailData {
  detail: {
    id: number;
    title: string;
    slug: string;
    storyHtml: string;
    mood: string;
    location: string;
    momentDate: string;
    isLocked: boolean;
    isProtected: boolean;
    allowComment: boolean;
    authorName: string;
    loveDay: number;
    commentCount: number;
    previous: { title: string; slug: string; url: string } | null;
    next: { title: string; slug: string; url: string } | null;
  };
  comments: {
    totalCount: number;
    requireMail: boolean;
    allowGuestComments: boolean;
    isLoggedIn: boolean;
    displayName: string;
    nodes: CommentNode[];
  };
}

export interface AnniversaryItem {
  id: number;
  title: string;
  note: string;
  noteHtml: string;
  summary: string;
  authorName: string;
  coverUrl: string;
  coverThumb: string;
  kind: string;
  kindName: string;
  kindIcon: string;
  calendarType: 'solar' | 'lunar';
  calendarName: string;
  lunarDate: string;
  originalDate: string;
  nextDate: string | null;
  daysUntil: number | null;
  dayNumber: number;
  repeatYearly: boolean;
  isPrivate: boolean;
  isArchived: boolean;
  isToday: boolean;
  url: string;
}

export interface AnniversariesData {
  today: string;
  privateCount: number;
  items: AnniversaryItem[];
}

export interface TimelineData {
  items: AnniversaryItem[];
  hasMore: boolean;
}

export interface CalendarCell {
  solarDate: string;
  solarYear: number;
  solarMonth: number;
  lunarYear: number;
  lunarMonth: number;
  lunarLeap: boolean;
  primary: string;
  secondary: string;
  solarLabel: string;
  lunarLabel: string;
  weekday: string;
  weekend: boolean;
  outside: boolean;
  isToday: boolean;
  records: Array<{
    id: number;
    title: string;
    url: string;
    kind: string;
    kindName: string;
    kindIcon: string;
    repeatYearly: boolean;
    isPrivate: boolean;
    authorName: string;
    calendarName: string;
  }>;
}

export interface CalendarData {
  calendar: 'solar' | 'lunar';
  year: number;
  month: number;
  leap: boolean;
  monthKey: string;
  minimumYear: number;
  maximumYear: number;
  rows: number;
  months: Array<{ value: string; label: string }>;
  previous: { year: number; month: number; leap: boolean };
  next: { year: number; month: number; leap: boolean };
  cells: CalendarCell[];
}

export interface AnniversaryDetailData {
  item: AnniversaryItem;
  storyHtml: string;
  previous: { id: number; title: string; url: string } | null;
  next: { id: number; title: string; url: string } | null;
}

export interface GalleryPhoto {
  src: string;
  thumb: string;
  caption: string | null;
  momentId: number;
  momentSlug: string;
  momentTitle: string;
  momentDate: string;
  url: string;
}

export interface GalleryData {
  total: number;
  photos: GalleryPhoto[];
}
