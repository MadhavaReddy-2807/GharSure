/**
 * Application Base URL and External Services Resolver
 * Avoids any hardcoded URLs across the GharSure application.
 */

/**
 * Returns the canonical application base URL without a trailing slash.
 * Priority order:
 * 1. process.env.NEXT_PUBLIC_APP_URL
 * 2. window.location.origin (when running in browser)
 * 3. process.env.VERCEL_URL (prepended with https://)
 * 4. Fallback to "http://localhost:3000"
 */
export function getBaseUrl(): string {
  // 1. Explicitly configured public URL
  if (process.env.NEXT_PUBLIC_APP_URL && process.env.NEXT_PUBLIC_APP_URL.trim() !== "") {
    return process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/+$/, "");
  }

  // 2. Client-side browser runtime
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }

  // 3. Vercel deployment preview / production
  if (process.env.VERCEL_URL && process.env.VERCEL_URL.trim() !== "") {
    const host = process.env.VERCEL_URL.trim();
    return host.startsWith("http") ? host.replace(/\/+$/, "") : `https://${host}`.replace(/\/+$/, "");
  }

  // 4. Local development default
  return "http://localhost:3000";
}

/**
 * Returns the configured geocoding service URL (e.g. OpenStreetMap / Nominatim)
 */
export function getGeocodingApiUrl(): string {
  if (process.env.NEXT_PUBLIC_GEOCODING_API_URL && process.env.NEXT_PUBLIC_GEOCODING_API_URL.trim() !== "") {
    return process.env.NEXT_PUBLIC_GEOCODING_API_URL.trim().replace(/\/+$/, "");
  }
  return "https://nominatim.openstreetmap.org";
}

/**
 * Returns the configured Meta Graph API base endpoint
 */
export function getMetaGraphBaseUrl(): string {
  if (process.env.META_GRAPH_BASE_URL && process.env.META_GRAPH_BASE_URL.trim() !== "") {
    return process.env.META_GRAPH_BASE_URL.trim().replace(/\/+$/, "");
  }
  return "https://graph.facebook.com";
}
