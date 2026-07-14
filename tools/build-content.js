#!/usr/bin/env node
/**
 * Transforme les pages analysées (scratch/parsed/*.json) en modèle de
 * contenu du site : content/site.json + content/sections/*.json
 *
 *   node tools/build-content.js <scratchDir>
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { PATHS, keyOf } = require("./urls");

const SCRATCH = process.argv[2];
if (!SCRATCH) { console.error("usage: node tools/build-content.js <scratchDir>"); process.exit(1); }
const PARSED = path.join(SCRATCH, "parsed");
const OUT = path.join(__dirname, "..", "content");
fs.mkdirSync(path.join(OUT, "sections"), { recursive: true });

const SITE_PREFIX = /^Les cours de technologie et de SNT par M\.?\s?Eddy Bachaalany(\s*-\s*)?/i;

/* ================= Définition de la structure du nouveau site ================= */

const SECTIONS = [
  {
    id: "5eme-2025", slug: "5eme-2025", file: "5eme-2025.json",
    label: "5ème", short: "5e", year: "2025-2026", archived: false,
    color: "#0d9268", colorSoft: "#e2f6ee",
    tagline: "Programme 2025-2026 — cybersécurité et culture numérique.",
    rootPath: "5ème-2025-2026",
    sequences: [
      {
        src: "5ème-2025-2026/séquence-1-cybersécurité-2025-2026",
        slug: "sequence-1-cybersecurite", eyebrow: "Séquence 1", title: "Cybersécurité",
        tagline: "Exploiter les outils numériques, protéger ses données et agir face à la cyberviolence.",
      },
    ],
  },
  {
    id: "4eme-2025", slug: "4eme-2025", file: "4eme-2025.json",
    label: "4ème", short: "4e", year: "2025-2026", archived: false,
    color: "#2050d0", colorSoft: "#e7edfc",
    tagline: "Programme 2025-2026 — intelligence artificielle générative et sécurité des données.",
    rootPath: "4ème-2025-2026",
    sequences: [
      {
        src: "4ème-2025-2026/séquence-0lia-générative-comme-assistant-personnel",
        slug: "sequence-0-ia-generative", eyebrow: "Séquence 0", title: "L'IA générative comme assistant personnel",
        tagline: "Découvrir l'IA générative et l'utiliser de façon pertinente et responsable.",
      },
      {
        src: "4ème-2025-2026/séquence-1-intelligence-artificielle-générative-la-sécurité-des-données",
        slug: "sequence-1-ia-securite", eyebrow: "Séquence 1", title: "IA générative et sécurité des données",
        tagline: "Objets connectés, données personnelles et usage du numérique sans danger.",
      },
    ],
  },
  {
    id: "snt", slug: "snt", file: "snt.json",
    label: "2nde SNT", short: "SNT", year: "", archived: false,
    color: "#d9640f", colorSoft: "#fdeede",
    tagline: "Sciences Numériques et Technologie — seconde générale et technologique.",
    rootPath: "2nde-snt",
    sequences: [
      { src: "2nde-snt/thème-2-internet", slug: "theme-2-internet", eyebrow: "Thème 2", title: "Internet",
        tagline: "TCP/IP, routage, DNS et réseaux pair-à-pair." },
      { src: "2nde-snt/thème-3-web", slug: "theme-3-web", eyebrow: "Thème 3", title: "Le Web",
        tagline: "Histoire, fonctionnement et écriture des pages web en HTML/CSS." },
      { src: "2nde-snt/thème-4-photographie-numérique", slug: "theme-4-photographie", eyebrow: "Thème 4", title: "La photographie numérique",
        tagline: "De l'œil au capteur numérique, formats et traitement des images." },
      { src: "2nde-snt/thème-5-géolocalisation", slug: "theme-5-geolocalisation", eyebrow: "Thème 5", title: "Localisation et cartographie",
        tagline: "Bases de la cartographie, géolocalisation par satellite et protocole NMEA." },
      { src: "2nde-snt/tp-arduino", slug: "tp-arduino", eyebrow: "TP", title: "TP Arduino",
        tagline: "Travaux pratiques d'électronique programmée avec Arduino." },
    ],
  },
  {
    id: "sicit", slug: "sicit", file: "sicit.json",
    label: "SI · CIT", short: "SI", year: "", archived: false,
    color: "#0d8e9c", colorSoft: "#e0f5f7",
    tagline: "Sciences de l'Ingénieur & Création et Innovation Technologiques.",
    rootPath: "sicit",
    sequences: [],
  },
  {
    id: "arch-5eme", slug: "archives/5eme", file: "arch-5eme.json",
    label: "5ème", short: "5e", year: "2020-2024", archived: true,
    color: "#0d9268", colorSoft: "#e2f6ee",
    tagline: "Séquences 2020-2024 : tri des déchets, systèmes automatiques, habitat et programmation.",
    rootPath: "5ème",
    sequences: [
      { src: "5ème/séquence-1-préserver-les-ressources", slug: "sequence-1-preserver-les-ressources", eyebrow: "Séquence 1", title: "Préserver les ressources",
        tagline: "Le tri des déchets et une application smartphone pour aider les usagers." },
      { src: "5ème/séquence-2-éclairage-automatique", slug: "sequence-2-eclairage-automatique", eyebrow: "Séquence 2", title: "Éclairage automatique",
        tagline: "Capteurs, actionneurs et programmation d'un système automatique." },
      { src: "5ème/séquence-3-vivre-dans-une-boite", slug: "sequence-3-vivre-dans-une-boite", eyebrow: "Séquence 3", title: "Vivre dans une boîte",
        tagline: "Concevoir un habitat container : cahier des charges, solutions techniques, modélisation 3D." },
      { src: "5ème/séquence-4-animal-sounds-for-kids", slug: "sequence-4-animal-sounds", eyebrow: "Séquence 4", title: "Animal sounds for kids",
        tagline: "Projet de programmation d'une application sonore pour enfants." },
      { src: "5ème/eval-assr1", slug: "assr-1", eyebrow: "Évaluation", title: "ASSR 1",
        tagline: "Préparation et évaluations pour l'attestation scolaire de sécurité routière (niveau 1)." },
    ],
  },
  {
    id: "arch-4eme", slug: "archives/4eme", file: "arch-4eme.json",
    label: "4ème", short: "4e", year: "2020-2024", archived: true,
    color: "#2050d0", colorSoft: "#e7edfc",
    tagline: "Séquences 2020-2024 : réseaux, automatismes, micro:bit et Arduino.",
    rootPath: "4ème",
    sequences: [
      { src: "4ème/séquence-1-le-réseau-informatique", slug: "sequence-1-reseau-informatique", eyebrow: "Séquence 1", title: "Le réseau informatique",
        tagline: "Découvrir le réseau du collège, les adresses IP et le partage de ressources." },
      { src: "4ème/séquence-2-portail-automatisé", slug: "sequence-2-portail-automatise", eyebrow: "Séquence 2", title: "Portail automatisé",
        tagline: "Étude du besoin et des contraintes d'un portail automatique." },
      { src: "4ème/séquence-3-les-objets-connectés", slug: "sequence-3-objets-connectes", eyebrow: "Séquence 3", title: "Les objets connectés",
        tagline: "Piloter un objet technique avec un smartphone." },
      { src: "4ème/séquence-4-programmer-un-ordinateur-de-poche", slug: "sequence-4-microbit", eyebrow: "Séquence 4", title: "Programmer un ordinateur de poche",
        tagline: "Défis de programmation avec la carte micro:bit." },
      { src: "4ème/séquence-5-comment-simuler-le-fonctionnement-dun-feu-tricolore-arduino", slug: "sequence-5-feu-tricolore-arduino", eyebrow: "Séquence 5", title: "Feu tricolore avec Arduino",
        tagline: "Simuler le fonctionnement d'un feu tricolore : structure, algorithme et programmation." },
      { src: "4ème/séquence-6-serre-autonome", slug: "sequence-6-serre-autonome", eyebrow: "Séquence 6", title: "Serre autonome",
        tagline: "Analyse fonctionnelle, modélisation 3D et programmation d'une serre autonome." },
      { src: "4ème/chaines-fonctionnelles", slug: "chaines-fonctionnelles", eyebrow: "Compléments", title: "Chaînes fonctionnelles",
        tagline: "Exercices et corrections sur les chaînes d'information et d'énergie." },
      { src: "4ème/olympiades-informatique", slug: "olympiades-informatique", eyebrow: "Concours", title: "Olympiades d'informatique",
        tagline: "S'entraîner avec les épreuves des olympiades d'informatique." },
    ],
  },
  {
    id: "arch-3eme", slug: "archives/3eme", file: "arch-3eme.json",
    label: "3ème", short: "3e", year: "2020-2024", archived: true,
    color: "#7c3aed", colorSoft: "#f1e9fe",
    tagline: "Séquences 2020-2024 : objets connectés, intelligence artificielle, réseaux et DNB.",
    rootPath: "3ème",
    sequences: [
      { src: "3ème/séquence-1-la-poubelle-connectée", slug: "sequence-1-poubelle-connectee", eyebrow: "Séquence 1", title: "La poubelle connectée",
        tagline: "Fonctionnement, modélisation 3D, prototype Arduino et simulation Tinkercad." },
      { src: "3ème/séquence-2-intelligence-artificielle", slug: "sequence-2-intelligence-artificielle", eyebrow: "Séquence 2", title: "Intelligence artificielle",
        tagline: "Comprendre l'IA et entraîner un modèle avec Teachable Machine." },
      { src: "3ème/séquence-3-réseau-informatique", slug: "sequence-3-reseau-informatique", eyebrow: "Séquence 3", title: "Réseau informatique",
        tagline: "Architecture des réseaux, du domicile à Internet." },
      { src: "3ème/assr2-pix", slug: "assr-2-pix", eyebrow: "Évaluation", title: "ASSR 2 · Pix",
        tagline: "Préparation aux certifications ASSR 2 et Pix." },
      { src: "3ème/sessions-dnb", slug: "sessions-dnb", eyebrow: "DNB", title: "Sessions DNB",
        tagline: "Préparation à l'épreuve de sciences du brevet." },
      { src: "3ème/chaines-fonctionnelles", slug: "chaines-fonctionnelles", eyebrow: "Compléments", title: "Chaînes fonctionnelles",
        tagline: "Synthèse sur les chaînes d'information et d'énergie." },
      { src: "3ème/fonctions-techniques-solutions-techniques", slug: "fonctions-solutions-techniques", eyebrow: "Compléments", title: "Fonctions et solutions techniques",
        tagline: "Distinguer fonction technique et solution technique." },
    ],
  },
];

