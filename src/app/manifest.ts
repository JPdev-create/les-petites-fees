import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const base = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Les Petites Fées — Planning nettoyage",
    short_name: "Petites Fées",
    description: "Encodez vos dates de nettoyage en 30 secondes.",
    id: `${base}/`,
    start_url: `${base}/connexion/`,
    scope: `${base}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#143238",
    theme_color: "#275963",
    lang: "fr",
    categories: ["business", "productivity"],
    icons: [
      { src: `${base}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { src: `${base}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
      { src: `${base}/icons/maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Encoder mes dates", url: `${base}/espace/planifier/`, icons: [{ src: `${base}/icons/icon-192.png`, sizes: "192x192" }] },
      { name: "Tableau de bord gestionnaire", url: `${base}/admin/` },
    ],
  };
}
