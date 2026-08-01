import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@mira/types", "@mira/supabase", "@mira/domain", "@mira/ai"],
  // unpdf (estrazione del testo dai PDF) porta dentro pdf.js, che usa import.meta e i
  // worker: impacchettarlo con webpack produce warning e comportamenti strani a runtime.
  // Lasciandolo esterno viene caricato da Node come pacchetto normale, che è come è pensato.
  serverExternalPackages: ["unpdf"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default withNextIntl(nextConfig);