/* ================= Table de correspondance des URLs ================= */

// ancien chemin (avec accents) -> nouvelle URL depuis la racine
const urlMap = new Map();

function registerUrls() {
  for (const sec of SECTIONS) {
    if (sec.rootPath) urlMap.set(sec.rootPath, `${sec.slug}/`);
    for (const seq of sec.sequences) {
      urlMap.set(seq.src, `${sec.slug}/${seq.slug}/`);
      for (const p of PATHS) {
        if (p.startsWith(seq.src + "/")) {
          urlMap.set(p, `${sec.slug}/${seq.slug}/${pageSlug(p, seq)}/`);
        }
      }
    }
  }
  urlMap.set("home", "");
}

/* ================= Aides ================= */

const TYPO_FIXES = [
  [/techiques/gi, "techniques"],
  [/boussolle/gi, "boussole"],
  [/maching/gi, "machine"],
  [/zonde/gi, "zone"],
  [/\bparite\b/gi, "partie"],
  [/(\d)\s*\(\s*corr\.?\s*\)\s*:?\s*/gi, "$1 (correction) : "],
];

function cleanTitle(t) {
  let s = String(t || "").replace(SITE_PREFIX, "").trim();
  for (const [re, rep] of TYPO_FIXES) s = s.replace(re, rep);
  // espace après « Séance N: »
  s = s.replace(/^(Séance\s*\d+)\s*\(?corr\)?\s*[:.]?\s*/i, (m, p1) => "");
  return s.trim();
}

