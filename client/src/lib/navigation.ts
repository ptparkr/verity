export interface NavigationItem {
  to: string;
  label: string;
  hint: string;
  shortcut: string;
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { to: '/', label: 'Dashboard', hint: 'Command center and daily pulse', shortcut: 'D' },
  { to: '/habits', label: 'Habits', hint: 'Check-ins, streaks, and areas', shortcut: 'H' },
  { to: '/pomodoro', label: 'Pomodoro', hint: 'Focus timer and session quality', shortcut: 'P' },
  { to: '/health', label: 'Health', hint: 'Check-ins, trends, and longevity', shortcut: 'E' },
  { to: '/analytics', label: 'Analytics', hint: 'Correlations and deep insights', shortcut: 'A' },
  { to: '/settings', label: 'Settings', hint: 'Preferences and defaults', shortcut: 'S' },
];

export const ROUTE_TITLE_MAP = NAVIGATION_ITEMS.reduce<Record<string, string>>((map, item) => {
  map[item.to] = item.label;
  return map;
}, {});
