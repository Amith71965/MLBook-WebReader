import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://pub-1f5c0ba9c71c47dda9854bea440ba21d.r2.dev/**"),
    ],
  },
};

export default nextConfig;
