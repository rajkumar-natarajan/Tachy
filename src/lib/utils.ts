import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function statusColor(status: number): string {
  if (status === 0) return "text-red-400";
  if (status < 300) return "text-emerald-400";
  if (status < 400) return "text-amber-400";
  if (status < 500) return "text-orange-400";
  return "text-red-400";
}

export function statusBg(status: number): string {
  if (status === 0) return "bg-red-500/15 text-red-400 border-red-500/30";
  if (status < 300) return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (status < 400) return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  if (status < 500) return "bg-orange-500/15 text-orange-400 border-orange-500/30";
  return "bg-red-500/15 text-red-400 border-red-500/30";
}

export function methodColor(method: string): string {
  switch (method) {
    case "GET":
      return "text-emerald-400";
    case "POST":
      return "text-amber-400";
    case "PUT":
      return "text-blue-400";
    case "PATCH":
      return "text-grape-400";
    case "DELETE":
      return "text-red-400";
    default:
      return "text-cyan-400";
  }
}

export function tryPrettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

export function isJsonContentType(ct: string): boolean {
  return /json|\+json/i.test(ct);
}

export function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, "_").toLowerCase();
}
