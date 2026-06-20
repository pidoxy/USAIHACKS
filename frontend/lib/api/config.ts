/**
 * Base URL for the KRONOS engine API.
 *
 * Default ("") → requests go to the SAME origin (`/api/...`), which Next.js
 * rewrites to the deployed engine (see next.config.ts). This avoids CORS.
 *
 * Set NEXT_PUBLIC_API_BASE_URL to an absolute origin (e.g.
 * https://usaihacks.onrender.com) to call the engine directly from the
 * browser instead — only works if the backend allow-lists this frontend.
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** Public engine origin, used for full-page redirects (OAuth) where a proxy path won't do. */
export const ENGINE_ORIGIN =
  process.env.NEXT_PUBLIC_ENGINE_ORIGIN ?? "https://usaihacks.onrender.com";
