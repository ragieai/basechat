import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Set to false because strict mode breaks components that call APIs when the component is rendered (like in Conversation)
  reactStrictMode: false,
  cacheHandler: require.resolve("./cache-handler.ts"),
  cacheMaxMemorySize: 0, // disable default in-memory caching
  output: "standalone",
  experimental: {
    authInterrupts: true,
  },
};

export default nextConfig;
