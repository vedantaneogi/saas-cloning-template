import { clsx, type ClassValue } from "clsx";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatDateWithTime(date: string | Date | null | undefined): { date: string; time: string } {
  if (!date) return { date: "—", time: "" };
  const d = typeof date === "string" ? parseISO(date) : date;
  return {
    date: format(d, "M/d/yyyy"),
    time: format(d, "h:mm:ss aa").toLowerCase(),
  };
}

export function formatDateLong(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMMM d, yyyy 'at' h:mm a");
}

export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export const RECIPIENT_COLORS = [
  "#5FBFBF", // pastel teal
  "#6ABF8A", // pastel green
  "#6FA8D4", // pastel blue
  "#E8A87C", // pastel orange
  "#D4829A", // pastel pink
];

export function getRecipientColor(index: number): string {
  return RECIPIENT_COLORS[index % RECIPIENT_COLORS.length];
}

export type EnvelopeStatus =
  | "completed"
  | "sent"
  | "draft"
  | "voided"
  | "declined"
  | "waiting"
  | "expiring";

export const STATUS_COLORS: Record<EnvelopeStatus, { bg: string; text: string; border: string }> = {
  completed: { bg: "#E8F5E9", text: "#00B851", border: "#00B851" },
  sent: { bg: "#E3F2FD", text: "#0288D1", border: "#0288D1" },
  draft: { bg: "#F5F5F5", text: "#6B6B6B", border: "#9E9E9E" },
  voided: { bg: "#FFEBEE", text: "#D93025", border: "#D93025" },
  declined: { bg: "#FFEBEE", text: "#D93025", border: "#D93025" },
  waiting: { bg: "#FFF3E0", text: "#FF6D00", border: "#FF6D00" },
  expiring: { bg: "#FFF3E0", text: "#FF6D00", border: "#FF6D00" },
};
