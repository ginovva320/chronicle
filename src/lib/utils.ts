import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getRandomColor(): string {
  // With shadcn/ui neutral design, we don't need colorful backgrounds
  // Returning empty string to maintain compatibility
  return ""
}
