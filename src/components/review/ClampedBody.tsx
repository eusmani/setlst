"use client";
import { useState } from "react";

// Review body in the activity feed: capped at two lines with a trailing ellipsis
// until tapped, then expands in place to the full text.
export default function ClampedBody({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <p
      onClick={() => !expanded && setExpanded(true)}
      className={`text-[15px] text-[#bbbbbb] leading-relaxed mt-2.5 break-words whitespace-pre-wrap ${
        expanded ? "" : "line-clamp-2 cursor-pointer"
      }`}
    >
      {text}
    </p>
  );
}
