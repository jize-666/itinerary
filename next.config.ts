import type { NextConfig } from "next";

// Situs statis: semua logika server ada di Supabase Edge Functions (PRD §13).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  // Versi build untuk service worker (/sw.js?v=…): tiap deploy memasang cache baru.
  env: { NEXT_PUBLIC_BUILD_ID: (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 12) || Date.now().toString(36) },
};

export default nextConfig;
