"use client";
import { useState, useEffect } from "react";

interface BlogPost {
  id: string;
  title: string;
  link: string;
  date: string;
  description: string;
  thumbnail: string;
  source: string;
  color: string;
}

const SOURCE_FILTERS = ["All", "Pitchfork", "Stereogum", "BrooklynVegan", "DIY", "Under the Radar", "Loudwire"];

export default function DiaryPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetch("/api/blogs")
      .then((r) => r.json())
      .then((d) => { setPosts(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const displayed = filter === "All" ? posts : posts.filter((p) => p.source === filter);

  return (
    <div className="max-w-4xl mx-auto px-5 pt-5 pb-12">
      <div className="flex items-baseline justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl text-[#f0f0f0] mb-1">News</h1>
          <p className="text-sm text-[#6b6b6b]">Music news and reviews from around the web</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {SOURCE_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
                filter === s
                  ? "bg-[#c4a832] border-[#c4a832] text-[#111111]"
                  : "bg-[#1a1a1a] border-[#2e2e2e] text-[#a0a0a0] hover:border-[#c4a832] hover:text-[#f0f0f0]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <p className="text-center text-[#6b6b6b] py-12 text-sm">No posts found.</p>
      ) : (
        <div className="space-y-4">
          {displayed.map((post, i) => (
            <a
              key={post.id}
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}
              className="slide-down flex flex-col sm:flex-row gap-5 p-5 bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#c4a832] rounded-xl group transition-colors"
            >
              {post.thumbnail && (
                <img
                  src={post.thumbnail}
                  alt=""
                  className="w-full sm:w-48 h-44 sm:h-32 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-2">
                  <span
                    className="text-xs uppercase tracking-widest px-2.5 py-1 rounded"
                    style={{ color: post.color, backgroundColor: post.color + "22" }}
                  >
                    {post.source}
                  </span>
                  {(() => {
                    const d = new Date(post.date);
                    if (isNaN(d.getTime())) return null;
                    return (
                      <span className="text-xs text-[#6b6b6b]">
                        {d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xl text-[#f0f0f0] group-hover:text-[#c4a832] transition-colors leading-snug mb-1.5 line-clamp-2">
                  {post.title}
                </p>
                {post.description && (
                  <p className="text-sm text-[#a0a0a0] line-clamp-2 leading-relaxed">{post.description}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
