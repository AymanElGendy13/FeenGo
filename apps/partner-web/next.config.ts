import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// next-intl without locale prefixes in the URL: the language is read from a
// cookie in src/i18n/request.ts (docs/ARCHITECTURE.md section 12).
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// The pnpm workspace root. The fonts come from packages/design-tokens, and the
// standalone output must trace files from the whole workspace.
const workspaceRoot = path.join(import.meta.dirname, '..', '..');

// Only headers that this placeholder can justify. A Content-Security-Policy for
// scripts and styles needs per-request nonces, which come with proxy.ts in S2;
// HSTS belongs to the TLS-terminating host proxy, not to this server.
const securityHeaders = [
  // Never guess a response's type from its content.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Never send full URLs, which will carry venue and booking IDs, to other sites.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // No other site may frame the dashboard (clickjacking). X-Frame-Options is for
  // browsers that do not support frame-ancestors.
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'",
  },
  // No window opened from another site keeps a handle on this one.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // The page uses none of these; a feature that needs one turns it on here.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: workspaceRoot,
  turbopack: { root: workspaceRoot },
  // @feengo/design-tokens exports its typed constants as TypeScript source.
  transpilePackages: ['@feengo/design-tokens'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
