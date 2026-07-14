#!/usr/bin/env node
/**
 * Télécharge toutes les images de contenu référencées dans les pages
 * analysées vers content/assets/img/<clé-de-page>/NN.<ext> et enregistre
 * le chemin local dans chaque bloc image ("local").
 *
 *   node tools/download-images.js <scratchDir>
 */
"use strict";

const fs = require("fs");
const path = require("path");

const SCRATCH = process.argv[2];
if (!SCRATCH) { console.error("usage: node tools/download-images.js <scratchDir>"); process.exit(1); }
const PARSED = path.join(SCRATCH, "parsed");
const IMGROOT = path.join(__dirname, "..", "content", "assets", "img");

const extFromType = (ct) => {
  if (/png/.test(ct)) return ".png";
  if (/jpe?g/.test(ct)) return ".jpg";
  if (/gif/.test(ct)) return ".gif";
  if (/webp/.test(ct)) return ".webp";
  if (/svg/.test(ct)) return ".svg";
  return ".png";
};

async function download(url, attempt = 1) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { buf, ct: res.headers.get("content-type") || "" };
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1200 * attempt));
      return download(url, attempt + 1);
    }
    throw e;
  }
}

(async () => {
  const files = fs.readdirSync(PARSED).filter((f) => f.endsWith(".json"));
  let total = 0, fail = 0, skipped = 0;

  for (const f of files) {
    const p = path.join(PARSED, f);
    const page = JSON.parse(fs.readFileSync(p, "utf8"));
    const dir = path.join(IMGROOT, page.key);
    let n = 0, changed = false;

    for (const b of page.blocks) {
      if (b.type !== "img") continue;
      n++;
      if (b.local && fs.existsSync(path.join(__dirname, "..", "content", b.local))) { skipped++; continue; }
      // pleine résolution raisonnable
      const url = b.src.replace(/=w\d+(-h\d+)?([^=]*)?$/, "=w1600");
      try {
        const { buf, ct } = await download(url);
        fs.mkdirSync(dir, { recursive: true });
        const name = String(n).padStart(2, "0") + extFromType(ct);
        fs.writeFileSync(path.join(dir, name), buf);
        b.local = `assets/img/${page.key}/${name}`;
        changed = true;
        total++;
        process.stdout.write(".");
      } catch (e) {
        fail++;
        process.stdout.write("X");
        console.error(`\néchec ${page.key} img${n}: ${e.message}`);
      }
    }
    if (changed) fs.writeFileSync(p, JSON.stringify(page, null, 1), "utf8");
  }
  console.log(`\n✔ ${total} images téléchargées, ${skipped} déjà présentes, ${fail} échecs`);
  process.exit(fail ? 1 : 0);
})();
