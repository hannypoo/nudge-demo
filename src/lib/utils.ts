export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatTimeOfDay(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function getToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDayOfWeek(): number {
  return new Date().getDay();
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWeekDates(fromDate?: string): string[] {
  const base = fromDate ? new Date(fromDate + 'T00:00:00') : new Date();
  const day = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Category color mappings to Tailwind classes
const COLOR_MAP: Record<string, { bg: string; text: string; border: string; ring: string; bgLight: string }> = {
  rose:    { bg: 'bg-rose-500',    text: 'text-rose-400',    border: 'border-rose-500',    ring: 'ring-rose-500/30',    bgLight: 'bg-rose-500/20' },
  blue:    { bg: 'bg-blue-500',    text: 'text-blue-400',    border: 'border-blue-500',    ring: 'ring-blue-500/30',    bgLight: 'bg-blue-500/20' },
  purple:  { bg: 'bg-purple-500',  text: 'text-purple-400',  border: 'border-purple-500',  ring: 'ring-purple-500/30',  bgLight: 'bg-purple-500/20' },
  teal:    { bg: 'bg-teal-500',    text: 'text-teal-400',    border: 'border-teal-500',    ring: 'ring-teal-500/30',    bgLight: 'bg-teal-500/20' },
  orange:  { bg: 'bg-orange-500',  text: 'text-orange-400',  border: 'border-orange-500',  ring: 'ring-orange-500/30',  bgLight: 'bg-orange-500/20' },
  amber:   { bg: 'bg-amber-500',   text: 'text-amber-400',   border: 'border-amber-500',   ring: 'ring-amber-500/30',   bgLight: 'bg-amber-500/20' },
  cyan:    { bg: 'bg-cyan-500',    text: 'text-cyan-400',    border: 'border-cyan-500',    ring: 'ring-cyan-500/30',    bgLight: 'bg-cyan-500/20' },
  violet:  { bg: 'bg-violet-500',  text: 'text-violet-400',  border: 'border-violet-500',  ring: 'ring-violet-500/30',  bgLight: 'bg-violet-500/20' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-400', border: 'border-emerald-500', ring: 'ring-emerald-500/30', bgLight: 'bg-emerald-500/20' },
  gray:    { bg: 'bg-gray-500',    text: 'text-gray-400',    border: 'border-gray-500',    ring: 'ring-gray-500/30',    bgLight: 'bg-gray-500/20' },
};

export function getCategoryColors(color: string) {
  return COLOR_MAP[color] || COLOR_MAP.gray;
}
