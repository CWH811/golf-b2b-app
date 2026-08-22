import type { NextConfig } from "next";

// PWA/offline support is implemented via a hand-written service worker
// (public/sw.js, registered manually in app/layout.tsx) rather than
// next-pwa/workbox: next-pwa only wires in via a webpack plugin, which this
// Turbopack build never invokes, so it was already inert dead weight here
// (and the sole source of several unmaintained-dependency vulnerabilities).
const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
};

export default nextConfig;