function rawTitle(t) {
  let s = String(t || "").replace(SITE_PREFIX, "").trim();
  for (const [re, rep] of TYPO_FIXES) s = s.replace(re, rep);
  return s;
}

function lastSeg(p) {
  return p.split("/").pop();
}

/** Déduit type + numéro + slug d'une page à partir de son segment d'URL. */
function pageMeta(p) {
  const seg = lastSeg(p).toLowerCase();
  const numMatch = seg.match(/s[ée]ance-?(\d+)/);
  const num = numMatch ? Number(numMatch[1]) : null;
  const isCorr = /corr/.test(seg);
  let kind, slug;
  if (num !== null && isCorr) { kind = "correction"; slug = `seance-${num}-corr`; }
  else if (num !== null) { kind = "seance"; slug = `seance-${num}`; }
  else if (/^correction/.test(seg)) { kind = "correction"; slug = "correction"; }
  else if (/synth[eè]se|fiche/.test(seg)) { kind = "synthese"; slug = keyOf(seg); }
  else if (/^ressources/.test(seg)) { kind = "ressources"; slug = "ressources"; }
  else if (/assr|pix|dnb|eval/.test(seg)) { kind = "evaluation"; slug = keyOf(seg); }
  else { kind = "annexe"; slug = keyOf(seg); }
  return { kind, num, slug };
}

