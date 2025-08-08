// Simple utility function replacement for clsx + tailwind-merge
export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs
    .filter(Boolean)
    .join(' ')
    .trim();
}