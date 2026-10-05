import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  // Hide the dev-only "N / Rendering…" badge; it sat on top of the chat mic while testing.
  devIndicators: false,
  // Product photos are shrunk on the phone to ~300 KB; leave headroom.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default withNextIntl(nextConfig);
