import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class names using clsx and tailwind-merge
 * Utility for conditional className props in components
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
