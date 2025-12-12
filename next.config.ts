import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Set to false because strict mode breaks components that call APIs when the component is rendered (like in Conversation)
  reactStrictMode: false,
  // Only use Redis cache handler if REDIS_URL is present
  ...(process.env.USE_REDIS && {
    cacheHandler: require.resolve("./cache-handler.ts"),
    cacheMaxMemorySize: 0, // disable default in-memory caching
  }),
  output: "standalone",
  experimental: {
    authInterrupts: true,
  },
  async headers() {
    return [
      {
        // Allow embed routes to be loaded in iframes
        source: "/o/:slug/embed/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
        ],
      },
      {
        // Allow embed API routes to be called from iframes (CORS)
        source: "/api/embed/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
