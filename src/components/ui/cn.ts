import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware className birleştirici — çakışan utility'lerde sonuncu kazanır. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
