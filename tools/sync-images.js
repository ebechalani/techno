#!/usr/bin/env node
/**
 * Pour chaque page du site d'origine : télécharge le HTML FRAIS, l'analyse,
 * puis télécharge immédiatement ses images de contenu (les URLs d'images
 * Google Sites sont signées et expirent en quelques heures).
 *
 * Écrit :
 *   <scratchDir>/parsed/<clé>.json          (contenu ordonné, images -> local)
 *   content/assets/img/<clé>/NN.<ext>       (images auto-hébergées)
 *
 *   node tools/sync-images.js <scratchDir>
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { BASE, PATHS, keyOf } = require("./urls");
const { parsePage } = require("./parse-pages");

const SCRATCH = process.argv[2];
if (!SCRATCH) { console.error("usage: node tools/sync-images.js <scratchDir>"); process.exit(1); }
const PARSED = path.join(SCRATCH, "parsed");
const IMGROOT = path.join(__dirname, "..", "content", "assets", "img");
fs.mkdirSync(PARSED, { recursive: true });

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept-Language": "fr" };

const extFromType = (ct) =>
  /png/.test(ct) ? ".png" : /jpe?g/.test(ct) ? ".jpg" : /gif/.test(ct) ? ".gif" : /webp/.test(ct) ? ".webp" : /svg/.test(ct) ? ".svg" : ".png";

async function get(url, asBuffer, attempt = 1) {
  try {
    const res = await fetch(url, { headers: UA, redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return asBuffer
      ? { buf: Buffer.from(await res.arrayBuffer()), ct: res.headers.get("content-type") || "" }
      : await res.text();
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return get(url, asBuffer, attempt + 1);
    }
    throw e;
  }
}

async function processPage(p) {
  const key = keyOf(p);
  const jsonPath = path.join(PARSED, key + ".json");

  // Déjà complet ? (toutes les images ont un chemin local existant)
  if (fs.existsSync(jsonPath)) {
    const existing = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const imgs = existing.blocks.filter((b) => b.type === "img");
    const complete = imgs.every((b) => b.local && fs.existsSync(path.join(__dirname, "..", "content", b.local)));
    if (complete) return { p, imgs: imgs.length, cached: true };
  }

  const html = await get(encodeURI(`${BASE}/${p}`), false);
  const page = parsePage(html, p);
  const dir = path.join(IMGROOT, key);
  let n = 0, fails = 0;

  for (const b of page.blocks) {
    if (b.type !== "img") continue;
    n++;
    const url = b.src.replace(/=w\d+(-h\d+)?([^=]*)?$/, "=w1600");
    try {
      const { buf, ct } = await get(url, true);
      fs.mkdirSync(dir, { recursive: true });
      const name = String(n).padStart(2, "0") + extFromType(ct);
      fs.writeFileSync(path.join(dir, name), buf);
      b.local = `assets/img/${key}/${name}`;
    } catch (e) {
      fails++;
      console.error(`\n  échec image ${key}#${n}: ${e.message}`);
    }
  }

  fs.writeFileSync(jsonPath, JSON.stringify(page, null, 1), "utf8");
  return { p, imgs: n, fails };
}

(async () => {
  let totalImgs = 0, totalFails = 0, i = 0;
  const queue = [...PATHS];
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      try {
        const r = await processPage(p);
        totalImgs += r.imgs || 0;
        totalFails += r.fails || 0;
        i++;
        process.stdout.write(`\r${i}/${PATHS.length} pages, ${totalImgs} images${totalFails ? `, ${totalFails} échecs` : ""}   `);
      } catch (e) {
        i++;
        console.error(`\néchec page ${p}: ${e.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  console.log(`\n✔ terminé — ${totalImgs} images référencées, ${totalFails} échecs`);
  process.exit(totalFails ? 1 : 0);
})();
