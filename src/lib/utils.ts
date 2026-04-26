import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const TRIP_COLORS = [
  'oklch(0.62 0.16 45)',    // warm orange (default)
  'oklch(0.55 0.10 230)',   // cold blue
  'oklch(0.55 0.12 25)',    // red ochre
  'oklch(0.65 0.13 95)',    // mustard
  'oklch(0.55 0.13 60)',    // tan
  'oklch(0.45 0.06 250)',   // deep blue
];

let colorIndex = 0;

export function getRandomColor(): string {
  const color = TRIP_COLORS[colorIndex % TRIP_COLORS.length];
  colorIndex++;
  return color;
}
