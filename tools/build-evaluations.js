#!/usr/bin/env node
/**
 * Génère la banque d'évaluations du professeur :
 * apparie chaque séquence du site aux sujets DNB de techno-logique.com
 * (par mots-clés + catégories recommandées) et écrit la page
 * src/app/prof/evaluations/index.html.
 *
 *   node tools/build-evaluations.js <technologique-sujets.json>
 */
"use strict";

const fs = require("fs");
const path = require("path");

const IN = process.argv[2];
if (!IN) { console.error("usage: node tools/build-evaluations.js <sujets.json>"); process.exit(1); }
const cats = JSON.parse(fs.readFileSync(IN, "utf8"));

/* ---------- Prépare la banque : sujets + corrections appariées ---------- */

const bank = []; // {label, url, correction?, cat}
for (const cat of cats) {
  const isOfficial = /Série (professionnelle|générale)/.test(cat.title);
  const catTitle = isOfficial ? `Sujet officiel (${cat.title.toLowerCase()})` : cat.title;
  let last = null;
  for (const it of cat.items) {
    if (/-correction/.test(it.url)) {
      if (last) last.correction = it.url;
      continue;
    }
    last = { label: it.label || it.url.split("/").pop(), url: it.url, cat: catTitle };
    bank.push(last);
  }
}

// index par mot-clé (sur libellé + nom de fichier, sans accents, minuscule)
const norm = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
for (const b of bank) b._n = norm(b.label + " " + b.url);

function find(keywords, { cap = 8, cats: catFilter, fillFrom } = {}) {
  const seen = new Set();
  const out = [];
  for (const kw of keywords) {
    const k = norm(kw);
    for (const b of bank) {
      if (out.length >= cap) break;
      if (seen.has(b.url)) continue;
      if (catFilter && !catFilter.some((c) => b.cat.includes(c))) continue;
      if (b._n.includes(k)) { seen.add(b.url); out.push(b); }
    }
  }
  // complète depuis la catégorie recommandée (sujets avec corrigé d'abord)
  if (fillFrom && out.length < Math.min(cap, 6)) {
    const pool = bank
      .filter((b) => b.cat.includes(fillFrom) && !seen.has(b.url))
      .sort((a, b2) => (b2.correction ? 1 : 0) - (a.correction ? 1 : 0));
    for (const b of pool) {
      if (out.length >= Math.min(cap, 6)) break;
      seen.add(b.url); out.push(b);
    }
  }
  return out;
}

/* ---------- Appariement séquences -> sujets ---------- */

