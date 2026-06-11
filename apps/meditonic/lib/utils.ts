import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | null | undefined) {
  const num = amount === null || amount === undefined ? 0 : Number(amount);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(isNaN(num) ? 0 : num);
}

export function generateId(prefix: string) {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
  return `${prefix}-${dateStr}-${randomStr}`;
}

export function formatDate(dateString: string | Date | null | undefined) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "N/A";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://svpvajqmlwsrqmrshnea.supabase.co";
  return `${supabaseUrl}/storage/v1/object/public/${path}`;
}
