"use client";

import { StarIcon } from "@/components/icons";

type StarRatingProps = {
  /** 0–5, half-star precision supported (e.g. 3.5). */
  value: number;
  /** Pixel size of each star. */
  size?: number;
  /** If true, renders clickable stars that report half-star selections. */
  interactive?: boolean;
  onChange?: (value: number) => void;
  className?: string;
};

/**
 * Renders a row of 5 stars. In read-only mode it fills each star
 * proportionally (so a 3.5 rating shows 3 full stars + 1 half + 1 empty).
 * In interactive mode, clicking the left half of a star selects
 * `star - 0.5`, and the right half selects the full `star`.
 */
export function StarRating({ value, size = 20, interactive = false, onChange, className }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className={`inline-flex items-center gap-0.5 ${className ?? ""}`}>
      {stars.map((star) => {
        // How much of this particular star should be filled: 0, 0.5, or 1.
        const fill = Math.max(0, Math.min(1, value - (star - 1)));

        return (
          <span key={star} className="relative inline-block" style={{ width: size, height: size }}>
            <StarIcon
              className="absolute inset-0 fill-slate-200 text-slate-300"
              style={{ width: size, height: size }}
            />

            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <StarIcon className="fill-amber-400 text-amber-400" style={{ width: size, height: size }} />
              </span>
            )}

            {interactive && (
              <>
                <button
                  type="button"
                  aria-label={`${star - 0.5} stars`}
                  onClick={() => onChange?.(star - 0.5)}
                  className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                />
                <button
                  type="button"
                  aria-label={`${star} stars`}
                  onClick={() => onChange?.(star)}
                  className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                />
              </>
            )}
          </span>
        );
      })}
    </div>
  );
}
