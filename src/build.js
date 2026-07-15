#!/usr/bin/env node
/**
 * Générateur du site « Technologie & SNT » — M. Eddy Bachaalany
 *
 * Lit le contenu depuis content/ (JSON) et produit le site statique dans docs/
 * (servi par GitHub Pages).
 *
 *   node src/build.js
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

const ROOT = path.join(__dirname, "..");
const CONTENT = path.join(ROOT, "content");
const OUT = path.join(ROOT, "docs");
const SITE_URL = "https://ebechalani.github.io/techno/";

/* ---------------- Utilitaires ---------------- */

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function md(src) {
  if (!src) return "";
  // directive ::rgbmixer -> mélangeur de couleurs interactif (synthèse additive)
  src = src.replace(/^::rgbmixer$/gm, () => renderRgbMixer());
  // directives ::embed[Titre](url) -> intégration (iframe) en place
  src = src.replace(/^::embed\[([^\]]*)\]\(([^)]+)\)$/gm, (m, title, url) => {
    const html = renderEmbed({ title, url });
    return html ? `\n${html}\n` : `[${title || "Document"}](${url})`;
  });
  const renderer = new marked.Renderer();
  const linkFn = renderer.link.bind(renderer);
  renderer.link = function (token) {
    let html = linkFn(token);
    if (/^https?:\/\//.test(token.href || "")) {
      html = html.replace("<a ", '<a target="_blank" rel="noopener" ');
    }
    return html;
  };
  return marked.parse(src, { renderer, mangle: false, headerIds: false });
}

/**
 * Rend une page interactive : les lignes de pointillés (zones de réponse
 * des fiches d'activité) deviennent des champs de saisie que l'élève peut
 * remplir ; ses réponses sont enregistrées dans son navigateur.
 */
function interactivize(html) {
  let idx = 0;
  const out = html.replace(/(?:<p>[\s…]*…[\s…]*<\/p>\s*)+/g, (m) => {
    const count = (m.match(/<p>/g) || []).length;
    const rows = Math.min(1 + count * 2, 8);
    return `<div class="answer-field">
  <textarea rows="${rows}" data-answer-idx="${idx++}" placeholder="✏️ Écris ta réponse ici…" aria-label="Zone de réponse de l'élève"></textarea>
</div>\n`;
  });
  return { html: out, fields: idx };
}

/** QCM auto-corrigés d'une page (définis dans content/quiz/<section>.json). */
function renderQuiz(quiz) {
  if (!quiz || !quiz.length) return "";
  const qHtml = quiz
    .map((q, i) => {
      const opts = q.options
        .map(
          (o, j) => `
        <label class="qq-opt"><input type="radio" name="q${i}" value="${j}"><span>${esc(o)}</span></label>`
        )
        .join("");
      return `
    <div class="quiz-q" data-ok="${q.answer}"${q.explain ? ` data-explain="${esc(q.explain)}"` : ""}>
      <p class="qq-text">${i + 1}. ${esc(q.q)}</p>
      <div class="qq-opts">${opts}
      </div>
      <button class="btn btn-ghost qq-check" type="button">Vérifier ma réponse</button>
      <div class="qq-feedback" aria-live="polite"></div>
    </div>`;
    })
    .join("\n");
  return `
<section class="quiz" id="quiz">
  <h2>🧠 Teste tes connaissances</h2>
  <p class="quiz-hint">Réponds aux questions puis clique sur « Vérifier » — la correction s'affiche aussitôt.</p>
  ${qHtml}
  <div class="quiz-score" aria-live="polite"></div>
</section>`;
}

/** Barre d'outils élève (pages avec zones de réponse ou quiz). */
function studentBar() {
  return `
<div class="student-bar">
  <span class="sb-info">💾 Tes réponses sont enregistrées automatiquement sur cet appareil.</span>
  <span class="sb-actions">
    <button class="btn btn-ghost btn-sm" id="print-answers" type="button">🖨 Imprimer / PDF</button>
    <button class="btn btn-ghost btn-sm" id="clear-answers" type="button">🗑 Tout effacer</button>
  </span>
</div>`;
}

