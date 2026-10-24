import type { NextConfig } from "next";

// Site 100 % statique (export dans /out) pour GitHub Pages.
// NEXT_PUBLIC_BASE_PATH = "/nom-du-depot" si le site est servi sur https://<compte>.github.io/nom-du-depot
// (vide avec un nom de domaine personnalisé).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
