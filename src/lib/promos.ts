// Promotional surfaces, kept in the codebase but switched off.
//
// The Spotify-linked banners — "Connect Spotify", the new-release ad, and the
// upcoming-release strip — are disabled until after the App Store release.
// Nothing is deleted: flip this to `true` and all three come back exactly as
// they were.
//
// Note for whoever turns these on: banners that push people to an external
// service are worth a second look against App Store guideline 3.1.1 if they ever
// promote anything purchasable outside the app. These only deep-link to a
// streaming service for listening, which is fine — but the review notes should
// say so if they're live at submission time.
export const SPOTIFY_PROMOS_ENABLED = false;
