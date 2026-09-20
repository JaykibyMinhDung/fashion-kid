"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
}: {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? "size-7" : size === "sm" ? "size-4" : "size-5";

  if (readOnly) {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-amber-500"
        aria-label={`${value}/5 sao`}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={cn(sizeClass, n <= value ? "fill-current" : "opacity-30")}
            aria-hidden="true"
          />
        ))}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1" role="radiogroup" aria-label="Chọn số sao">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} sao`}
          onClick={() => onChange?.(n)}
          className="text-amber-500 transition hover:scale-110"
        >
          <Star
            className={cn(sizeClass, n <= value ? "fill-current" : "opacity-30")}
            aria-hidden="true"
          />
        </button>
      ))}
    </span>
  );
}
