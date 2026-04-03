import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Répertoire du frontend (npm run depuis ce dossier) — évite l’avertissement lockfiles multiples à la racine du repo. */
  turbopack: {
    root: process.cwd(),
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
