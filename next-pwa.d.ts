import type { NextConfig as NextConfigType } from 'next';

declare module 'next-pwa' {
  type PWAConfig = Record<string, unknown>;
  const withPWA: (config: PWAConfig) => (nextConfig: NextConfigType) => NextConfigType;
  export default withPWA;
}
