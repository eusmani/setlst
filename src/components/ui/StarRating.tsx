"use client";
import { useState } from "react";

interface Props {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}

const px = { sm: 13, md: 17, lg: 22 };

export default function StarRating({ value, onChange, readOnly, size = "md" }: Props) {
  const [hover, setHover] = useState(0);
  const display = readOnly ? value : hover || value;
  const s = px[size];

  return (
    <div
      className="flex items-center gap-px"
      onMouseLeave={() => !readOnly && setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const full = display >= star;
        const half = !full && display >= star - 0.5;
        const id = `half-${size}-${star}`;
        return (
          <span
            key={star}
            style={{ width: s, height: s, display: "inline-block", cursor: readOnly ? "default" : "pointer" }}
            onMouseMove={!readOnly ? (e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHover(e.clientX - r.left < r.width / 2 ? star - 0.5 : star);
            } : undefined}
            onClick={!readOnly ? () => onChange?.(hover) : undefined}
          >
            <svg viewBox="0 0 20 20" width={s} height={s}>
              {half && (
                <defs>
                  <clipPath id={id}>
                    <rect x="0" y="0" width="10" height="20" />
                  </clipPath>
                </defs>
              )}
              <polygon
                points="10,1.5 12.6,7 18.9,7.6 14.2,12 15.8,18.2 10,15 4.2,18.2 5.8,12 1.1,7.6 7.4,7"
                fill={full ? "#c4a832" : "none"}
                stroke={full || half ? "#c4a832" : "#2e2e2e"}
                strokeWidth="1.3"
              />
              {half && (
                <polygon
                  points="10,1.5 12.6,7 18.9,7.6 14.2,12 15.8,18.2 10,15 4.2,18.2 5.8,12 1.1,7.6 7.4,7"
                  fill="#c4a832"
                  clipPath={`url(#${id})`}
                />
              )}
            </svg>
          </span>
        );
      })}
    </div>
  );
}
