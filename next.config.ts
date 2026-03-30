import type { NextConfig } from "next";

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
