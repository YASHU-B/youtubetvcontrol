import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NEXT_EXPORT === "1" ? "export" : (process.env.VERCEL ? undefined : "export"),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
