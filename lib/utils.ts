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
