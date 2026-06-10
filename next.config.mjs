import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      },
      {
        protocol: "https",
        hostname: "**.supabase.co"
      }
    ]
  },
  outputFileTracingRoot: projectRoot,
  reactStrictMode: true,
  webpack: (config) => {
    config.watchOptions = {
      ...(config.watchOptions ?? {}),
      ignored: [
        ...(Array.isArray(config.watchOptions?.ignored) ? config.watchOptions.ignored : []),
        "C:/DumpStack.log.tmp",
        "C:/hiberfil.sys",
        "C:/pagefile.sys",
        "C:/swapfile.sys"
      ]
    };

    return config;
  }
};

export default nextConfig;
