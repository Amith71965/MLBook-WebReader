import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://pub-ee43721261544e8e8a0ca430d5d2c560.r2.dev/**"),
    ],
  },
};

export default nextConfig;
