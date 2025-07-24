/**
 * Utility function to conditionally join classNames together
 * Similar to clsx but without the dependency
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}