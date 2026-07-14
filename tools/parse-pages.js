#!/usr/bin/env node
/**
 * Analyse le HTML brut des pages Google Sites téléchargées et reconstruit
 * le contenu ordonné de chaque page : titres, paragraphes (avec liens et
 * gras), listes, images de contenu, documents intégrés (iframes).
 *
 *   node tools/parse-pages.js <scratchDir>
 *
 * Entrée  : <scratchDir>/pages/<clé>.html
 * Sortie  : <scratchDir>/parsed/<clé>.json
 */
"use strict";

const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { PATHS, keyOf } = require("./urls");


/* ---------- Conversion inline -> markdown ---------- */

function isBold($, el) {
  const style = ($(el).attr("style") || "").replace(/\s/g, "");
  return /font-weight:(700|bold)/.test(style) || el.tagName === "strong" || el.tagName === "b";
}
function isItalic($, el) {
  const style = ($(el).attr("style") || "").replace(/\s/g, "");
  return /font-style:italic/.test(style) || el.tagName === "em" || el.tagName === "i";
}

function inlineMd($, node) {
  let out = "";
  $(node)
    .contents()
    .each((_, child) => {
      if (child.type === "text") {
        out += child.data.replace(/\s+/g, " ");
        return;
      }
      if (child.type !== "tag") return;
      const tag = child.tagName;
      if (tag === "br") { out += "\n"; return; }
      if (tag === "img" || tag === "iframe") return; // gérés au niveau bloc
      let inner = inlineMd($, child);
      if (!inner.trim()) { out += inner; return; }
      if (tag === "a") {
        let href = $(child).attr("href") || "";
        href = href.replace(/[?&]authuser=0/, "").replace(/&amp;/g, "&");
        if (href && !href.startsWith("#")) {
          out += `[${inner.trim()}](${href})`;
          return;
        }
      }
      const bold = isBold($, child);
      const ital = isItalic($, child);
      const t = inner.trim();
      const lead = inner.match(/^\s*/)[0];
      const trail = inner.match(/\s*$/)[0];
      if (bold && t) inner = `${lead}**${t}**${trail}`;
      else if (ital && t) inner = `${lead}*${t}*${trail}`;
      out += inner;
    });
  return out;
}

/* ---------- Analyse d'une page ---------- */

function parsePage(html, pagePath) {
  const $ = cheerio.load(html);
  const blocks = [];
  const title =
    ($('meta[property="og:title"]').attr("content") || $("h1").first().text() || "").trim();

  const pushText = (type, md) => {
    const clean = md.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").trim();
    if (!clean) return;
    blocks.push({ type, md: clean });
  };

  function walk(el) {
    const node = $(el);
    const tag = el.tagName;
    if (!tag) return;

    if (/^h[1-6]$/.test(tag)) {
      pushText(tag, inlineMd($, el));
      return;
    }
    if (tag === "p") {
      pushText("p", inlineMd($, el));
      return;
    }
    if (tag === "ul" || tag === "ol") {
      const items = [];
      node.children("li").each((i, li) => {
        const md = inlineMd($, li).trim();
        if (md) items.push(md);
      });
      if (items.length) blocks.push({ type: tag, items });
      return;
    }
    if (tag === "img") {
      const src = node.attr("src") || "";
      if (/sitesv-images|googleusercontent\.com/.test(src)) {
        blocks.push({ type: "img", src, alt: (node.attr("alt") || "").trim() });
      }
      return;
    }
    if (tag === "iframe") {
      const src = node.attr("data-src") || node.attr("src") || "";
      const label = (node.attr("aria-label") || "").trim();
      if (src) blocks.push({ type: "embed", src, label });
      return;
    }
    if (tag === "table") {
      // tableau -> markdown simple
      const rows = [];
      node.find("tr").each((i, tr) => {
        const cells = [];
        $(tr).find("td,th").each((j, td) => cells.push(inlineMd($, td).replace(/\n/g, " ").trim()));
        rows.push(cells);
      });
      if (rows.length) blocks.push({ type: "table", rows });
      return;
    }
    node.children().each((_, c) => walk(c));
  }

  // Le contenu est dans les <section class="yaqOZd"> en ordre du document.
  $("section.yaqOZd").each((_, sec) => {
    walk(sec);
  });

  // Lien "ouvrir" des intégrations (fallback plein écran)
  const openUrls = {};
  $("[data-embed-open-url]").each((_, el) => {
    const u = $(el).attr("data-embed-open-url");
    const id = $(el).attr("data-embed-doc-id");
    if (u && id) openUrls[id] = u;
  });

  return { path: pagePath, key: keyOf(pagePath), title, blocks, openUrls };
}

module.exports = { parsePage };

/* ---------- Programme principal ---------- */

if (require.main === module) {
  const SCRATCH = process.argv[2];
  if (!SCRATCH) { console.error("usage: node tools/parse-pages.js <scratchDir>"); process.exit(1); }
  const IN = path.join(SCRATCH, "pages");
  const OUTD = path.join(SCRATCH, "parsed");
  fs.mkdirSync(OUTD, { recursive: true });
  let done = 0;
  for (const p of PATHS) {
    const file = path.join(IN, keyOf(p) + ".html");
    if (!fs.existsSync(file)) { console.error("manquant:", p); continue; }
    const html = fs.readFileSync(file, "utf8");
    const parsed = parsePage(html, p);
    fs.writeFileSync(path.join(OUTD, parsed.key + ".json"), JSON.stringify(parsed, null, 1), "utf8");
    done++;
  }
  console.log(`✔ ${done}/${PATHS.length} pages analysées -> ${OUTD}`);
}