const MAP = [
  {
    level: "5ème", seqs: [
      { title: "Cybersécurité", url: "5eme/sequence-1-cybersecurite/",
        note: "La banque DNB porte sur des objets techniques : peu de sujets « cyber ». Utilisez les quiz intégrés du site et Pix pour évaluer cette séquence.",
        subjects: find(["montre connectee", "maison intelligente", "surveillance"]),
        categories: ["Electronique et informatique"] },
      { title: "Réparer un objet technique", url: "5eme/sequence-reparer-objet/",
        subjects: find(["cycle de vie", "recyclage", "smartphone", "imprimante 3D"]),
        categories: ["Cycle de vie, évolution, écologie et environnement"] },
      { title: "Préserver les ressources", url: "5eme/sequence-1-preserver-les-ressources/",
        subjects: find(["collecteur", "dechets", "poubelle", "tri", "recyclage", "eau de pluie"]),
        categories: ["Cycle de vie, évolution, écologie et environnement"] },
      { title: "Éclairage automatique", url: "5eme/sequence-2-eclairage-automatique/",
        subjects: find(["eclairage", "lampadaire", "lampe", "borne escamotable", "detecteur", "store"]),
        categories: ["Capteurs et actionneurs", "Chaines fonctionnelles"] },
      { title: "Vivre dans une boîte (habitat)", url: "5eme/sequence-3-vivre-dans-une-boite/",
        subjects: find(["maison container", "maison", "habitat", "domespace"], { fillFrom: "Cahier des charges fonctionnel" }),
        categories: ["Graphe des prestations", "Cahier des charges fonctionnel"] },
    ],
  },
  {
    level: "4ème", seqs: [
      { title: "IA générative / sécurité des données", url: "4eme/sequence-1-ia-securite/",
        note: "Sujets « objets connectés du quotidien » utilisables comme supports ; évaluez les notions IA avec les quiz intégrés.",
        subjects: find(["maison intelligente", "montre connectee", "surveillance", "enceinte"]),
        categories: ["Electronique et informatique"] },
      { title: "Dépanner et réparer", url: "4eme/sequence-depanner-reparer/",
        subjects: find(["panne", "store", "volet", "portail", "seche"], { cats: ["Chaines fonctionnelles"] }),
        categories: ["Chaines fonctionnelles, gestion des flux (information et énergie)", "Capteurs et actionneurs"] },
      { title: "Choisir un objet — développement durable", url: "4eme/sequence-objet-developpement-durable/",
        subjects: find(["cycle de vie", "eolienne", "solaire", "photovoltaique", "velo electrique", "recyclage"]),
        categories: ["Cycle de vie, évolution, écologie et environnement"] },
      { title: "Matériaux et procédés", url: "4eme/sequence-materiaux-procedes/",
        subjects: find(["materiau", "imprimante 3D", "esthetique", "ergonomie"], { fillFrom: "Matériaux" }),
        categories: ["Matériaux, esthétisme et ergonomie"] },
      { title: "Le réseau informatique", url: "4eme/sequence-1-reseau-informatique/",
        subjects: find(["reseau", "connexion", "debit", "signal", "binaire"], { cats: ["Electronique"] }),
        categories: ["Electronique et informatique (connexion, débit, type du signal, logique binaire, réseau...)"] },
      { title: "Portail automatisé", url: "4eme/sequence-2-portail-automatise/",
        subjects: find(["portail", "porte de garage", "porte", "barriere", "borne escamotable"]),
        categories: ["Graphe des prestations", "Graphe des interactions", "Cahier des charges fonctionnel"] },
      { title: "Les objets connectés", url: "4eme/sequence-3-objets-connectes/",
        subjects: find(["bracelet", "montre connectee", "ruche", "connecte", "smartphone", "drone"]),
        categories: ["Capteurs et actionneurs", "Modélisation SysML"] },
      { title: "Programmer un ordinateur de poche (micro:bit)", url: "4eme/sequence-4-microbit/",
        subjects: find(["afficheur de score", "bracelet", "cardiofrequence", "montre"], { cats: ["Algorithmique"] }),
        categories: ["Algorithmique et programmation"] },
      { title: "Feu tricolore (Arduino)", url: "4eme/sequence-5-feu-tricolore-arduino/",
        subjects: find(["feu", "tricolore", "signalisation", "passage", "pieton", "radar"], { cats: ["Algorithmique", "Chaines fonctionnelles"], fillFrom: "Algorithmique" }),
        categories: ["Algorithmique et programmation"] },
      { title: "Serre autonome", url: "4eme/sequence-6-serre-autonome/",
        subjects: find(["serre", "arrosage", "irrigation", "aquaponie", "mur vegetal", "ferme urbaine", "jardin"]),
        categories: ["Algorithmique et programmation", "Capteurs et actionneurs"] },
      { title: "Chaînes fonctionnelles (compléments)", url: "4eme/chaines-fonctionnelles/",
        subjects: find(["store", "volet", "ascenseur", "portail", "aspirateur", "tondeuse"], { cats: ["Chaines fonctionnelles"] }),
        categories: ["Chaines fonctionnelles, gestion des flux (information et énergie)"] },
    ],
  },
  {
    level: "3ème", seqs: [
      { title: "La poubelle connectée", url: "3eme/sequence-1-poubelle-connectee/",
        subjects: find(["poubelle", "compacteur", "collecteur", "dechets", "tri"]),
        categories: ["Modélisation SysML", "Chaines fonctionnelles, gestion des flux (information et énergie)"] },
      { title: "Intelligence artificielle", url: "3eme/sequence-2-intelligence-artificielle/",
        note: "Peu de sujets IA dans la banque DNB : utilisez des sujets « robots » comme supports d'algorithmique.",
        subjects: find(["robot", "tondeuse", "aspirateur"], { cats: ["Algorithmique"] }),
        categories: ["Algorithmique et programmation"] },
      { title: "Réseau informatique", url: "3eme/sequence-3-reseau-informatique/",
        subjects: find(["reseau", "connexion", "debit", "adresse", "binaire"], { cats: ["Electronique"] }),
        categories: ["Electronique et informatique (connexion, débit, type du signal, logique binaire, réseau...)"] },
      { title: "Préparation au DNB (tous thèmes)", url: "3eme/sessions-dnb/",
        note: "La page « Préparation au DNB » du site liste déjà les 31 sujets officiels ; complétez avec les catégories par notion ci-dessous selon le chapitre à réviser.",
        subjects: [],
        categories: ["Graphe des prestations", "Cahier des charges fonctionnel", "Chaines fonctionnelles, gestion des flux (information et énergie)", "Algorithmique et programmation", "Gestion de projet (diagramme de Gantt)", "Représentation graphique (carte mentale, chronogramme, courbe...)"] },
    ],
  },
];

/* ---------- Rendu HTML ---------- */

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const catCounts = Object.fromEntries(cats.map((c) => [c.title, c.items.filter((i) => !/-correction/.test(i.url)).length]));

