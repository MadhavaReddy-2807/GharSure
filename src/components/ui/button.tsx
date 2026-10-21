import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 min-h-[44px]";

    const variantStyles = {
      primary:
        "bg-brand-orange text-white hover:bg-brand-orange-600 active:bg-brand-orange-700 shadow-sm focus-visible:ring-brand-orange",
      secondary:
        "bg-brand-navy text-white hover:bg-brand-navy-600 active:bg-brand-navy-700 shadow-sm focus-visible:ring-brand-navy",
      outline:
        "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus-visible:ring-brand-orange active:bg-slate-100",
      ghost:
        "bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-brand-orange",
      link:
        "bg-transparent text-brand-orange hover:underline focus-visible:ring-brand-orange p-0 min-h-0",
    };

    const sizeStyles = {
      sm: "h-10 px-3.5 text-sm",
      md: "h-12 px-5 text-base",
      lg: "h-14 px-6 text-lg",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading && (
          <Loader2 className="w-5 h-5 mr-2 animate-spin text-current shrink-0" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
