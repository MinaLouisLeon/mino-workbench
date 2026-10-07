import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names and lets a later one win a conflict.
 *
 * shadcn/ui's components all expect this helper at `@/lib/utils`, which is why
 * it is here under that exact name rather than in a more descriptive one.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
