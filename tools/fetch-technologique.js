#!/usr/bin/env node
/**
 * Extrait la banque de sujets DNB de techno-logique.com (page publique) :
 * catégories (notions), sujets et liens PDF (+ corrections).
 *
 *   node tools/fetch-technologique.js <fichier-sortie.json>
 */
"use strict";

const fs = require("fs");
const cheerio = require("cheerio");

const URL = "https://www.techno-logique.com/PDG-sujets-preparation.shtml";
const OUT = process.argv[2] || "technologique-sujets.json";

(async () => {
  const res = await fetch(URL, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error("HTTP " + res.status);
  const html = await res.text();
  const $ = cheerio.load(html);

  // Parcourt le document en ordre : titres de section (h2/h3/b) et liens PDF.
  const cats = [];
  let current = { title: "(début)", items: [] };

  function pushCat() {
    if (current.items.length) cats.push(current);
  }

  $("body *").each((_, el) => {
    const tag = el.tagName;
    const t = $(el);
    if (/^h[1-4]$/.test(tag)) {
      const txt = t.text().replace(/\s+/g, " ").trim();
      if (txt && txt.length > 3 && txt.length < 120) {
        pushCat();
        current = { title: txt, items: [] };
      }
    }
    if (tag === "a") {
      const href = t.attr("href") || "";
      if (/\.pdf$/i.test(href) || /\.sb2$/i.test(href)) {
        const url = href.startsWith("http") ? href : "https://www.techno-logique.com/" + href.replace(/^\/+/, "");
        const label = t.text().replace(/\s+/g, " ").trim();
        // évite les doublons exacts dans la même catégorie
        if (!current.items.some((i) => i.url === url && i.label === label)) {
          current.items.push({ label, url });
        }
      }
    }
  });
  pushCat();

  const total = cats.reduce((n, c) => n + c.items.length, 0);
  fs.writeFileSync(OUT, JSON.stringify(cats, null, 1), "utf8");
  console.log(`✔ ${cats.length} catégories, ${total} liens -> ${OUT}`);
  cats.forEach((c) => console.log(`  [${c.items.length}] ${c.title}`));
})();
