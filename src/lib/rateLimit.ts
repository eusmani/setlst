import { NextRequest, NextResponse } from "next/server";

// Lightweight in-memory fixed-window rate limiter.
// Note: state lives per server instance. On Vercel Fluid Compute instances are
// reused, so this gives solid best-effort protection for a single deployment.
// For multi-region/high-scale, swap the Map for Upstash Redis with the same API.
const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
  }
  b.count++;
  return { ok: true, retryAfter: 0 };
}

// Best-effort client identifier from proxy headers.
export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Guard a route: returns a 429 NextResponse when over the limit, else null.
 * `bucket` namespaces the limit (e.g. "register"), `id` is the subject (ip/email).
 */
export function checkLimit(
  bucket: string,
  id: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const { ok, retryAfter } = rateLimit(`${bucket}:${id}`, limit, windowMs);
  if (ok) return null;
  return NextResponse.json(
    { error: `Too many requests. Try again in ${retryAfter}s.` },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
