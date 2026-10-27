"use client";

import { useEffect } from "react";
import { isStaleBuildError, reloadForUpdate } from "@/components/pwa";

/** Dernier filet : au lieu de l'écran « Application error », un message clair et un bouton pour recharger. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
    if (isStaleBuildError(`${error.name} ${error.message}`)) reloadForUpdate();
  }, [error]);
  return (
    <html lang="fr">
      <body style={{ margin: 0, minHeight: "100dvh", display: "grid", placeItems: "center", background: "#f4f9fa", fontFamily: "system-ui, sans-serif", padding: 20 }}>
        <div style={{ maxWidth: 360, textAlign: "center", background: "#fff", borderRadius: 24, padding: 28, boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}>
          <h1 style={{ fontSize: 20, margin: "0 0 8px", color: "#18181b" }}>Oups, un petit souci</h1>
          <p style={{ margin: "0 0 20px", color: "#52525b", fontSize: 15, lineHeight: 1.5 }}>L&apos;application vient sans doute d&apos;être mise à jour. Rechargez la page pour continuer.</p>
          <button onClick={() => window.location.reload()} style={{ border: 0, borderRadius: 14, background: "#2f6873", color: "#fff", fontSize: 16, fontWeight: 600, padding: "14px 24px", cursor: "pointer" }}>Recharger</button>
        </div>
      </body>
    </html>
  );
}
