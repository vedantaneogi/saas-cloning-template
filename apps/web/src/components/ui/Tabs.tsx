"use client";

import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn("flex border-b", className)} style={{ borderColor: "#E0E0E0" }}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-4 py-3 text-sm font-medium transition-colors flex items-center gap-1.5",
            activeTab === tab.id
              ? "border-b-2 text-[#1B0A3C]"
              : "text-gray-500 hover:text-gray-700 border-b-2 border-transparent",
          )}
          style={{
            borderColor: activeTab === tab.id ? "#4C00FF" : "transparent",
          }}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className="px-1.5 py-0.5 rounded-full text-xs"
              style={{
                background: activeTab === tab.id ? "#F0EBFF" : "#F5F5F5",
                color: activeTab === tab.id ? "#1B0A3C" : "#9E9E9E",
              }}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