function pageSlug(p, seq) {
  return pageMeta(p).slug;
}

function detectKindFromUrl(url) {
  if (/drive\.google\.com\/file/.test(url)) return "drive-file";
  if (/docs\.google\.com\/presentation/.test(url)) return "slides";
  if (/docs\.google\.com\/document/.test(url)) return "document";
  if (/docs\.google\.com\/spreadsheets/.test(url)) return "sheet";
  if (/docs\.google\.com\/forms/.test(url)) return "form";
  if (/youtu\.?be/.test(url)) return "youtube";
  if (/learningapps|genial|scratch\.mit|makecode|tinkercad|quizizz|kahoot|app\.?inventor/i.test(url)) return "interactive-app";
  return "external";
}

/** Nettoie une URL héritée du parsing (s'applique aussi à un texte entier). */
function fixUrl(u) {
  return u
    .replace(/https?:\/\/www\.google\.com\/url\?q=([^&)\s]+)[^)\s]*/g, (m, q) => {
      try { return decodeURIComponent(q); } catch { return m; }
    })
    .replace(/view&usp=/g, "view?usp=")
    .replace(/&amp;/g, "&")
    .replace(/[?&]authuser=0/g, "");
}

/** Réécrit les liens internes vers le nouveau site ; compresse les pointillés. */
function cleanParagraph(md) {
  let s = md;
  // le contenu des cours peut contenir du code HTML littéral : ne pas
  // le laisser s'interpréter comme de vraies balises
  s = s.replace(/</g, "&lt;");
  // pointillés de réponse
  s = s.replace(/(\.\s?){6,}/g, " …………………………… ");
  s = s.replace(/\.{4,}/g, " …………………………… ");
  s = s.replace(/…{3,}/g, "……………………………");
  s = s.replace(/(……………………………\s*)+/g, "…………………………… ");
  // liens internes -> nouveau site
  s = s.replace(/\((?:https:\/\/sites\.google\.com)?\/view\/lmtechno25\/([^)]+)\)/g, (m, p1) => {
    let decoded;
    try { decoded = decodeURIComponent(p1); } catch { decoded = p1; }
    decoded = decoded.replace(/\/$/, "").replace(/[?#].*$/, "");
    const mapped = urlMap.get(decoded);
    return mapped !== undefined ? `(ROOT/${mapped})` : `(https://sites.google.com/view/lmtechno25/${p1})`;
  });
  return s.replace(/[ \t]{2,}/g, " ").trim();
}

/** Un paragraphe qui n'est qu'un lien de navigation interne ? */
function isPureNavLink(md) {
  const m = md.trim().match(/^\[([^\]]*)\]\(([^)]*)\)$/);
  if (!m) return false;
  return /ROOT\/|\/view\/lmtechno25\//.test(m[2]);
}

function cleanEmbedLabel(label) {
  return (label || "")
    .replace(/^(YouTube Video|Presentation|Document|Spreadsheet|Drive|PDF|Google Docs)[,:]?\s*/i, "")
    .trim();
}

/* ================= Conversion blocs -> markdown ================= */

