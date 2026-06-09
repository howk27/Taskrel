import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Turbopack is the default in Next.js 16.
  // Serwist adds a webpack plugin for prod builds — declaring turbopack: {}
  // tells Next.js this is intentional and suppresses the warning.
  turbopack: {},
};

export default withSerwist(nextConfig);
