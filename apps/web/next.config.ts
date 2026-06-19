import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mira/types", "@mira/supabase", "@mira/domain", "@mira/ai"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
