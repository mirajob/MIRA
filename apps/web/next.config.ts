import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mira/types", "@mira/supabase", "@mira/domain", "@mira/ai"],
};

export default nextConfig;
