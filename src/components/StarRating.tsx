"use client";

import { useState } from "react";

interface StarRatingProps {
  value: number; // 0 to 5, supports 0.5 steps
  onChange?: (v: number) => void;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASS: Record<string, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
};

export function StarRating({ value, onChange, size = "md" }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;
  const interactive = !!onChange;

  return (
    <div
      className={`flex gap-0.5 ${interactive ? "cursor-pointer" : ""}`}
      onMouseLeave={() => interactive && setHovered(null)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const full = display >= star;
        const half = !full && display >= star - 0.5;

        return (
          <div key={star} className={`relative leading-none ${SIZE_CLASS[size]}`}>
            {/* Empty base */}
            <span className="text-zinc-700 select-none">★</span>
            {/* Filled overlay */}
            {(full || half) && (
              <span
                className="absolute inset-0 text-[var(--funk-yellow)] overflow-hidden pointer-events-none select-none"
                style={{ clipPath: full ? "none" : "inset(0 50% 0 0)" }}
              >
                ★
              </span>
            )}
            {/* Interactive hit areas */}
            {interactive && (
              <>
                <div
                  className="absolute left-0 top-0 w-1/2 h-full"
                  onMouseEnter={() => setHovered(star - 0.5)}
                  onClick={() => onChange(star - 0.5)}
                />
                <div
                  className="absolute right-0 top-0 w-1/2 h-full"
                  onMouseEnter={() => setHovered(star)}
                  onClick={() => onChange(star)}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
