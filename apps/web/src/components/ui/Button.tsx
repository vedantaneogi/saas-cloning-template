"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "purple" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  // Primary CTA — DocuSign brand purple
  primary: "bg-[#260559] text-white hover:bg-[#3a0880] disabled:opacity-60",
  // Secondary — kept for backward compat
  secondary: "bg-[#260559] text-white hover:bg-[#3a0880] disabled:opacity-60",
  // Purple — kept for legacy; maps to brand purple
  purple: "bg-[#260559] text-white hover:bg-[#3a0880] disabled:opacity-60",
  // Outline — white bg with dark navy border
  outline: "bg-white text-[#1B0A3C] border border-[#1B0A3C] hover:bg-gray-50 disabled:opacity-60",
  ghost: "bg-transparent text-[#1B0A3C] hover:bg-gray-100 disabled:opacity-60",
  danger: "bg-[#D93025] text-white hover:bg-[#B71C1C] disabled:opacity-60",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold rounded transition-colors cursor-pointer",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
