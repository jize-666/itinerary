import type { NextConfig } from "next";

// Situs statis: semua logika server ada di Supabase Edge Functions (PRD §13).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