function blocksToMd(blocks, pageTitle, opts = {}) {
  const md = [];
  const resources = [];
  let firstH1Dropped = false;
  let skipUntilHeading = false;

  const titleNorm = (pageTitle || "").toLowerCase().replace(/\W+/g, "");

  for (const b of blocks) {
    if (/^h[1-6]$/.test(b.type)) {
      let text = b.md.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
      for (const [re, rep] of TYPO_FIXES) text = text.replace(re, rep);
      const norm = text.toLowerCase().replace(/\W+/g, "");
      skipUntilHeading = false;
      // titre de page dupliqué
      if (!firstH1Dropped && b.type === "h1" && (titleNorm.includes(norm) || norm.includes(titleNorm))) {
        firstH1Dropped = true;
        continue;
      }
      // « Contenu de la séquence » : liste régénérée par le site
      if (/contenu de la s[ée]quence/i.test(text)) { skipUntilHeading = true; continue; }
      if (!text) continue;
      const level = b.type === "h1" ? "##" : b.type === "h2" ? "##" : b.type === "h3" ? "###" : "####";
      md.push(`${level} ${text}`);
      continue;
    }
    if (skipUntilHeading && (b.type === "p" || b.type === "ul" || b.type === "ol")) {
      if (b.type === "p" && !isPureNavLink(b.md) && b.md.trim().length > 120) {
        // du vrai contenu : on arrête de sauter
        skipUntilHeading = false;
      } else {
        continue;
      }
    }
    if (b.type === "p") {
      let s = cleanParagraph(fixUrl(b.md));
      if (!s || isPureNavLink(s)) continue;
      collectResources(s, resources);
      md.push(s);
      continue;
    }
    if (b.type === "ul" || b.type === "ol") {
      const items = b.items
        .map((it) => cleanParagraph(fixUrl(it)))
        .filter((it) => it && !isPureNavLink(it));
      if (!items.length) continue;
      items.forEach((it, i) => {
        collectResources(it, resources);
        md.push(b.type === "ul" ? `- ${it}` : `${i + 1}. ${it}`);
      });
      md.push("");
      continue;
    }
    if (b.type === "img") {
      const src = b.local || b.src;
      md.push(`![${(b.alt || "").replace(/[\[\]]/g, "")}](${src})`);
      continue;
    }
    if (b.type === "embed") {
      const label = cleanEmbedLabel(b.label);
      md.push(`::embed[${label.replace(/[\[\]]/g, "")}](${fixUrl(b.src)})`);
      continue;
    }
    if (b.type === "table") {
      const rows = b.rows.map((r) => r.map((c) => cleanParagraph(fixUrl(c || ""))));
      if (!rows.length) continue;
      const head = rows[0];
      md.push(`| ${head.join(" | ")} |`);
      md.push(`| ${head.map(() => "---").join(" | ")} |`);
      rows.slice(1).forEach((r) => md.push(`| ${r.join(" | ")} |`));
      md.push("");
      continue;
    }
  }
  return { content_md: md.join("\n\n").replace(/\n{3,}/g, "\n\n").trim(), resources: dedupeRes(resources) };
}

function collectResources(mdText, out) {
  const re = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
  let m;
  while ((m = re.exec(mdText))) {
    const url = fixUrl(m[2]);
    const kind = detectKindFromUrl(url);
    if (kind === "external") continue; // liens de cours ordinaires : restent dans le texte
    if (/sites\.google\.com/.test(url)) continue;
    out.push({ kind, title: m[1].replace(/\*\*/g, "").trim(), url, embed: false });
  }
}

