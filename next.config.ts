import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: any) => {
          resource.request = resource.request.replace(/^node:/, "");
        })
      );

      config.resolve.fallback = {
        ...config.resolve.fallback,
        got: false,
        "node:crypto": false,
        crypto: false,
        net: false,
        tls: false,
        fs: false,
      };

      // Also alias node:crypto to false explicitly 
      config.resolve.alias = {
        ...config.resolve.alias,
        "node:crypto": false,
      }
    }
    return config;
  },
};

export default nextConfig;
