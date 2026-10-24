// Génère les icônes PWA. Utilise public/logo.png s'il existe, sinon un pictogramme étoile.
// Usage : node scripts/icons.mjs
import sharp from "sharp";
import { existsSync, mkdirSync } from "node:fs";

const out = "public/icons";
mkdirSync(out, { recursive: true });
const BG = "#275963";
const star = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a7f8b"/><stop offset="1" stop-color="#143238"/></linearGradient></defs>
  <rect width="512" height="512" fill="url(#g)"/>
  <path fill="#fff" d="M256 92c10 74 34 128 76 152-42 24-66 78-76 176-10-98-34-152-76-176 42-24 66-78 76-152z"/>
  <path fill="#afdae0" d="M372 120c4 26 12 42 28 50-16 8-24 24-28 50-4-26-12-42-28-50 16-8 24-24 28-50zM150 330c3 20 9 32 21 38-12 6-18 18-21 38-3-20-9-32-21-38 12-6 18-18 21-38z"/>
</svg>`;

async function make(size, file, padding) {
  const inner = Math.round(size * (1 - padding * 2));
  let img;
  if (existsSync("public/logo.png")) {
    const logo = await sharp("public/logo.png").resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    img = sharp({ create: { width: size, height: size, channels: 4, background: BG } }).composite([{ input: logo, gravity: "center" }]);
  } else {
    img = sharp(Buffer.from(star(size)));
  }
  await img.png().toFile(`${out}/${file}`);
}

await make(192, "icon-192.png", 0.08);
await make(512, "icon-512.png", 0.08);
await make(512, "maskable-512.png", 0.18);
await make(180, "apple-touch-icon.png", 0.08);
console.log("Icônes générées dans", out, existsSync("public/logo.png") ? "(à partir du logo)" : "(pictogramme provisoire)");
