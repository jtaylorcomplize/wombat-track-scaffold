import clsx from 'clsx';

/**
 * Utility function to conditionally join classNames together
 * Uses clsx for robust class name handling
 */
export function cn(...classes: Parameters<typeof clsx>): string {
  return clsx(...classes);
}