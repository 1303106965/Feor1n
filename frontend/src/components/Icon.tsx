// 站点图标集：与后台 Lucide 图标名保持一致，按需引入。

import {
  ArrowLeft,
  CalendarDays,
  CalendarHeart,
  Camera,
  ChevronLeft,
  ChevronRight,
  Gift,
  History,
  House,
  LayoutDashboard,
  Lock,
  Mail,
  MapPin,
  MessageCircleHeart,
  MoonStar,
  Sparkles,
  Store,
  Sun,
  SunMoon,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  'arrow-left': ArrowLeft,
  'calendar-days': CalendarDays,
  'calendar-heart': CalendarHeart,
  camera: Camera,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  gift: Gift,
  history: History,
  house: House,
  'layout-dashboard': LayoutDashboard,
  lock: Lock,
  mail: Mail,
  'map-pin': MapPin,
  'message-circle-heart': MessageCircleHeart,
  'moon-star': MoonStar,
  sparkles: Sparkles,
  store: Store,
  sun: Sun,
  'sun-moon': SunMoon,
  'user-round': UserRound,
  'users-round': UsersRound,
  x: X,
};

interface IconProps {
  name: string;
  className?: string;
}

export default function Icon({ name, className }: IconProps) {
  const Component = icons[name];
  return Component ? <Component className={className} aria-hidden="true" /> : null;
}