/** Résout les chemins internes (images auto-hébergées, liens ROOT/) selon la profondeur. */
function relativize(html, rel) {
  return html
    .replace(/src="assets\//g, `src="${rel}assets/`)
    .replace(/href="assets\//g, `href="${rel}assets/`)
    .replace(/href="ROOT\//g, `href="${rel}`)
    .replace(/\(ROOT\//g, `(${rel}`);
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function write(rel, html) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, html, "utf8");
}

function stripMd(s) {
  return String(s || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~\[\]()|-]/g, " ")
    .replace(/!\S+/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* ---------------- Intégrations (embeds) ---------------- */

/** Transforme une URL de ressource en URL intégrable + type d'affichage. */
function embedInfo(res) {
  const url = res.url || "";
  let m;

  if ((m = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/)))
    return { cls: "embed-doc", src: `https://drive.google.com/file/d/${m[1]}/preview`, kindLabel: "Document PDF" };

  if ((m = url.match(/docs\.google\.com\/presentation\/d\/(?:e\/)?([\w-]+)/)))
    return { cls: "embed-doc", src: `https://docs.google.com/presentation/d/${m[1]}/embed?start=false&loop=false&delayms=60000`, kindLabel: "Présentation" };

  if ((m = url.match(/docs\.google\.com\/document\/d\/(?:e\/)?([\w-]+)/)))
    return { cls: "embed-doc", src: `https://docs.google.com/document/d/${m[1]}/preview`, kindLabel: "Document" };

  if ((m = url.match(/docs\.google\.com\/spreadsheets\/d\/(?:e\/)?([\w-]+)/)))
    return { cls: "embed-doc", src: `https://docs.google.com/spreadsheets/d/${m[1]}/preview`, kindLabel: "Tableur" };

  if ((m = url.match(/docs\.google\.com\/forms\/d\/e\/([\w-]+)/)))
    return { cls: "embed-app", src: `https://docs.google.com/forms/d/e/${m[1]}/viewform?embedded=true`, kindLabel: "Formulaire" };

  if ((m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/)))
    return { cls: "embed-video", src: `https://www.youtube-nocookie.com/embed/${m[1]}`, kindLabel: "Vidéo" };

  if ((m = url.match(/learningapps\.org\/(?:watch\?(?:app|v)=)?(\d+)/)))
    return { cls: "embed-app", src: `https://learningapps.org/watch?app=${m[1]}`, kindLabel: "Application interactive" };

  if (/view\.genial\.ly\/|genially/.test(url) && (m = url.match(/view\.genial\.ly\/([\w-]+)/)))
    return { cls: "embed-app", src: `https://view.genial.ly/${m[1]}`, kindLabel: "Genially" };

  return null;
}

function resIcon(kind) {
  switch (kind) {
    case "drive-file": return ["res-pdf", "📄", "PDF / Document"];
    case "slides": return ["res-slides", "🖥️", "Présentation"];
    case "document": return ["res-doc", "📝", "Document"];
    case "sheet": return ["res-doc", "📊", "Tableur"];
    case "form": return ["res-app", "🗳️", "Formulaire / Quiz"];
    case "youtube": return ["res-video", "🎬", "Vidéo"];
    case "interactive-app": return ["res-app", "🧩", "Application interactive"];
    case "image": return ["res-link", "🖼️", "Image"];
    default: return ["res-link", "🔗", "Lien externe"];
  }
}

function renderEmbed(res) {
  const info = embedInfo(res);
  if (!info) return "";
  const title = res.title || info.kindLabel;
  return `
<figure class="embed ${info.cls}">
  <div class="embed-bar">
    <span class="embed-kind">${esc(info.kindLabel)}</span>
    <span class="embed-title">${esc(title)}</span>
    <a class="embed-open" href="${esc(res.url)}" target="_blank" rel="noopener">Ouvrir ↗</a>
  </div>
  <div class="embed-frame"><iframe data-src="${esc(info.src)}" loading="lazy" allowfullscreen allow="autoplay; fullscreen" title="${esc(title)}"></iframe></div>
</figure>`;
}

/** Mélangeur de couleurs RVB interactif (synthèse additive). Piloté par client.js. */
function renderRgbMixer() {
  const ch = (c, label, val) =>
    `<label class="rgb-ch rgb-${c}"><span>${label}</span><input type="range" min="0" max="255" value="${val}" data-rgb="${c}"><output>${val}</output></label>`;
  return `<div class="rgb-mixer" data-rgb-mixer><div class="rgb-preview" data-rgb-preview></div><div class="rgb-controls">${ch("r", "Rouge", 128)}${ch("v", "Vert", 128)}${ch("b", "Bleu", 128)}<div class="rgb-readout">Code RVB : <strong data-rgb-code>128, 128, 128</strong></div></div></div>`;
}

function renderResCard(res) {
  const [cls, icon, label] = resIcon(res.kind);
  return `
<a class="res-card ${cls}" href="${esc(res.url)}" target="_blank" rel="noopener">
  <span class="res-icon">${icon}</span>
  <span class="res-info">
    <span class="res-title">${esc(res.title || label)}</span>
    <span class="res-kind">${esc(label)}</span>
  </span>
</a>`;
}

/** Bloc ressources d'une page : intégrations d'abord, cartes ensuite. */
function renderResources(resources, { heading = "Documents de la séance" } = {}) {
  if (!resources || !resources.length) return "";
  const embeds = [];
  const cards = [];
  for (const r of resources) {
    if (r.embed !== false && embedInfo(r)) embeds.push(renderEmbed(r));
    else cards.push(renderResCard(r));
  }
  let html = "";
  if (embeds.length) html += `<section class="resources"><h2>${esc(heading)}</h2>${embeds.join("\n")}</section>`;
  if (cards.length) html += `<section class="resources"><h2>Liens et ressources</h2><div class="res-grid">${cards.join("\n")}</div></section>`;
  return html;
}

/* ---------------- Gabarit de page ---------------- */

function navHTML(site, rel, currentSectionId) {
  const link = (s) =>
    `<a href="${rel}${s.slug}/" style="--dot:${s.color}"${s.id === currentSectionId ? ' aria-current="true"' : ""}>${esc(s.label)}${s.year ? ` <small>· ${esc(s.year)}</small>` : ""}</a>`;

  return `
<nav class="main-nav" id="main-nav" aria-label="Navigation principale">
  <a href="${rel}index.html"${currentSectionId === "home" ? ' aria-current="true"' : ""}>Accueil</a>
  ${site.sections.map(link).join("\n  ")}
  <a class="nav-account" href="${rel}connexion/">👤 Espace</a>
</nav>`;
}

function layout({ site, rel, title, description, body, sectionId, extraHead = "" }) {
  const fullTitle = title ? `${title} — ${site.title}` : `${site.title} · ${site.school}`;
  const html = `<!DOCTYPE html>
<html lang="fr" data-base="${rel}" data-section="${esc(sectionId || "")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || site.description)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description || site.description)}">
<meta property="og:type" content="website">
<link rel="icon" href="${rel}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lexend:wght@500;600;700;800&family=Caveat:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${rel}assets/styles.css">
<script>
(function(){try{var t=localStorage.getItem("lmtechno-theme");if(!t)t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t);}catch(e){}})();
(function(){try{var s=JSON.parse(localStorage.getItem("lmtechno-eleve")||"null");if(!s||!s.section)return;var d=document.documentElement,cur=d.getAttribute("data-section")||"",base=d.getAttribute("data-base")||"./";if(cur==="home"||(cur&&cur!==s.section))location.replace(base+s.section+"/");}catch(e){}})();
</script>
<script src="${rel}assets/firebase-config.js"></script>
${extraHead}
</head>
<body>
<a class="skip-link" href="#contenu">Aller au contenu</a>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="${rel}index.html">
      <span class="brand-logo">T</span>
      <span>Technologie <span style="color:var(--muted);font-weight:500">&amp;</span> SNT
        <small>${esc(site.school)}</small>
      </span>
    </a>
    ${navHTML(site, rel, sectionId)}
    <div class="header-actions">
      <button class="search-btn" id="search-open" type="button" aria-label="Rechercher">
        <span>🔍</span><span class="label">Rechercher</span><kbd>Ctrl K</kbd>
      </button>
      <button class="icon-btn" id="theme-toggle" type="button" aria-label="Changer de thème">🌙</button>
      <button class="icon-btn nav-toggle" id="nav-toggle" type="button" aria-label="Menu" aria-expanded="false">☰</button>
    </div>
  </div>
</header>
<main id="contenu">
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-grid">
    <div>
      <h4>${esc(site.title)}</h4>
      <p>${esc(site.footerText)}</p>
    </div>
    <div>
      <h4>Niveaux</h4>
      <ul>
        ${site.sections.map((s) => `<li><a href="${rel}${s.slug}/">${esc(s.label)}${s.year ? " · " + esc(s.year) : ""}</a></li>`).join("\n        ")}
      </ul>
    </div>
    <div>
      <h4>Références</h4>
      <ul>
        ${(site.footerLinks || []).map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a></li>`).join("\n        ")}
      </ul>
    </div>
  </div>
  <div class="wrap footer-bottom">
    <span>© ${esc(site.teacher)} · ${esc(site.school)}</span>
    <span>Cours de Technologie collège &amp; SNT lycée</span>
  </div>
</footer>
<div class="search-overlay" id="search-overlay" role="dialog" aria-label="Recherche">
  <div class="search-panel">
    <div class="search-input-row">
      <span>🔍</span>
      <input id="search-input" type="search" placeholder="Rechercher une séquence, une séance, une notion…" autocomplete="off">
      <kbd>Échap</kbd>
    </div>
    <div class="search-results" id="search-results"></div>
  </div>
</div>
<button class="back-to-top" id="back-to-top" type="button" aria-label="Retour en haut">↑</button>
<script src="${rel}assets/client.js" defer></script>
</body>
</html>`;
  return relativize(html, rel);
}

/* ---------------- Aides de rendu ---------------- */

function breadcrumbs(rel, items) {
  const parts = items
    .map((it, i) =>
      i === items.length - 1
        ? `<span class="current">${esc(it.label)}</span>`
        : `<a href="${it.href}">${esc(it.label)}</a><span class="sep">›</span>`
    )
    .join("\n    ");
  return `<nav class="breadcrumbs wrap" aria-label="Fil d'Ariane">\n    <a href="${rel}index.html">Accueil</a><span class="sep">›</span>\n    ${parts}\n  </nav>`;
}

function pageKindBadge(page) {
  switch (page.kind) {
    case "correction": return '<span class="badge badge-corr">✔ Correction</span>';
    case "synthese": return '<span class="badge">📌 Synthèse</span>';
    case "ressources": return '<span class="badge badge-res">📚 Ressources</span>';
    case "evaluation": return '<span class="badge badge-res">📝 Évaluation</span>';
    default: return "";
  }
}

function accentVars(color, soft) {
  return `--accent:${color};--accent-soft:${soft};`;
}

/** Sidebar : arborescence des séquences d'une section. */
function sidebarHTML(site, section, rel, sectionRel, activeSeq, activePage) {
  const seqs = section.sequences
    .map((seq) => {
      const open = activeSeq === seq.slug ? " open" : "";
      const pages = seq.pages
        .map((p) => {
          const cur = activeSeq === seq.slug && activePage === p.slug;
          return `<a href="${sectionRel}${seq.slug}/${p.slug}/"${cur ? ' aria-current="true"' : ""}>${esc(p.shortTitle || p.title)}</a>`;
        })
        .join("\n        ");
      return `<details${open}>
      <summary><a href="${sectionRel}${seq.slug}/" style="all:unset;cursor:pointer">${esc(seq.shortTitle || seq.title)}</a></summary>
      <div class="sb-pages">
        ${pages}
      </div>
    </details>`;
    })
    .join("\n    ");
  return `<aside class="sidebar" style="${accentVars(section.color, section.colorSoft)}">
    <div class="sb-title"><span class="dot"></span>${esc(section.label)} ${section.year ? "· " + esc(section.year) : ""}</div>
    <nav>
    ${seqs}
    </nav>
  </aside>`;
}

/* ---------------- Pages ---------------- */

function renderHome(site, sections) {
  const rel = "./";
  const current = sections;

  const levelCard = (s) => {
    const seqCount = s.data.sequences.length;
    const pageCount = s.data.sequences.reduce((n, q) => n + q.pages.length, 0);
    const meta = seqCount
      ? `${seqCount} séquence${seqCount > 1 ? "s" : ""} · ${pageCount} page${pageCount > 1 ? "s" : ""}`
      : "Présentation";
    return `
    <a class="level-card" href="${rel}${s.meta.slug}/" style="--card-accent:${s.meta.color};--card-accent-soft:${s.meta.colorSoft}">
      <span class="lvl-badge">${esc(s.meta.short)}</span>
      <h3>${esc(s.meta.label)}</h3>
      <p>${esc(s.data.tagline || "")}</p>
      <span class="meta">${meta}</span>
    </a>`;
  };

  const body = `
<section class="hero">
  <div class="wrap hero-inner">
    <span class="eyebrow">📚 Année scolaire ${esc(site.schoolYear)}</span>
    <h1>Les cours de <span class="accent">Technologie</span> et de <span class="accent">SNT</span></h1>
    <p class="lead">${esc(site.heroText)}</p>
    <div class="hero-actions">
      ${current.map((s) => `<a class="btn btn-primary" href="${rel}${s.meta.slug}/" style="background:${s.meta.color}">${esc(s.meta.label)}${s.meta.year ? " · " + esc(s.meta.year) : ""}</a>`).join("\n      ")}
    </div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="section-head">
      <h2>Les niveaux</h2>
      <span class="sub">Cliquez sur un niveau pour accéder à toutes ses séquences</span>
    </div>
    <div class="grid grid-levels">
      ${current.map(levelCard).join("\n      ")}
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="section-head">
      <h2>Le nouveau programme de Technologie — Cycle 4</h2>
      <span class="sub">Rentrée 2024</span>
    </div>
    <div class="prose" style="max-width:none">
      ${md(site.programmeIntro)}
    </div>
    ${renderResources(site.programmeResources, { heading: "Documents officiels et présentations" })}
  </div>
</section>`;

  write(
    "index.html",
    layout({ site, rel, title: "", description: site.description, body, sectionId: "home" })
  );
}

function renderSection(site, meta, section) {
  const depth = meta.slug.split("/").length;
  const rel = "../".repeat(depth);
  const seqCard = (seq, i) => {
    const seances = seq.pages.filter((p) => p.kind === "seance").length;
    const others = seq.pages.length - seances;
    return `
    <a class="seq-card" href="./${seq.slug}/" style="--accent:${meta.color}">
      <span class="seq-num">${esc(seq.eyebrow || `Séquence ${i + 1}`)}${seq.nouveau ? ` <span class="seq-new">✦ Nouveau</span>` : ""}</span>
      <h3>${esc(seq.title)}</h3>
      <p>${esc(seq.tagline || "")}</p>
      <span class="seq-foot">
        ${seances ? `<span>📖 ${seances} séance${seances > 1 ? "s" : ""}</span>` : ""}
        ${others ? `<span>📎 ${others} complément${others > 1 ? "s" : ""}</span>` : ""}
      </span>
    </a>`;
  };

  const body = `
${breadcrumbs(rel, [{ label: `${meta.label}${meta.year ? " · " + meta.year : ""}`, href: "./" }])}
<div class="wrap">
  <div class="page-head">
    <div class="kicker">
      <span class="badge" style="--badge-bg:${meta.colorSoft};--badge-fg:${meta.color}">${esc(meta.short)}</span>
    </div>
    <h1>${esc(meta.label)}</h1>
    <p class="desc">${esc(section.tagline || "")}</p>
  </div>
  ${section.intro_md ? `<div class="prose">${md(section.intro_md)}</div>` : ""}
  ${section.sequences.length ? `<div class="grid grid-seq" style="margin:1.8rem 0 3rem">
    ${section.sequences.map(seqCard).join("\n    ")}
  </div>` : ""}
  ${renderResources(section.resources, { heading: "Documents du niveau" })}
</div>`;

  write(
    path.join(meta.slug, "index.html"),
    layout({ site, rel, title: `${meta.label}${meta.year ? " " + meta.year : ""}`, description: section.tagline, body, sectionId: meta.id })
  );
}

function renderSequence(site, meta, section, seq, seqIndex) {
  const depth = meta.slug.split("/").length + 1;
  const rel = "../".repeat(depth);
  const sectionRel = "../";

  const item = (p, i) => {
    const num =
      p.kind === "correction" ? "✔" :
      p.kind === "ressources" ? "📚" :
      p.kind === "synthese" ? "📌" :
      p.kind === "evaluation" ? "📝" :
      String(p.num ?? i + 1);
    return `
    <a class="seance-item" href="./${p.slug}/" style="--accent:${meta.color};--accent-soft:${meta.colorSoft}">
      <span class="s-num">${num}</span>
      <span class="s-info">
        <span class="s-title">${esc(p.title)}</span>
        ${p.tagline ? `<span class="s-sub">${esc(p.tagline)}</span>` : ""}
      </span>
      <span class="s-arrow">→</span>
    </a>`;
  };

  const body = `
${breadcrumbs(rel, [
    { label: `${meta.label}${meta.year ? " · " + meta.year : ""}`, href: sectionRel },
    { label: seq.title, href: "./" },
  ])}
<div class="wrap course-layout">
  ${sidebarHTML(site, section, rel, sectionRel, seq.slug, null)}
  <article>
    <div class="page-head">
      <div class="kicker">
        <span class="badge" style="--badge-bg:${meta.colorSoft};--badge-fg:${meta.color}">${esc(meta.short)}</span>
        <span class="badge">${esc(seq.eyebrow || `Séquence ${seqIndex + 1}`)}</span>
        ${seq.nouveau ? `<span class="badge badge-new">✦ Nouveau</span>` : ""}
      </div>
      <h1>${esc(seq.title)}</h1>
      ${seq.tagline ? `<p class="desc">${esc(seq.tagline)}</p>` : ""}
    </div>
    ${seq.objectifs_md ? `<div class="callout callout-objectif"><span class="co-icon">🎯</span><div class="co-body"><div class="co-title">Objectifs de la séquence</div>${md(seq.objectifs_md)}</div></div>` : ""}
    ${seq.competences_md ? `<div class="callout callout-competence"><span class="co-icon">🧭</span><div class="co-body"><div class="co-title">Compétences travaillées</div>${md(seq.competences_md)}</div></div>` : ""}
    ${seq.intro_md ? `<div class="prose">${md(seq.intro_md)}</div>` : ""}
    ${seq.pages.length ? `<h2 style="margin-top:2rem">Déroulé de la séquence</h2>
    <div class="seance-list">
      ${seq.pages.map(item).join("\n      ")}
    </div>` : ""}
    ${renderResources(seq.resources, { heading: "Documents de la séquence" })}
  </article>
</div>`;

  write(
    path.join(meta.slug, seq.slug, "index.html"),
    layout({ site, rel, title: seq.title, description: seq.tagline, body, sectionId: meta.id })
  );
}

function renderPage(site, meta, section, seq, page, prev, next) {
  const depth = meta.slug.split("/").length + 2;
  const rel = "../".repeat(depth);
  const sectionRel = "../../";
  const interactive = interactivize(md(page.content_md));

  const pager =
    prev || next
      ? `<nav class="pager">
      ${prev ? `<a class="pg-prev" href="../${prev.slug}/"><span class="pg-label">← Précédent</span><span class="pg-title">${esc(prev.title)}</span></a>` : ""}
      ${next ? `<a class="pg-next" href="../${next.slug}/"><span class="pg-label">Suivant →</span><span class="pg-title">${esc(next.title)}</span></a>` : ""}
    </nav>`
      : "";

  const body = `
${breadcrumbs(rel, [
    { label: `${meta.label}${meta.year ? " · " + meta.year : ""}`, href: sectionRel },
    { label: seq.shortTitle || seq.title, href: "../" },
    { label: page.title, href: "./" },
  ])}
<div class="wrap course-layout">
  ${sidebarHTML(site, section, rel, sectionRel, seq.slug, page.slug)}
  <article>
    <div class="page-head">
      <div class="kicker">
        <span class="badge" style="--badge-bg:${meta.colorSoft};--badge-fg:${meta.color}">${esc(meta.short)}</span>
        ${pageKindBadge(page) || `<span class="badge">${esc(seq.shortTitle || "Séquence")}</span>`}
        ${seq.nouveau ? `<span class="badge badge-new">✦ Nouveau</span>` : ""}
      </div>
      <h1>${esc(page.title)}</h1>
      ${page.tagline ? `<p class="desc">${esc(page.tagline)}</p>` : ""}
    </div>
    ${page.objectifs_md ? `<div class="callout callout-objectif"><span class="co-icon">🎯</span><div class="co-body"><div class="co-title">Objectifs</div>${md(page.objectifs_md)}</div></div>` : ""}
    ${interactive.fields || page.quiz?.length ? studentBar() : ""}
    <div class="prose">
      ${interactive.html}
    </div>
    ${renderQuiz(page.quiz)}
    ${renderResources(page.resources)}
    ${pager}
  </article>
</div>`;

  write(
    path.join(meta.slug, seq.slug, page.slug, "index.html"),
    layout({ site, rel, title: `${page.title} · ${seq.shortTitle || seq.title}`, description: page.tagline || seq.tagline, body, sectionId: meta.id })
  );
}

/* ---------------- Recherche & annexes ---------------- */

function buildSearchIndex(site, sections) {
  const items = [];
  for (const { meta, data } of sections) {
    items.push({
      title: `${meta.label} ${meta.year || ""}`.trim(),
      path: "Niveaux",
      url: `${meta.slug}/`,
      text: stripMd(data.tagline),
    });
    data.sequences.forEach((seq) => {
      items.push({
        title: seq.title,
        path: `${meta.label}${meta.year ? " · " + meta.year : ""}`,
        url: `${meta.slug}/${seq.slug}/`,
        text: stripMd(`${seq.tagline || ""} ${seq.intro_md || ""}`).slice(0, 240),
      });
      seq.pages.forEach((p) => {
        items.push({
          title: p.title,
          path: `${meta.label} › ${seq.shortTitle || seq.title}`,
          url: `${meta.slug}/${seq.slug}/${p.slug}/`,
          text: stripMd(p.content_md).slice(0, 240),
        });
      });
    });
  }
  write("search-index.json", JSON.stringify(items));
}

function buildSitemap(site, sections) {
  const urls = [SITE_URL];
  for (const { meta, data } of sections) {
    urls.push(`${SITE_URL}${meta.slug}/`);
    data.sequences.forEach((seq) => {
      urls.push(`${SITE_URL}${meta.slug}/${seq.slug}/`);
      seq.pages.forEach((p) => urls.push(`${SITE_URL}${meta.slug}/${seq.slug}/${p.slug}/`));
    });
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>`;
  write("sitemap.xml", xml);
  write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`);
}

function render404(site) {
  const body = `
<section class="section"><div class="wrap" style="text-align:center;padding:4rem 0">
  <h1 style="font-size:4rem;margin-bottom:0.2em">404</h1>
  <p class="desc" style="color:var(--text-2)">Cette page n'existe pas ou a été déplacée.</p>
  <p><a class="btn btn-primary" href="/techno/">Retour à l'accueil</a></p>
</div></section>`;
  write("404.html", layout({ site, rel: "/techno/", title: "Page introuvable", description: "", body, sectionId: "" }));
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#2050d0"/><stop offset="1" stop-color="#7c3aed"/>
</linearGradient></defs>
<rect width="64" height="64" rx="14" fill="url(#g)"/>
<text x="32" y="44" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="800" fill="#fff" text-anchor="middle">T</text>
</svg>`;

/* ---------------- Programme principal ---------------- */

function main() {
  const site = readJSON(path.join(CONTENT, "site.json"));

  // Charge chaque section (meta = entrée de site.json, data = fichier JSON dédié)
  const sections = site.sections.map((meta) => ({
    meta,
    data: readJSON(path.join(CONTENT, "sections", meta.file)),
  }));

  // Quiz : superposition facultative content/quiz/<id>.json
  // { "<slug-sequence>/<slug-page>": [ { q, options: [...], answer: index, explain? } ] }
  for (const { meta, data } of sections) {
    const quizFile = path.join(CONTENT, "quiz", `${meta.id}.json`);
    if (!fs.existsSync(quizFile)) continue;
    const overlay = readJSON(quizFile);
    for (const seq of data.sequences) {
      for (const p of seq.pages) {
        const q = overlay[`${seq.slug}/${p.slug}`];
        if (q) p.quiz = q;
      }
    }
  }

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });

  fs.copyFileSync(path.join(__dirname, "styles.css"), path.join(OUT, "assets", "styles.css"));
  fs.copyFileSync(path.join(__dirname, "client.js"), path.join(OUT, "assets", "client.js"));
  fs.writeFileSync(path.join(OUT, "assets", "favicon.svg"), FAVICON, "utf8");
  fs.writeFileSync(path.join(OUT, ".nojekyll"), "", "utf8");

  // images de contenu auto-hébergées
  const imgSrc = path.join(CONTENT, "assets", "img");
  if (fs.existsSync(imgSrc)) {
    fs.cpSync(imgSrc, path.join(OUT, "assets", "img"), { recursive: true });
  }

  // application « espaces » (connexion, prof, élève) copiée telle quelle
  const appSrc = path.join(__dirname, "app");
  if (fs.existsSync(appSrc)) {
    fs.cpSync(appSrc, OUT, { recursive: true });
  }

  renderHome(site, sections);
  render404(site);

  let pageCount = 2;
  for (const { meta, data } of sections) {
    renderSection(site, meta, data);
    pageCount++;
    data.sequences.forEach((seq, i) => {
      renderSequence(site, meta, data, seq, i);
      pageCount++;
      seq.pages.forEach((p, j) => {
        renderPage(site, meta, data, seq, p, seq.pages[j - 1], seq.pages[j + 1]);
        pageCount++;
      });
    });
  }

  buildSearchIndex(site, sections);
  buildSitemap(site, sections);

  console.log(`✔ Site généré : ${pageCount} pages HTML dans docs/`);
}

main();
