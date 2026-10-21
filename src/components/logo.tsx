import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

export function Logo({ className, size = "md", showText = false }: LogoProps) {
  const sizeMap = {
    sm: { width: 36, height: 36, container: "w-9 h-9" },
    md: { width: 48, height: 48, container: "w-12 h-12" },
    lg: { width: 72, height: 72, container: "w-[72px] h-[72px]" },
    xl: { width: 104, height: 104, container: "w-26 h-26" },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl bg-brand-cream shadow-sm border border-slate-100 flex items-center justify-center shrink-0",
          currentSize.container
        )}
      >
        <Image
          src="/logo.jpeg"
          alt="GharSure Logo"
          width={currentSize.width}
          height={currentSize.height}
          priority
          className="object-contain w-full h-full p-1"
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight text-brand-navy tracking-tight">
            Ghar<span className="text-brand-orange">Sure</span>
          </span>
          <span className="text-[10px] tracking-wider uppercase text-slate-500 font-medium">
            Household Intelligence
          </span>
        </div>
      )}
    </div>
  );
}
