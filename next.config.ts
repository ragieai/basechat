import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Set to false because strict mode breaks components that call APIs when the component is rendered (like in Conversation)
  reactStrictMode: false,
  output: "standalone",
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  experimental: {
    authInterrupts: true,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "api.ragie.ai" }],
  },
};

export default nextConfig;
