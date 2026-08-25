import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// In development, Next.js/Turbopack wraps client modules in `eval` for Fast
// Refresh/HMR, so the dev client runtime requires 'unsafe-eval'. That is
// intentionally omitted in production, where the bundle is eval-free and the
// Stripe (https://js.stripe.com) requirement is preserved.
const isProduction = process.env.NODE_ENV === "production";

const cspValue = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
  // Next.js App Router bootstraps inline scripts/styles. For strict CSP in
  // production, replace 'unsafe-inline' with per-request script nonces.
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"} https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' https://fonts.gstatic.com data:",
  "frame-src https://accounts.google.com https://www.google.com https://maps.google.com https://www.openstreetmap.org https://js.stripe.com",
  "connect-src 'self' https: wss:",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: cspValue,
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: [
      "camera=(self)",
      "microphone=()",
      "geolocation=(self)",
      "interest-cohort=()",
    ].join(", "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);