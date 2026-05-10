import { cn } from "@/lib/utils";

type BadgeVariant = "completed" | "sent" | "draft" | "voided" | "declined" | "waiting" | "default";

const badgeStyles: Record<BadgeVariant, string> = {
  completed: "bg-green-100 text-green-700 border-green-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  draft: "bg-gray-100 text-gray-600 border-gray-200",
  voided: "bg-red-100 text-red-700 border-red-200",
  declined: "bg-red-100 text-red-700 border-red-200",
  waiting: "bg-orange-100 text-orange-700 border-orange-200",
  default: "bg-gray-100 text-gray-600 border-gray-200",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        badgeStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    completed: "completed",
    sent: "sent",
    draft: "draft",
    voided: "voided",
    declined: "declined",
    waiting: "waiting",
    "action required": "waiting",
  };
  const variant = map[status.toLowerCase()] ?? "default";
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  return <Badge variant={variant}>{label}</Badge>;
}
