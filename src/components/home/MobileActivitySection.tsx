"use client";
import { useState } from "react";
import Link from "next/link";
import ReviewCard, { ReviewData } from "@/components/review/ReviewCard";

const PREVIEW = 3;

interface Props {
  heading: string;
  feed: ReviewData[];
  empty: { msg: string; href: string; cta: string };
}

// A home-screen activity section: previews the first 3 reviews, with a down-arrow
// button that expands the section to show every review (and collapses again).
export default function MobileActivitySection({ heading, feed, empty }: Props) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? feed : feed.slice(0, PREVIEW);

  return (
    <section>
      <h2 className="text-xs text-[#a0a0a0] uppercase tracking-[0.15em] mb-3">{heading}</h2>

      {feed.length === 0 ? (
        <div className="py-12 text-center text-[#6b6b6b] bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg">
          <p className="text-sm mb-2">{empty.msg}</p>
          <Link href={empty.href} className="text-xs text-[#c4a832] hover:underline">{empty.cta}</Link>
        </div>
      ) : (
        <>
          <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-4">
            {visible.map((r) => <ReviewCard key={r.id} review={r} isLoggedIn />)}
          </div>

          {feed.length > PREVIEW && (
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
                aria-label={expanded ? "Show fewer reviews" : "Show all reviews"}
                className="flex items-center gap-1.5 text-xs text-[#a0a0a0] hover:text-[#c4a832] border border-[#2e2e2e] hover:border-[#c4a832] rounded-full px-4 py-2 transition-colors"
              >
                {expanded ? "Show less" : `Show all ${feed.length}`}
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
