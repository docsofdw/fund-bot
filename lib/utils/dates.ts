// Date and timezone utilities

import { format, formatInTimeZone } from 'date-fns-tz';

const ET_TIMEZONE = 'America/New_York';

export function formatDateET(date: Date, formatStr: string = 'EEEE, MMMM d, yyyy'): string {
  return formatInTimeZone(date, ET_TIMEZONE, formatStr);
}

export function formatTimeET(date: Date, formatStr: string = 'h:mm a'): string {
  return formatInTimeZone(date, ET_TIMEZONE, formatStr);
}

export function formatDateTimeET(date: Date, formatStr: string = 'EEEE, MMMM d, yyyy h:mm a'): string {
  return formatInTimeZone(date, ET_TIMEZONE, formatStr);
}

export function isWeekday(date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday = 1, Friday = 5
}

export function getTodayET(): Date {
  return new Date();
}

export function getGreeting(): string {
  const hour = parseInt(formatInTimeZone(new Date(), ET_TIMEZONE, 'H'));
  
  if (hour < 12) return '☀️ Good Morning';
  if (hour < 17) return '☀️ Good Afternoon';
  return '🌙 Good Evening';
}

