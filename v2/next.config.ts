import path from "path";
import type { NextConfig } from "next";

// path.resolve(".") = CWD en tiempo de build = el directorio v2/ cuando Vercel
// usa Root Directory = v2. Le decimos a Turbopack que el root del repo ES v2/,
// para que no suba al package.json padre y compile src/middleware.ts de la app
// original.
const projectRoot = path.resolve(".");

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
