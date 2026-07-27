import type { NextConfig } from "next";
// @ts-expect-error: next-pwa does not ship TypeScript declarations compatible with Next.js export resolution.
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
};

const withPwa = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  sw: "sw.js",
  buildExcludes: [/middleware-manifest\.json$/],
});

export default withPwa(nextConfig);
