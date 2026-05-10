"use client";

import { InputHTMLAttributes, forwardRef } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, ...props }, ref) => {
    return (
      <div className={cn("relative flex items-center", className)}>
        <MagnifyingGlass
          className="absolute left-3 text-gray-400"
          size={16}
        />
        <input
          ref={ref}
          className={cn(
            "w-full pl-9 pr-4 py-2 border rounded text-sm outline-none transition-colors",
            "border-[#E0E0E0] focus:border-[#1B0A3C]",
          )}
          {...props}
        />
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
