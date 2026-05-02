import { cn } from "@/lib/utils";
import type { EnvelopeStatus } from "../types";

const statusConfig: Record<EnvelopeStatus, { label: string; dotColor: string; textColor: string }> = {
  completed: { label: "Completed", dotColor: "#00B851", textColor: "#1B7A3E" },
  sent:      { label: "Sent",      dotColor: "#0288D1", textColor: "#0277BD" },
  draft:     { label: "Draft",     dotColor: "#9E9E9E", textColor: "rgba(19,0,50,0.4)" },
  voided:    { label: "Voided",    dotColor: "#D93025", textColor: "#C62828" },
  declined:  { label: "Declined",  dotColor: "#D93025", textColor: "#C62828" },
  waiting:   { label: "Waiting",   dotColor: "#FF6D00", textColor: "#E65100" },
  delivered: { label: "Delivered", dotColor: "#0288D1", textColor: "#0277BD" },
};

interface StatusBadgeProps {
  status: EnvelopeStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    dotColor: "#9E9E9E",
    textColor: "rgba(19,0,50,0.4)",
  };

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-xs font-medium", className)}
      style={{
        color: config.textColor,
        fontFamily: "'DS Indigo', 'DSIndigo', Helvetica, Arial, sans-serif",
      }}
    >
      {/* Colored dot — no background pill, just dot + text */}
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: config.dotColor }}
      />
      {config.label}
    </span>
  );
}
