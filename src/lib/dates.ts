import { format } from 'date-fns';

export const fmtDate = (iso: string, fmt = 'MMM d'): string => {
  return format(new Date(iso + 'T00:00:00'), fmt);
};

export const fmtRange = (start: string, end: string): string => {
  const da = new Date(start + 'T00:00:00');
  const db = new Date(end + 'T00:00:00');
  const sameYear = da.getFullYear() === db.getFullYear();
  const sameMonth = sameYear && da.getMonth() === db.getMonth();

  if (sameMonth) {
    return `${format(da, 'MMM')} ${da.getDate()}–${db.getDate()}, ${db.getFullYear()}`;
  }
  if (sameYear) {
    return `${format(da, 'MMM d')} – ${format(db, 'MMM d')}, ${db.getFullYear()}`;
  }
  return `${format(da, 'MMM d, yyyy')} – ${format(db, 'MMM d, yyyy')}`;
};

export const tripDays = (start: string, end: string): number => {
  const da = new Date(start + 'T00:00:00').getTime();
  const db = new Date(end + 'T00:00:00').getTime();
  return Math.round((db - da) / 86400000) + 1;
};

export const yearOf = (iso: string): number => {
  return new Date(iso + 'T00:00:00').getFullYear();
};

export const pad2 = (n: number): string => {
  return String(n).padStart(2, '0');
};
