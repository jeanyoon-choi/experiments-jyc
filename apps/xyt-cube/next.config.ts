import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const nextConfig: NextConfig = {
  allowedDevOrigins: ["macbook-air-5.local"],
  devIndicators: false,
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
