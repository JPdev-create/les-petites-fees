/**
 * Génère public/guide-client.pdf à partir de la page /aide/ (même contenu que dans l'application).
 * Prérequis : « npm run build » (dossier out/) et Microsoft Edge ou Google Chrome installé.
 * Usage : node scripts/guide-pdf.mjs
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const OUT = resolve("out");
const PDF = resolve("public/guide-client.pdf");
const PORT = 4321;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".txt": "text/plain" };

const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];
const browser = BROWSERS.find((b) => existsSync(b));
if (!browser) throw new Error("Aucun navigateur Edge/Chrome trouvé pour générer le PDF.");
if (!existsSync(join(OUT, "aide", "index.html"))) throw new Error("Lancez d'abord « npm run build » (out/aide/ introuvable).");

// Petit serveur statique pour le dossier out/
const server = createServer(async (req, res) => {
  let path = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = join(OUT, path);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, "index.html");
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(PORT, r));

try {
  // execFile asynchrone : le serveur ci-dessus doit rester disponible pendant que le navigateur charge la page
  await execFileAsync(browser, [
    "--headless=new",
    "--disable-gpu",
    "--no-pdf-header-footer",
    "--print-to-pdf-no-header",
    "--virtual-time-budget=15000",
    "--force-dark-mode=false",
    "--blink-settings=preferredColorScheme=1",
    `--print-to-pdf=${PDF}`,
    `http://localhost:${PORT}/aide/?pdf=1`,
  ], { timeout: 120000 });
  const size = (await stat(PDF)).size;
  console.log(`✓ Guide PDF généré : public/guide-client.pdf (${Math.round(size / 1024)} Ko)`);
} finally {
  server.close();
}
