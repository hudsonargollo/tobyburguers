import type { NextConfig } from "next";
import path from "node:path";

// Netlify (NETLIFY=true) and Vercel (VERCEL=1) package the app themselves, so
// the self-contained "standalone" output is only used for Docker / VPS.
const onManagedHost = process.env.NETLIFY === "true" || Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {

  // Product photos are replaced in place on the VPS; keep the optimizer cache
  // short so swaps propagate to browsers/CDN quickly.
  images: {
    minimumCacheTTL: 60,
  },
  // Self-contained build output for Docker / VPS deployment.
  output: onManagedHost ? undefined : "standalone",

  // Pin the workspace root to this project so Next.js doesn't pick up
  // an unrelated package-lock.json from a parent directory.
  turbopack: {
    root: path.resolve(__dirname),
  },

  // Custom-design requests carry up to 3 reference photos (shrunk in the browser
  // to ~0.2–0.6 MB each). Default is 1 MB; Vercel caps request bodies at 4.5 MB.
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },

  // Make sure the Prisma query engine binaries ship with the server functions.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/client/**/*"],
  },
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
