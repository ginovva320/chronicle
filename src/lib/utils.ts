import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const tripColors = [
  'bg-primary',
  'bg-accent',
  'bg-orange-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-red-500',
  'bg-yellow-600',
  'bg-pink-500',
];

export function getRandomColor(): string {
  return tripColors[Math.floor(Math.random() * tripColors.length)];
}
