import { format, startOfWeek, addDays, parseISO, isToday, isBefore, isAfter, differenceInMinutes } from 'date-fns';

export function getWeekStart(date?: string): string {
  const d = date ? parseISO(date) : new Date();
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function getWeekDates(fromDate?: string): string[] {
  const start = fromDate ? parseISO(fromDate) : startOfWeek(new Date(), { weekStartsOn: 1 });
  const monday = startOfWeek(start, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), 'yyyy-MM-dd'));
}

export function formatDate(date: string): string {
  return format(parseISO(date), 'MMM d, yyyy');
}

export function formatDateShort(date: string): string {
  return format(parseISO(date), 'MMM d');
}

export function formatDayName(date: string): string {
  return format(parseISO(date), 'EEE');
}

export function formatDayNumber(date: string): string {
  return format(parseISO(date), 'd');
}

export function isDateToday(date: string): boolean {
  return isToday(parseISO(date));
}

export function isDateBefore(date: string, ref: string): boolean {
  return isBefore(parseISO(date), parseISO(ref));
}

export function isDateAfter(date: string, ref: string): boolean {
  return isAfter(parseISO(date), parseISO(ref));
}

export function getToday(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function getCurrentTime(): string {
  return format(new Date(), 'HH:mm');
}

export function minutesBetweenTimes(start: string, end: string): number {
  const today = format(new Date(), 'yyyy-MM-dd');
  return differenceInMinutes(
    parseISO(`${today}T${end}`),
    parseISO(`${today}T${start}`)
  );
}

export function getMonthDates(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1);
  const startDow = firstDay.getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Pad start with nulls for alignment (week starts Monday)
  const mondayOffset = (startDow + 6) % 7;
  const cells: (string | null)[] = Array(mondayOffset).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(format(new Date(year, month, d), 'yyyy-MM-dd'));
  }

  // Pad end to fill the last week
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}