function seqCard(s) {
  const subj = s.subjects.map((b) => `
      <li>
        <a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.label)}</a>
        <span class="ev-cat">${esc(b.cat.split("(")[0].trim())}</span>
        ${b.correction ? `<a class="ev-corr" href="${esc(b.correction)}" target="_blank" rel="noopener">✓ corrigé</a>` : ""}
      </li>`).join("");
  const catsHtml = (s.categories || []).map((c) => {
    const n = catCounts[Object.keys(catCounts).find((k) => k.includes(c.split("(")[0].trim()))] || "";
    return `<span class="ev-pill">${esc(c.split("(")[0].trim())}${n ? ` · ${n} sujets` : ""}</span>`;
  }).join(" ");
  return `
    <div class="app-card">
      <h3 style="margin:0 0 0.2rem"><a href="../../${esc(s.url)}" style="color:inherit">${esc(s.title)}</a></h3>
      ${s.note ? `<p class="ev-note">${esc(s.note)}</p>` : ""}
      ${subj ? `<ul class="ev-list">${subj}</ul>` : ""}
      ${catsHtml ? `<p class="ev-cats"><strong>Pour aller plus loin :</strong> ${catsHtml} <a href="https://www.techno-logique.com/PDG-sujets-preparation.shtml" target="_blank" rel="noopener">(banque complète ↗)</a></p>` : ""}
    </div>`;
}

const body = MAP.map((lvl) => `
  <h2 class="ev-level">${esc(lvl.level)}</h2>
  ${lvl.seqs.map(seqCard).join("\n")}`).join("\n");

const html = `<!DOCTYPE html>
<html lang="fr" data-base="../../">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Banque d'évaluations — Espace professeur</title>
<link rel="icon" href="../../assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lexend:wght@500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../assets/styles.css">
<script>(function(){try{var t=localStorage.getItem("lmtechno-theme");if(!t)t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t);}catch(e){}})();</script>
<style>
  .ev-level { margin: 2rem 0 0.8rem; padding-bottom: 0.3rem; border-bottom: 2px solid var(--border); }
  .ev-note { color: var(--muted); font-size: 0.88rem; margin: 0.2rem 0 0.6rem; }
  .ev-list { list-style: none; margin: 0.6rem 0; padding: 0; display: flex; flex-direction: column; gap: 0.45rem; }
  .ev-list li { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.6rem; font-size: 0.93rem; padding: 0.45rem 0.6rem; background: var(--surface-2); border-radius: 8px; }
  .ev-cat { color: var(--muted); font-size: 0.76rem; }
  .ev-corr { margin-left: auto; font-weight: 600; font-size: 0.82rem; color: var(--ok); white-space: nowrap; }
  .ev-cats { font-size: 0.85rem; color: var(--text-2); margin: 0.7rem 0 0; }
  .ev-pill { display: inline-block; background: var(--primary-soft); color: var(--primary); border-radius: 999px; padding: 0.15rem 0.6rem; font-size: 0.78rem; font-weight: 600; margin: 0.1rem 0.15rem 0.1rem 0; }
</style>
</head>
<body>
<header class="app-header">
  <div class="wrap">
    <a class="brand" href="../../index.html"><span class="brand-logo">T</span><span>Banque d'évaluations</span></a>
    <span class="spacer"></span>
    <a class="btn btn-ghost btn-sm" href="../">← Tableau de bord</a>
  </div>
</header>
<main class="app-main">
  <div class="app-card" style="border-left:4px solid var(--primary)">
    <h2 style="margin:0 0 0.4rem">Des sujets d'évaluation appariés à vos séquences</h2>
    <p style="color:var(--text-2);margin:0 0 0.4rem">Pour chaque séquence, une sélection de <strong>sujets type DNB</strong> de la banque
    <a href="https://www.techno-logique.com/PDG-sujets-preparation.shtml" target="_blank" rel="noopener">techno-logique.com</a>
    (~300 sujets classés par notion, la plupart avec <strong>corrigé</strong>). Les liens ouvrent les PDF hébergés sur techno-logique.com.</p>
    <p style="color:var(--muted);font-size:0.86rem;margin:0">💡 <strong>En classe :</strong> imprimez un sujet par îlot de 4 (travail d'équipe, corrigé en autonomie), ou projetez-le et faites répondre chaque îlot à tour de rôle. Les quiz intégrés du site servent d'évaluation formative individuelle sur les PC.</p>
  </div>
  ${body}
  <p style="color:var(--muted);font-size:0.82rem;margin-top:1.6rem">Sujets et corrigés hébergés par techno-logique.com (ressource externe). La sélection est indicative : adaptez au niveau réel de vos classes.</p>
</main>
</body>
</html>
`;

const OUT = path.join(__dirname, "..", "src", "app", "prof", "evaluations", "index.html");
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html, "utf8");

let totalSubj = 0, withCorr = 0;
for (const lvl of MAP) for (const s of lvl.seqs) { totalSubj += s.subjects.length; withCorr += s.subjects.filter((x) => x.correction).length; }
console.log(`✔ Page générée : ${OUT}`);
console.log(`  ${totalSubj} sujets appariés (${withCorr} avec corrigé) sur ${bank.length} sujets en banque.`);
for (const lvl of MAP) for (const s of lvl.seqs) console.log(`  - ${lvl.level} / ${s.title} : ${s.subjects.length} sujets`);
