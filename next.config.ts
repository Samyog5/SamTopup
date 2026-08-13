import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/topup",
        destination: "/dashboard/topup/free-fire",
        permanent: false,
      },
      {
        source: "/topup/free-fire",
        destination: "/dashboard/topup/free-fire",
        permanent: false,
      },
      {
        source: "/wallet",
        destination: "/dashboard/wallet",
        permanent: false,
      },
      {
        source: "/orders",
        destination: "/dashboard/orders",
        permanent: false,
      },
      {
        source: "/orders/:orderNumber",
        destination: "/dashboard/orders/:orderNumber",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
