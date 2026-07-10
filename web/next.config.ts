import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3201";
const CDN_HOST = process.env.NEXT_PUBLIC_CDN_HOST ?? "";

/** Güvenlik başlıkları — her yanıta eklenir */
const securityHeaders = [
  // Clickjacking koruması
  { key: "X-Frame-Options", value: "DENY" },
  // MIME sniffing koruması
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer bilgisi kısıtlama
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Permissions API kısıtlama — mikrofon Yolculuk Telsiz (PTT) için gerekli
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(self), geolocation=(self), payment=()",
  },
  // HTTPS zorunluluğu (production)
  ...(process.env.NODE_ENV === "production"
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
  // Content Security Policy
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
      `font-src 'self' https://fonts.gstatic.com`,
      `img-src 'self' data: blob: https: http: ${CDN_HOST}`,
      // Telsiz/sohbet ses klipleri data: ve blob: URL ile çalınır
      `media-src 'self' data: blob: ${API_URL}`,
      `connect-src 'self' ${API_URL} wss: ws: https://www.google-analytics.com`,
      `frame-src 'none'`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `upgrade-insecure-requests`,
    ]
      .join("; ")
      .trim(),
  },
];

const apiUrlParsed = (() => {
  try { return new URL(API_URL); } catch { return null; }
})();

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [375, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      // Localhost (dev)
      { protocol: "http", hostname: "localhost" },
      // API uploads
      ...(apiUrlParsed
        ? [
            {
              protocol: apiUrlParsed.protocol.replace(":", "") as "http" | "https",
              hostname: apiUrlParsed.hostname,
              ...(apiUrlParsed.port ? { port: apiUrlParsed.port } : {}),
              pathname: "/uploads/**",
            },
          ]
        : []),
      // CDN veya wildcard fallback
      ...(CDN_HOST
        ? [{ protocol: "https" as const, hostname: CDN_HOST }]
        : [{ protocol: "https" as const, hostname: "**" }]),
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export default sentryDsn
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      disableLogger: true,
      automaticVercelMonitors: false,
    })
  : nextConfig;
