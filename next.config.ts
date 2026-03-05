import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.metaforge.app",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "static-cdn.jtvnw.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.jtvnw.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "metaforge.app",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.arctracker.io",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/web-arc-raiders-cms-assets/**",
      },
    ],
  },
};

export default nextConfig;

