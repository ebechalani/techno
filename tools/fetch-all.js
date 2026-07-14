#!/usr/bin/env node
/**
 * Télécharge le HTML brut de toutes les pages du site d'origine
 * vers <outDir>/pages/<clé>.html (noms déterministes).
 *
 *   node tools/fetch-all.js <outDir>
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { BASE, PATHS, keyOf } = require("./urls");

const OUT = path.join(process.argv[2] || ".", "pages");
fs.mkdirSync(OUT, { recursive: true });

const CONCURRENCY = 8;

async function fetchOne(p, attempt = 1) {
  const url = encodeURI(`${BASE}/${p}`);
  const file = path.join(OUT, keyOf(p) + ".html");
  if (fs.existsSync(file) && fs.statSync(file).size > 50_000) return { p, ok: true, cached: true };
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept-Language": "fr" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    fs.writeFileSync(file, html, "utf8");
    return { p, ok: true, size: html.length };
  } catch (e) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      return fetchOne(p, attempt + 1);
    }
    return { p, ok: false, error: String(e) };
  }
}

(async () => {
  const queue = [...PATHS];
  const results = [];
  async function worker() {
    while (queue.length) {
      const p = queue.shift();
      const r = await fetchOne(p);
      results.push(r);
      process.stdout.write(r.ok ? "." : "X");
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log();
  const failed = results.filter((r) => !r.ok);
  console.log(`OK: ${results.length - failed.length}/${results.length}`);
  failed.forEach((f) => console.log(`ÉCHEC: ${f.p} — ${f.error}`));
  process.exit(failed.length ? 1 : 0);
})();
