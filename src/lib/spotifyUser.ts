import { prisma } from "./prisma";

// Per-user Spotify (Authorization Code flow). Powers listening-based concert +
// album recommendations. Requires the redirect URI below to be registered in the
// Spotify Developer Dashboard for this app.

const SCOPES = ["user-top-read", "user-read-recently-played", "user-follow-read"].join(" ");

function baseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://setlst.dev";
}
export function redirectUri() {
  return `${baseUrl()}/api/spotify/callback`;
}

// URL the user is sent to in order to authorize SETLST.
export function authorizeUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: SCOPES,
    state,
    show_dialog: "false",
  });
  return `https://accounts.spotify.com/authorize?${p}`;
}

function basicAuth() {
  return `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`;
}

interface TokenResp { access_token: string; refresh_token?: string; expires_in: number }

// Exchange the auth code for tokens and store them on the user.
export async function exchangeCode(userId: string, code: string): Promise<boolean> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuth() },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirectUri() }),
  });
  if (!res.ok) return false;
  const d: TokenResp = await res.json();
  if (!d.access_token) return false;
  await prisma.user.update({
    where: { id: userId },
    data: {
      spotifyAccessToken: d.access_token,
      spotifyRefreshToken: d.refresh_token ?? null,
      spotifyTokenExpires: new Date(Date.now() + (d.expires_in - 60) * 1000),
      spotifyConnectedAt: new Date(),
    },
  });
  return true;
}

// A valid access token for the user, refreshing if expired. null if not connected.
export async function getUserToken(userId: string): Promise<string | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { spotifyAccessToken: true, spotifyRefreshToken: true, spotifyTokenExpires: true },
  });
  if (!u?.spotifyAccessToken) return null;
  if (u.spotifyTokenExpires && u.spotifyTokenExpires.getTime() > Date.now()) return u.spotifyAccessToken;
  // Refresh.
  if (!u.spotifyRefreshToken) return u.spotifyAccessToken;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basicAuth() },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: u.spotifyRefreshToken }),
  });
  if (!res.ok) return null;
  const d: TokenResp = await res.json();
  if (!d.access_token) return null;
  await prisma.user.update({
    where: { id: userId },
    data: {
      spotifyAccessToken: d.access_token,
      spotifyTokenExpires: new Date(Date.now() + (d.expires_in - 60) * 1000),
      ...(d.refresh_token ? { spotifyRefreshToken: d.refresh_token } : {}),
    },
  });
  return d.access_token;
}

export async function isConnected(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { spotifyAccessToken: true } });
  return !!u?.spotifyAccessToken;
}

export async function disconnect(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { spotifyAccessToken: null, spotifyRefreshToken: null, spotifyTokenExpires: null, spotifyConnectedAt: null },
  });
}

export interface TopArtist { id: string; name: string; image: string | null; genres: string[] }

// The user's top artists from their listening history.
export async function getTopArtists(userId: string, limit = 20): Promise<TopArtist[]> {
  const token = await getUserToken(userId);
  if (!token) return [];
  // Listening history moves slowly; uncached this was a Spotify call on every
  // request that touched the user's top artists.
  const res = await fetch(`https://api.spotify.com/v1/me/top/artists?limit=${limit}&time_range=medium_term`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  const d = await res.json();
  interface A { id: string; name: string; images?: { url: string }[]; genres?: string[] }
  return (d.items ?? []).map((a: A) => ({
    id: a.id, name: a.name, image: a.images?.[0]?.url ?? null, genres: a.genres ?? [],
  }));
}