function dedupeRes(arr) {
  const seen = new Set();
  return arr.filter((r) => {
    const k = r.url.replace(/[?#].*$/, "");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* ================= Chargement des pages analysées ================= */

function loadParsed(p) {
  const f = path.join(PARSED, keyOf(p) + ".json");
  if (!fs.existsSync(f)) return null;
  return JSON.parse(fs.readFileSync(f, "utf8"));
}

/* ================= Assemblage ================= */

registerUrls();

let pageCount = 0;
const usedPaths = new Set(["home"]);

for (const sec of SECTIONS) {
  const data = {
    id: sec.id,
    label: sec.label,
    year: sec.year,
    archived: sec.archived,
    tagline: sec.tagline,
    intro_md: "",
    resources: [],
    sequences: [],
  };

  // Page racine de la section (souvent de simples tuiles -> intro éventuelle)
  const rootParsed = sec.rootPath ? loadParsed(sec.rootPath) : null;
  if (rootParsed) {
    usedPaths.add(sec.rootPath);
    const { content_md, resources } = blocksToMd(rootParsed.blocks, rawTitle(rootParsed.title));
    data.intro_md = content_md;
    data.resources = resources;
  }

  for (const seqDef of sec.sequences) {
    const seqParsed = loadParsed(seqDef.src);
    usedPaths.add(seqDef.src);
    const seq = {
      slug: seqDef.slug,
      eyebrow: seqDef.eyebrow,
      title: seqDef.title,
      shortTitle: seqDef.title,
      tagline: seqDef.tagline,
      intro_md: "",
      resources: [],
      pages: [],
    };
    if (seqParsed) {
      const { content_md, resources } = blocksToMd(seqParsed.blocks, rawTitle(seqParsed.title));
      seq.intro_md = content_md;
      seq.resources = resources;
    }

    for (const p of PATHS) {
      if (!p.startsWith(seqDef.src + "/")) continue;
      usedPaths.add(p);
      const parsed = loadParsed(p);
      if (!parsed) { console.warn("page analysée manquante:", p); continue; }
      const meta = pageMeta(p);
      const title = rawTitle(parsed.title) || lastSeg(p);
      const { content_md, resources } = blocksToMd(parsed.blocks, title);
      const shortTitle =
        meta.kind === "seance" && meta.num !== null ? `Séance ${meta.num}` :
        meta.kind === "correction" && meta.num !== null ? `Séance ${meta.num} — correction` :
        meta.kind === "correction" ? "Correction" :
        title.length > 42 ? title.slice(0, 40).trim() + "…" : title;
      seq.pages.push({
        slug: meta.slug,
        kind: meta.kind,
        num: meta.num,
        title,
        shortTitle,
        tagline: "",
        content_md,
        resources,
        srcUrl: `https://sites.google.com/view/lmtechno25/${p}`,
      });
      pageCount++;
    }
    data.sequences.push(seq);
  }

  fs.writeFileSync(path.join(OUT, "sections", sec.file), JSON.stringify(data, null, 2), "utf8");
}

/* ------- site.json (accueil, navigation, programme officiel) ------- */

const home = loadParsed("home");
const programmeResources = [];
if (home) {
  for (const b of home.blocks) {
    if (b.type === "embed") {
      const url = fixUrl(b.src);
      programmeResources.push({
        kind: detectKindFromUrl(url),
        title: cleanEmbedLabel(b.label) || "Document",
        url,
      });
    }
  }
}

const site = {
  title: "Technologie & SNT",
  teacher: "M. Eddy Bachaalany",
  school: "Lycée Montaigne, Beit Chabab",
  schoolYear: "2025-2026",
  year: "2025-2026",
  description:
    "Les cours de Technologie (collège) et de SNT (lycée) de M. Eddy Bachaalany — Lycée Montaigne, Beit Chabab. Séquences, séances, corrections et ressources.",
  heroText:
    "Toutes les séquences, séances, corrections et ressources pour le collège (5ème, 4ème, 3ème) et le lycée (2nde SNT) — organisées, consultables et imprimables.",
  footerText:
    "Site pédagogique regroupant les cours, activités et ressources de Technologie du collège et de SNT du lycée.",
  programmeIntro:
    "De **nouveaux programmes de Technologie** s'appliquent au cycle 4 depuis la rentrée 2024. Les documents ci-dessous présentent les thèmes et les compétences du nouveau programme.",
  programmeResources,
  footerLinks: [
    { label: "Programme de Technologie (Eduscol)", url: "https://eduscol.education.fr/2098/technologie-au-cycle-4" },
    { label: "Programme SNT (Eduscol)", url: "https://eduscol.education.fr/3016/sciences-numeriques-et-technologie-au-lycee" },
    { label: "Pix — compétences numériques", url: "https://pix.fr" },
    { label: "Site d'origine (Google Sites)", url: "https://sites.google.com/view/lmtechno25" },
  ],
  sections: SECTIONS.map((s) => ({
    id: s.id, slug: s.slug, file: s.file, label: s.label, short: s.short,
    year: s.year, archived: s.archived, color: s.color, colorSoft: s.colorSoft,
  })),
};

fs.writeFileSync(path.join(OUT, "site.json"), JSON.stringify(site, null, 2), "utf8");

/* ------- SI/CIT : contenu de section simple ------- */
const sicit = loadParsed("sicit");
if (sicit) {
  const f = path.join(OUT, "sections", "sicit.json");
  const data = JSON.parse(fs.readFileSync(f, "utf8"));
  const { content_md, resources } = blocksToMd(sicit.blocks, rawTitle(sicit.title));
  data.intro_md = content_md;
  data.resources = resources;
  fs.writeFileSync(f, JSON.stringify(data, null, 2), "utf8");
}

/* ------- pages non couvertes ------- */
const leftovers = PATHS.filter((p) => !usedPaths.has(p) && p !== "sicit");
if (leftovers.length) {
  console.warn(`\nPages non rattachées (${leftovers.length}) :`);
  leftovers.forEach((p) => console.warn("  -", p));
}

console.log(`\n✔ Modèle de contenu écrit : ${SECTIONS.length} sections, ${pageCount} pages de cours.`);
