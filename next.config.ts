import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize build for development
  typescript: {
    // Keep type checking enabled for better development experience
    ignoreBuildErrors: false,
  },
  eslint: {
    // Keep ESLint checking enabled for code quality
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
