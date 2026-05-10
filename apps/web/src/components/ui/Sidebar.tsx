import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  children: ReactNode;
  className?: string;
}

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex-shrink-0 bg-white border-r overflow-y-auto",
        className,
      )}
      style={{ width: "260px", borderColor: "#E0E0E0" }}
    >
      {children}
    </aside>
  );
}

interface SidebarSectionProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function SidebarSection({ title, children, className }: SidebarSectionProps) {
  return (
    <div className={cn("py-2", className)}>
      {title && (
        <div className="px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            {title}
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

interface SidebarItemProps {
  label: string;
  icon?: ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  count?: number;
  indent?: boolean;
}

export function SidebarItem({ label, icon, isActive, onClick, count, indent }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors text-left",
        indent && "pl-8",
        isActive
          ? "bg-gray-100 text-[#1B0A3C] font-medium border-l-2 border-[#1B0A3C]"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
      )}
    >
      {icon && <span className="flex-shrink-0 w-4 h-4">{icon}</span>}
      <span className="flex-1">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-gray-400">{count}</span>
      )}
    </button>
  );
}
