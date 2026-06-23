import { NextResponse } from "next/server";

const SOURCES = [
  { name: "Pitchfork", url: "https://pitchfork.com/feed/rss", color: "#e00" },
  { name: "Stereogum", url: "https://www.stereogum.com/feed/", color: "#1a6" },
  { name: "Loudwire", url: "https://loudwire.com/feed/", color: "#f60" },
  { name: "BrooklynVegan", url: "https://www.brooklynvegan.com/feed/", color: "#3a7" },
  { name: "DIY", url: "https://diymag.com/feed", color: "#e0457b" },
  { name: "Under the Radar", url: "https://www.undertheradarmag.com/rss", color: "#5b8def" },
];

function extractText(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`, "s"));
  return m ? m[1].trim() : "";
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["']`, "i"));
  return m ? m[1] : "";
}

function parseItems(xml: string, source: string, color: string) {
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  return itemMatches.slice(0, 5).map((item) => {
    const title = extractText(item, "title").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#\d+;/g, "");
    const link = extractText(item, "link") || extractText(item, "guid");
    // Feeds use different date tags: RSS <pubDate>, Dublin Core <dc:date>, Atom <published>/<updated>.
    const date =
      extractText(item, "pubDate") ||
      extractText(item, "dc:date") ||
      extractText(item, "published") ||
      extractText(item, "updated") ||
      extractText(item, "date");
    const description = extractText(item, "description")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .slice(0, 140);

    // Try multiple image sources
    const thumbnail =
      extractAttr(item, "media:thumbnail", "url") ||
      extractAttr(item, "media:content", "url") ||
      extractAttr(item, "enclosure", "url") ||
      item.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ||
      "";

    return {
      title, link, date, description, thumbnail, source, color,
      id: link || title,
    };
  });
}

export async function GET() {
  const results = await Promise.all(
    SOURCES.map(async ({ name, url, color }) => {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; SETLST/1.0)" },
          next: { revalidate: 1800 },
        });
        if (!res.ok) return [];
        const xml = await res.text();
        return parseItems(xml, name, color);
      } catch {
        return [];
      }
    })
  );

  // Interleave sources and sort by date
  const all = results.flat().sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return db - da;
  });

  return NextResponse.json(all);
}
