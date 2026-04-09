import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  /** Toujours le dossier `frontend` (évite la résolution `tailwindcss` depuis la racine monorepo). */
  turbopack: {
    root: frontendRoot,
  },
  async rewrites() {
    const backend = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(/\/$/, "");
    return [
      { source: "/api/:path*", destination: `${backend}/:path*` },
      { source: "/uploads/:path*", destination: `${backend}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
