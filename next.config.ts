import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  // Product photos are shrunk on the phone to ~300 KB; leave headroom.
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};

export default withNextIntl(nextConfig);
