#!/usr/bin/env node
/**
 * Fusionne des QCM dans content/quiz/<section>.json.
 * Entrée : un JSON { "<section>": { "<seqSlug>/<pageSlug>": [ {q,options,answer,explain} ] } }
 *
 *   node tools/merge-quiz.js <fichier-entrée.json>
 *
 * Les entrées existantes ne sont PAS écrasées (on n'ajoute que les clés absentes),
 * sauf si --force est passé.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const IN = process.argv[2];
const FORCE = process.argv.includes("--force");
if (!IN) { console.error("usage: node tools/merge-quiz.js <fichier.json> [--force]"); process.exit(1); }

const QUIZ_DIR = path.join(__dirname, "..", "content", "quiz");
fs.mkdirSync(QUIZ_DIR, { recursive: true });

const incoming = JSON.parse(fs.readFileSync(IN, "utf8"));
// accepte soit {section:{...}} soit directement des sections à la racine
const sections = incoming.result || incoming;

let added = 0, skipped = 0;
for (const [section, entries] of Object.entries(sections)) {
  if (!entries || typeof entries !== "object") continue;
  const f = path.join(QUIZ_DIR, `${section}.json`);
  const existing = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
  for (const [key, quiz] of Object.entries(entries)) {
    if (!Array.isArray(quiz) || !quiz.length) continue;
    if (existing[key] && !FORCE) { skipped++; continue; }
    existing[key] = quiz;
    added += quiz.length;
  }
  fs.writeFileSync(f, JSON.stringify(existing, null, 2), "utf8");
  const total = Object.values(existing).reduce((n, a) => n + a.length, 0);
  console.log(`content/quiz/${section}.json : ${Object.keys(existing).length} pages, ${total} questions`);
}
console.log(`\n✔ ${added} questions ajoutées${skipped ? `, ${skipped} clés déjà présentes (ignorées)` : ""}.`);
