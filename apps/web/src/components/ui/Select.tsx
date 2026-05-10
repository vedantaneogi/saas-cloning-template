"use client";

import { SelectHTMLAttributes, forwardRef } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium" style={{ color: "#1B0A3C" }}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "w-full appearance-none px-3 py-2.5 pr-8 border rounded text-sm outline-none transition-colors bg-white",
              "focus:border-[#1B0A3C]",
              error ? "border-[#D93025]" : "border-[#E0E0E0]",
              className,
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <CaretDown
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            size={16}
          />
        </div>
        {error && <p className="text-xs text-[#D93025]">{error}</p>}
      </div>
    );
  },
);

Select.displayName = "Select";
