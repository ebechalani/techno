/* Technologie & SNT — script client : navigation, thème, recherche, intégrations */
(function () {
  "use strict";

  var root = document.documentElement;
  var BASE = root.getAttribute("data-base") || "./";

  /* ---------- Thème clair / sombre ---------- */
  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    var btn = document.getElementById("theme-toggle");
    if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
  }
  var saved = null;
  try { saved = localStorage.getItem("lmtechno-theme"); } catch (e) {}
  var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(saved || (prefersDark ? "dark" : "light"));

  document.addEventListener("click", function (e) {
    var btn = e.target.closest("#theme-toggle");
    if (!btn) return;
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("lmtechno-theme", next); } catch (err) {}
  });

  /* ---------- Navigation : menus déroulants + menu mobile ---------- */
  document.addEventListener("click", function (e) {
    var toggle = e.target.closest(".nav-group > button");
    var openGroups = document.querySelectorAll(".nav-group.open");
    if (toggle) {
      var group = toggle.parentElement;
      openGroups.forEach(function (g) { if (g !== group) g.classList.remove("open"); });
      group.classList.toggle("open");
      toggle.setAttribute("aria-expanded", group.classList.contains("open"));
    } else if (!e.target.closest(".nav-menu")) {
      openGroups.forEach(function (g) { g.classList.remove("open"); });
    }
    var navToggle = e.target.closest("#nav-toggle");
    if (navToggle) {
      var nav = document.getElementById("main-nav");
      nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", nav.classList.contains("open"));
    }
  });

  /* ---------- Bouton retour en haut ---------- */
  var topBtn = document.getElementById("back-to-top");
  if (topBtn) {
    window.addEventListener("scroll", function () {
      topBtn.classList.toggle("show", window.scrollY > 600);
    }, { passive: true });
    topBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Intégrations paresseuses (iframes chargées au clic/visibilité) ---------- */
  // Les iframes lourdes (Drive, Slides, YouTube) sont chargées quand elles
  // approchent du viewport, pour garder les pages rapides.
  var frames = document.querySelectorAll("iframe[data-src]");
  if ("IntersectionObserver" in window && frames.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var f = entry.target;
        f.src = f.getAttribute("data-src");
        f.removeAttribute("data-src");
        io.unobserve(f);
      });
    }, { rootMargin: "600px 0px" });
    frames.forEach(function (f) { io.observe(f); });
  } else {
    frames.forEach(function (f) { f.src = f.getAttribute("data-src"); });
  }

  /* ---------- Recherche ---------- */
  var overlay = document.getElementById("search-overlay");
  var input = document.getElementById("search-input");
  var resultsEl = document.getElementById("search-results");
  var index = null;
  var activeIdx = -1;

  function openSearch() {
    if (!overlay) return;
    overlay.classList.add("open");
    input.value = "";
    renderResults([]);
    setTimeout(function () { input.focus(); }, 30);
    if (!index) {
      fetch(BASE + "search-index.json")
        .then(function (r) { return r.json(); })
        .then(function (data) { index = data; })
        .catch(function () { index = []; });
    }
  }
  function closeSearch() { if (overlay) overlay.classList.remove("open"); }

  function normalize(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }

  function doSearch(q) {
    if (!index || !q || q.length < 2) return [];
    var terms = normalize(q).split(/\s+/).filter(Boolean);
    var scored = [];
    for (var i = 0; i < index.length; i++) {
      var item = index[i];
      var hay = item._n || (item._n = normalize(item.title + " " + item.path + " " + (item.text || "")));
      var titleN = item._t || (item._t = normalize(item.title));
      var score = 0, ok = true;
      for (var j = 0; j < terms.length; j++) {
        var t = terms[j];
        if (titleN.indexOf(t) !== -1) score += 10;
        else if (hay.indexOf(t) !== -1) score += 2;
        else { ok = false; break; }
      }
      if (ok) scored.push({ item: item, score: score });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 12).map(function (s) { return s.item; });
  }

  function renderResults(items) {
    activeIdx = -1;
    if (!resultsEl) return;
    if (!items.length) {
      resultsEl.innerHTML = '<div class="sr-empty">' +
        (input && input.value.length >= 2 ? "Aucun résultat." : "Tapez pour rechercher une séquence, une séance, une notion…") +
        "</div>";
      return;
    }
    resultsEl.innerHTML = items.map(function (it) {
      return '<a href="' + BASE + it.url + '"><span class="sr-title">' + it.title +
        '</span><span class="sr-path"> — ' + it.path + "</span></a>";
    }).join("");
  }

  if (overlay) {
    document.addEventListener("click", function (e) {
      if (e.target.closest("#search-open")) { openSearch(); }
      if (e.target === overlay) closeSearch();
    });
    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openSearch(); }
      if (e.key === "Escape") closeSearch();
      if (!overlay.classList.contains("open")) return;
      var links = resultsEl.querySelectorAll("a");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!links.length) return;
        activeIdx = e.key === "ArrowDown"
          ? Math.min(activeIdx + 1, links.length - 1)
          : Math.max(activeIdx - 1, 0);
        links.forEach(function (l, i) { l.classList.toggle("active", i === activeIdx); });
        links[activeIdx].scrollIntoView({ block: "nearest" });
      }
      if (e.key === "Enter" && activeIdx >= 0 && links[activeIdx]) {
        links[activeIdx].click();
      }
    });
    var debounce = null;
    input.addEventListener("input", function () {
      clearTimeout(debounce);
      debounce = setTimeout(function () { renderResults(doSearch(input.value)); }, 120);
    });
  }

  /* ---------- Réponses des élèves (enregistrées dans le navigateur) ----------
     La clé inclut l'IDENTITÉ de l'élève connecté : sur un ordinateur partagé
     entre plusieurs classes, un élève ne peut pas lire les réponses laissées
     par le précédent. Sans connexion, on retombe sur un brouillon « local ». */
  function answerScope() {
    try {
      var s = JSON.parse(localStorage.getItem("lmtechno-eleve") || "null");
      if (s && s.classId && s.sid) return s.classId + "/" + s.sid;
    } catch (e) {}
    return "local";
  }
  var PAGE_KEY = "lmtechno-rep:" + answerScope() + ":" + location.pathname.replace(/\/index\.html$/, "/");

  var answerFields = document.querySelectorAll(".answer-field textarea");
  if (answerFields.length) {
    var saved2 = {};
    try { saved2 = JSON.parse(localStorage.getItem(PAGE_KEY) || "{}"); } catch (e) {}
    answerFields.forEach(function (ta) {
      var k = ta.getAttribute("data-answer-idx");
      if (saved2[k]) {
        ta.value = saved2[k];
        ta.parentElement.classList.add("saved");
        autoGrow(ta);
      }
      ta.addEventListener("input", function () {
        autoGrow(ta);
        saved2[k] = ta.value;
        try { localStorage.setItem(PAGE_KEY, JSON.stringify(saved2)); } catch (e) {}
        ta.parentElement.classList.toggle("saved", ta.value.trim().length > 0);
      });
    });
  }

  function autoGrow(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.max(ta.scrollHeight + 4, 60) + "px";
  }

  var clearBtn = document.getElementById("clear-answers");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (!confirm("Effacer toutes tes réponses de cette page ?")) return;
      try { localStorage.removeItem(PAGE_KEY); } catch (e) {}
      answerFields.forEach(function (ta) {
        ta.value = "";
        ta.parentElement.classList.remove("saved");
      });
      document.querySelectorAll(".quiz-q").forEach(function (q) {
        q.classList.remove("answered-ok", "answered-ko");
        q.querySelectorAll("input").forEach(function (r) { r.checked = false; });
        var fb = q.querySelector(".qq-feedback");
        if (fb) { fb.className = "qq-feedback"; fb.textContent = ""; }
      });
    });
  }

  var printBtn = document.getElementById("print-answers");
  if (printBtn) printBtn.addEventListener("click", function () { window.print(); });

  /* ---------- Impression des cartes à découper ---------- */
  /* On clone la planche demandée dans un conteneur de premier niveau : la CSS
     d'impression masque alors tout le reste de la page (cf. .printing-cards). */
  document.querySelectorAll("[data-print-cards]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var sheet = document.getElementById(btn.getAttribute("data-print-cards"));
      if (!sheet) return;
      var root = document.getElementById("cards-print-root");
      if (!root) {
        root = document.createElement("div");
        root.id = "cards-print-root";
        document.body.appendChild(root);
      }
      root.innerHTML = "";
      root.appendChild(sheet.cloneNode(true));
      document.documentElement.classList.add("printing-cards");
      window.print();
    });
  });
  window.addEventListener("afterprint", function () {
    document.documentElement.classList.remove("printing-cards");
  });

  /* Report du travail « débranché » : affiche une zone de saisie sous chaque
     carte pour que l'îlot recopie son tri. Les réponses utilisent le même
     mécanisme que les autres champs (sauvegarde auto + envoi au professeur). */
  document.querySelectorAll("[data-answer-cards]").forEach(function (btn) {
    var sheet = document.getElementById(btn.getAttribute("data-answer-cards"));
    if (!sheet) return;
    // Si l'îlot a déjà saisi quelque chose, on ouvre la saisie d'emblée.
    var filled = false;
    sheet.querySelectorAll(".cut-card-ans textarea").forEach(function (t) { if (t.value.trim()) filled = true; });
    if (filled) { sheet.classList.add("answering"); btn.textContent = "📝 Masquer notre résultat"; }
    btn.addEventListener("click", function () {
      var on = sheet.classList.toggle("answering");
      btn.textContent = on ? "📝 Masquer notre résultat" : "📝 Saisir notre résultat";
    });
  });

  /* ---------- Vérificateur des cartes triées ---------- */
  /* Les planches qui portent un corrigé (« Corrigé : 1=VRAI ; … » dans le
     contenu) peuvent être vérifiées sur le site : l'îlot saisit son tri sous
     chaque carte, clique sur « Vérifier notre tri » et voit immédiatement ce
     qui est juste. Le corrigé est encodé en base64 : il n'est pas secret, mais
     il ne se lit pas par-dessus l'épaule. */
  function b64(s) {
    try {
      var bin = atob(s);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8").decode(bytes);
    } catch (e) { return ""; }
  }
  /* Comparaison tolérante : casse, accents, ponctuation et articles ignorés. */
  function norm(s) {
    return String(s == null ? "" : s)
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\b(le|la|les|l|un|une|des|de|du|d|c est|c|est|ce)\b/g, " ")
      .replace(/\s+/g, " ").trim();
  }
  function matches(answer, key) {
    var a = norm(answer);
    if (!a) return false;
    var alts = key.split("/");
    for (var i = 0; i < alts.length; i++) {
      var k = norm(alts[i]);
      if (!k) continue;
      if (a === k) return true;
      // « c'est vrai », « carte VRAIE » : la bonne réponse est contenue en entier
      if (new RegExp("(^| )" + k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "( |$)").test(a)) return true;
    }
    return false;
  }

  /* Trois essais par planche, et la correction ne s'ouvre QUE lorsque le
     résultat de l'îlot est parti chez le professeur : sans cela, il suffirait
     de révéler le corrigé puis de recopier les bonnes réponses.
     sync.js (chargé seulement si un élève est connecté) installe
     window.LMTechnoCards.submit ; sans lui, rien n'est envoyé et la correction
     reste fermée. */
  var CARD_TRIES = 3;
  window.LMTechnoCards = window.LMTechnoCards || { submit: null };

  function cardsState(id) {
    try { return JSON.parse(localStorage.getItem(PAGE_KEY + ":cartes:" + id) || "null") || {}; }
    catch (e) { return {}; }
  }
  function saveCardsState(id, st) {
    try { localStorage.setItem(PAGE_KEY + ":cartes:" + id, JSON.stringify(st)); } catch (e) {}
  }
  // Attend que sync.js soit prêt, mais seulement si un élève est connecté.
  function waitSubmit() {
    var connected = false;
    try { connected = !!JSON.parse(localStorage.getItem("lmtechno-eleve") || "null"); } catch (e) {}
    if (!connected) return Promise.resolve(null);
    if (window.LMTechnoCards.submit) return Promise.resolve(window.LMTechnoCards.submit);
    return new Promise(function (resolve) {
      var n = 0;
      var t = setInterval(function () {
        if (window.LMTechnoCards.submit || ++n > 30) { clearInterval(t); resolve(window.LMTechnoCards.submit || null); }
      }, 100);
    });
  }

  document.querySelectorAll("[data-check-cards]").forEach(function (btn) {
    var sheet = document.getElementById(btn.getAttribute("data-check-cards"));
    if (!sheet) return;
    var id = sheet.id;
    var score = sheet.querySelector("[data-cards-score]");
    var cards = sheet.querySelectorAll(".cut-card[data-k]");
    var total = cards.length;
    var st = cardsState(id);
    var tries = Array.isArray(st.tries) ? st.tries : [];
    var revealed = !!st.revealed;
    var sent = !!st.sent;

    function reveal() {
      revealed = true;
      st.revealed = true; st.tries = tries; st.sent = sent; saveCardsState(id, st);
      cards.forEach(function (li) {
        var v = li.querySelector(".cut-card-verdict");
        if (v) v.textContent = "✔ " + b64(li.getAttribute("data-k")).split("/")[0];
        li.classList.add("shown");
      });
      sheet.classList.add("answering");
    }

    function render(last, blank, justSent) {
      if (!score) return;
      var left = Math.max(0, CARD_TRIES - tries.length);
      var perfect = last && last.good === total;
      btn.disabled = left === 0 || perfect;
      btn.textContent = left === 0 || perfect ? "🔎 Vérifier notre tri"
        : "🔎 Vérifier notre tri (" + left + " essai" + (left > 1 ? "s" : "") + ")";

      var html = "";
      if (last) {
        html += "<strong>" + last.good + " / " + total + "</strong> carte" + (last.good > 1 ? "s" : "") +
          " bien classée" + (last.good > 1 ? "s" : "");
        if (blank) html += " · " + blank + " sans réponse";
        html += " <span class=\"cards-tries\">essai " + tries.length + " / " + CARD_TRIES + "</span>";
        if (perfect) html += " 🎉 Tri parfait !";
      }
      if (tries.length > 1) {
        html += '<div class="cards-history">Vos essais : ' +
          tries.map(function (t) { return t.good + "/" + total; }).join(" → ") + "</div>";
      }
      if (!perfect && !revealed) {
        if (left > 0) {
          html += '<div class="cards-next">Il vous reste <strong>' + left + " essai" + (left > 1 ? "s" : "") +
            "</strong> : corrigez les cartes ❌, puis vérifiez à nouveau.</div>";
        } else if (sent) {
          html += ' <button type="button" class="btn btn-ghost btn-sm" data-reveal>👁 Voir la correction</button>';
        } else {
          html += '<div class="cards-locked">🔒 La correction s\'affichera une fois votre résultat ' +
            "envoyé au professeur. Connecte-toi à ton espace, puis vérifie à nouveau.</div>";
        }
      }
      if (justSent) html += '<div class="cards-sent">✅ Résultat envoyé au professeur.</div>';
      score.innerHTML = html;
      score.className = "cards-score" + (html ? " show " : " ") +
        (perfect ? "all-ok" : !last ? "" : last.good >= total / 2 ? "mid" : "low");
      var rev = score.querySelector("[data-reveal]");
      if (rev) rev.addEventListener("click", function () {
        reveal();
        render(last, blank, false);
        // Le professeur doit savoir que l'îlot a consulté la correction.
        waitSubmit().then(function (submit) {
          if (!submit) return;
          return submit(id, {
            title: sheet.getAttribute("data-cards-title") || "",
            total: total,
            tries: tries.map(function (t) { return t.good; }),
            best: tries.reduce(function (m, t) { return Math.max(m, t.good); }, 0),
            revealed: true,
          });
        }).catch(function () {});
      });
    }

    // Le nombre d'essais restants doit être lisible dès l'arrivée sur la page,
    // et après un rechargement l'élève retrouve ses essais déjà consommés.
    if (revealed) reveal();
    render(tries.length ? tries[tries.length - 1] : null, 0, false);

    btn.addEventListener("click", function () {
      if (btn.disabled) return;
      sheet.classList.add("answering"); // la saisie doit être visible pour corriger
      var toggle = sheet.querySelector(".cards-answer-toggle");
      if (toggle) toggle.textContent = "📝 Masquer notre résultat";

      var good = 0, blank = 0;
      cards.forEach(function (li) {
        var key = b64(li.getAttribute("data-k"));
        var ta = li.querySelector(".cut-card-ans textarea");
        var verdict = li.querySelector(".cut-card-verdict");
        var val = ta ? ta.value : "";
        li.classList.remove("ok", "ko", "blank");
        if (!String(val).trim()) {
          blank++; li.classList.add("blank");
          if (verdict) verdict.textContent = "— à compléter";
          return;
        }
        if (matches(val, key)) {
          good++; li.classList.add("ok");
          if (verdict) verdict.textContent = "✅ juste";
        } else {
          li.classList.add("ko");
          if (verdict) verdict.textContent = "❌ à revoir";
        }
      });

      // Une planche incomplète ne consomme pas d'essai : on la signale, c'est tout.
      if (blank && score) {
        score.className = "cards-score show";
        score.innerHTML = '<div class="cards-next">Complétez les <strong>' + blank + " carte" +
          (blank > 1 ? "s" : "") + '</strong> sans réponse avant de vérifier : cet essai ne compte pas.</div>';
        return;
      }

      var attempt = { good: good, total: total, at: Date.now() };
      tries.push(attempt);
      st.tries = tries; st.revealed = revealed; st.sent = sent;
      saveCardsState(id, st);
      render(attempt, blank, false);

      waitSubmit().then(function (submit) {
        if (!submit) return;
        return submit(id, {
          title: sheet.getAttribute("data-cards-title") || "",
          total: total,
          tries: tries.map(function (t) { return t.good; }),
          best: tries.reduce(function (m, t) { return Math.max(m, t.good); }, 0),
          revealed: revealed,
        }).then(function (ok) {
          if (!ok) return;
          sent = true; st.sent = true; saveCardsState(id, st);
          render(attempt, blank, true);
        });
      }).catch(function () {});
    });
  });

  /* ---------- Quiz auto-corrigés ---------- */
  var quizQs = document.querySelectorAll(".quiz-q");
  quizQs.forEach(function (qEl) {
    var btn = qEl.querySelector(".qq-check");
    var fb = qEl.querySelector(".qq-feedback");
    btn.addEventListener("click", function () {
      var chosen = qEl.querySelector("input:checked");
      if (!chosen) {
        fb.className = "qq-feedback show ko";
        fb.textContent = "Choisis d'abord une réponse 😉";
        return;
      }
      var ok = Number(chosen.value) === Number(qEl.getAttribute("data-ok"));
      qEl.classList.remove("answered-ok", "answered-ko");
      qEl.classList.add(ok ? "answered-ok" : "answered-ko");
      var explain = qEl.getAttribute("data-explain") || "";
      fb.className = "qq-feedback show " + (ok ? "ok" : "ko");
      fb.textContent = ok
        ? "✅ Bonne réponse !" + (explain ? " " + explain : "")
        : "❌ Ce n'est pas ça… réessaie !" + (explain ? " Indice : " + explain : "");
      updateScore();
    });
  });

  function updateScore() {
    var scoreEl = document.querySelector(".quiz-score");
    if (!scoreEl) return;
    var total = quizQs.length;
    var good = document.querySelectorAll(".quiz-q.answered-ok").length;
    var done = document.querySelectorAll(".quiz-q.answered-ok, .quiz-q.answered-ko").length;
    if (done === total) {
      scoreEl.className = "quiz-score show";
      scoreEl.textContent =
        "Score : " + good + "/" + total + (good === total ? " 🎉 Excellent !" : good >= total / 2 ? " 👍 Pas mal, tu peux réessayer les questions ratées." : " 💪 Relis la séance et réessaie !");
    }
  }

  /* ---------- Mélangeur de couleurs RVB (synthèse additive) ---------- */
  document.querySelectorAll("[data-rgb-mixer]").forEach(function (mix) {
    var preview = mix.querySelector("[data-rgb-preview]");
    var code = mix.querySelector("[data-rgb-code]");
    var inputs = mix.querySelectorAll("input[data-rgb]");
    function update() {
      var v = { r: 0, v: 0, b: 0 };
      inputs.forEach(function (inp) {
        v[inp.getAttribute("data-rgb")] = inp.value;
        var out = inp.nextElementSibling;
        if (out) out.textContent = inp.value;
      });
      preview.style.background = "rgb(" + v.r + "," + v.v + "," + v.b + ")";
      if (code) code.textContent = v.r + ", " + v.v + ", " + v.b;
    }
    inputs.forEach(function (inp) { inp.addEventListener("input", update); });
    update();
  });

  /* ---------- Restreindre l'élève connecté à son niveau ---------- */
  try {
    var escope = JSON.parse(localStorage.getItem("lmtechno-eleve") || "null");
    if (escope && escope.section) {
      document.querySelectorAll(".main-nav > a").forEach(function (a) {
        if (a.classList.contains("nav-account")) return; // garde « Espace »
        var m = (a.getAttribute("href") || "").match(/(5eme|4eme|3eme|snt|sicit)\/$/);
        if (m && m[1] === escope.section) return;         // garde son niveau
        a.style.display = "none";                          // masque Accueil + autres niveaux
      });
    }
  } catch (e) {}

  /* ---------- Synchronisation cloud (si un élève est connecté) ---------- */
  try {
    var sess = localStorage.getItem("lmtechno-eleve");
    var fb = window.LMTECHNO_FIREBASE;
    if (sess && fb && fb.apiKey && String(fb.apiKey).indexOf("VOTRE_") === -1) {
      var V = root.getAttribute("data-v") || "";
      // client.js est un script classique : import() relatif se résout par
      // rapport au script, pas à la page — on construit donc une URL absolue.
      var syncUrl = new URL(BASE + "assets/sync.js" + (V ? "?v=" + V : ""), document.baseURI).href;
      import(syncUrl).catch(function (e) {
        try { console.warn("sync.js non chargé :", e); } catch (x) {}
      });
    }
  } catch (e) {}

  /* ---------- Tableaux défilants sur mobile ---------- */
  document.querySelectorAll(".prose table").forEach(function (t) {
    if (t.parentElement.classList.contains("table-scroll")) return;
    var w = document.createElement("div");
    w.className = "table-scroll";
    t.parentNode.insertBefore(w, t);
    w.appendChild(t);
  });
})();
