import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    ORCHESTRATOR_URL: process.env.ORCHESTRATOR_URL || "http://localhost:4000"
  }
};

export default nextConfig;
