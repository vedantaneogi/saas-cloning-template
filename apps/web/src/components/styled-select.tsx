"use client";

import { useMemo, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { Popover, PopoverItem, PopoverList } from "@/components/popover";

/**
 * Drop-in replacement for `<select>` that renders our dark Popover instead
 * of the OS-native dropdown panel (which on Windows shows up as a bright
 * white pane). Same value/onChange shape as a native select so existing
 * forms don't need wider refactors.
 */
export function StyledSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  width = 220,
  size = "md",
  disabled,
  className,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  placeholder?: string;
  width?: number;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}) {
  const current = useMemo(() => options.find((o) => o.value === value), [options, value]);
  const pad = size === "sm" ? "px-2 py-0.5" : "px-2 py-1";
  const text = size === "sm" ? "text-mini" : "text-small";

  return (
    <Popover
      align="start"
      width={width}
      trigger={({ toggle, open }) => (
        <button
          type="button"
          onClick={() => { if (!disabled) toggle(); }}
          disabled={disabled}
          className={clsx(
            "inline-flex w-full items-center gap-1.5 rounded-md border border-border-subtle bg-input text-text-primary",
            "hover:border-border-strong",
            "disabled:cursor-not-allowed disabled:opacity-50",
            open && "border-border-strong",
            pad,
            text,
            className,
          )}
        >
          {current?.icon}
          <span className={clsx("flex-1 truncate text-left", !current && "text-text-tertiary")}>
            {current?.label ?? placeholder ?? "Select…"}
          </span>
          <ChevronDown size={12} className="text-text-tertiary" />
        </button>
      )}
    >
      {({ close }) => (
        <PopoverList>
          {options.map((o) => (
            <PopoverItem
              key={o.value}
              active={o.value === value}
              onClick={() => { onChange(o.value); close(); }}
            >
              {o.icon}
              <span>{o.label}</span>
            </PopoverItem>
          ))}
        </PopoverList>
      )}
    </Popover>
  );
}
