import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount / 100); // amounts stored in cents
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getDaysUntil(timestamp: number): number {
  const now = Date.now();
  return Math.ceil((timestamp - now) / (1000 * 60 * 60 * 24));
}

export function maskString(str: string, visibleChars = 4): string {
  if (str.length <= visibleChars) return str;
  const masked = "*".repeat(str.length - visibleChars);
  return masked + str.slice(-visibleChars);
}

export function applyOpacity(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const hex3 = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
  const hex6 = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/;
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/;
  const rgba = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+)?\s*\)$/;

  let r: number, g: number, b: number;
  const c = color.trim();

  if (hex3.test(c)) {
    const m = c.match(hex3)!;
    r = parseInt(m[1] + m[1], 16);
    g = parseInt(m[2] + m[2], 16);
    b = parseInt(m[3] + m[3], 16);
  } else if (hex6.test(c)) {
    const m = c.match(hex6)!;
    r = parseInt(m[1], 16);
    g = parseInt(m[2], 16);
    b = parseInt(m[3], 16);
  } else if (rgb.test(c) || rgba.test(c)) {
    const m = c.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)!;
    r = parseInt(m[1], 10);
    g = parseInt(m[2], 10);
    b = parseInt(m[3], 10);
  } else {
    return `rgba(128,128,128,${a})`;
  }

  return `rgba(${r},${g},${b},${a})`;
}
