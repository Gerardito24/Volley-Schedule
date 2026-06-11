import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El repo padre tiene su propio lockfile; fijamos la raíz a v2.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
