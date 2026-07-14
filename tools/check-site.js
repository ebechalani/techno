#!/usr/bin/env node
/**
 * Contrôle qualité du site généré (docs/) :
 *  - liens internes cassés (href/src vers des fichiers inexistants)
 *  - restes de réécriture (ROOT/, /view/lmtechno25, sitesv-images)
 *  - images sans fichier local
 *
 *   node tools/check-site.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "docs");

function* htmlFiles(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith(".html")) yield p;
  }
}

let errors = 0, checkedLinks = 0, pages = 0;

for (const file of htmlFiles(OUT)) {
  pages++;
  const html = fs.readFileSync(file, "utf8");
  const relDir = path.dirname(file);
  const relName = path.relative(OUT, file);

  // restes de réécriture (liens racine-relatifs cassés, images non téléchargées)
  for (const pat of [/ROOT\//, /href="\/view\/lmtechno25/, /sitesv-images/]) {
    if (pat.test(html)) {
      console.log(`✗ ${relName} : motif non résolu ${pat}`);
      errors++;
    }
  }

  // liens/href/src locaux
  const re = /(?:href|src|data-src)="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1];
    if (/^(https?:|mailto:|#|data:|\/techno\/)/.test(url)) continue;
    checkedLinks++;
    const clean = url.split("#")[0].split("?")[0];
    if (!clean) continue;
    let target = path.resolve(relDir, clean.replace(/\//g, path.sep));
    if (clean.endsWith("/")) target = path.join(target, "index.html");
    if (!fs.existsSync(target)) {
      console.log(`✗ ${relName} : lien cassé -> ${url}`);
      errors++;
    }
  }
}

console.log(`\n${pages} pages, ${checkedLinks} liens locaux vérifiés, ${errors} erreur(s).`);
process.exit(errors ? 1 : 0);
