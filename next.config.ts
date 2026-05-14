import type { NextConfig } from "next";

/**
 * Do not set `turbopack.root` to this folder while a parent `package-lock.json` exists
 * (e.g. in `~`): it caused Tailwind (`@import "tailwindcss"`) to resolve from
 * `.../shadcn-learning/` and the dev server to hang with resolver errors. Prefer removing
 * the stray home lockfile, or ignore the multi-lockfile warning.
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/pricing-summary",
        destination: "/fuel-finder",
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
