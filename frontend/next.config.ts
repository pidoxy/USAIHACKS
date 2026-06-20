import type { NextConfig } from "next";

/**
 * The browser only ever talks to this same Next.js origin under `/api/*`.
 * Next rewrites those requests server-side to the deployed KRONOS engine,
 * which sidesteps CORS entirely (the live API does not allow arbitrary
 * cross-origin browsers and uses credentials, so a wildcard is impossible).
 *
 * Override with NEXT_PUBLIC_API_BASE_URL to call the engine directly instead
 * (requires the backend to allow-list the frontend origin).
 */
const API_ORIGIN =
  process.env.KRONOS_API_ORIGIN ?? "https://usaihacks.onrender.com";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${API_ORIGIN}/api/:path*`,
        },
        {
          source: "/health",
          destination: `${API_ORIGIN}/health`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
