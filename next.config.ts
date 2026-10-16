import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack doesn't latch onto a stray
  // package-lock.json in a parent directory and break HMR.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // v1'de yapay zekâ (AI Studio) ve sosyal medya sohbetleri kapalı: doğrudan adresle girilirse
  // şirket anasayfasına dönülür.
  async redirects() {
    return [
      { source: '/:company/ai-creator/:path*', destination: '/:company', permanent: false },
      { source: '/:company/conversations/:path*', destination: '/:company', permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
