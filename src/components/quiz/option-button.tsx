"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptionButtonProps {
  label: string;
  selected?: boolean;
  onClick: () => void;
  multi?: boolean;
}

export function OptionButton({
  label,
  selected,
  onClick,
  multi,
}: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left text-sm transition-all duration-200",
        selected
          ? "border-navy bg-navy/5 text-navy shadow-sm"
          : "border-gray-200 bg-white text-charcoal hover:border-champagne/50 hover:bg-beige/30"
      )}
    >
      <span>{label}</span>
      {selected && (
        <Check className={cn("h-4 w-4 shrink-0", multi ? "text-champagne" : "text-navy")} />
      )}
    </button>
  );
}
