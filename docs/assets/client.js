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
      // Les planches de cartes aussi : sinon les verdicts et les verrous
      // restent affichés au-dessus de cases vides.
      var hadCards = false;
      try {
        var kill = [];
        for (var ci = 0; ci < localStorage.length; ci++) {
          var ck = localStorage.key(ci);
          if (ck && ck.indexOf("lmtechno-cartes:") === 0 && ck.indexOf(":" + CARDS_PATH + ":") !== -1) kill.push(ck);
        }
        kill.forEach(function (k) { localStorage.removeItem(k); });
        hadCards = kill.length > 0;
      } catch (e) {}
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
      // Les planches reprennent à zéro : le plus simple et le plus sûr est de
      // recharger (l'état distant, lui, reste celui du professeur).
      if (hadCards) location.reload();
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

  /* Vérification CARTE PAR CARTE, 3 essais par carte. Corriger toute la
     planche d'un coup révélerait les bonnes réponses par élimination (avec
     deux catégories, un ❌ suffit) ; ici l'élève s'engage sur une carte, et
     une carte ratée trois fois se verrouille sans livrer sa réponse.

     L'état de référence est celui du PROFESSEUR (work/ ou groupwork/), pas le
     navigateur : sinon se connecter, changer d'appareil ou travailler à
     plusieurs dans un îlot rendrait des essais neufs. Le navigateur n'en garde
     qu'une copie de travail, fusionnée avec la copie distante au chargement
     (on garde le maximum d'essais et toute réussite déjà acquise).

     La correction ne s'ouvre que si toutes les cartes sont réglées ET que le
     résultat est bien arrivé chez le professeur — c'est sync.js (chargé
     seulement si un élève est connecté) qui installe window.LMTechnoCards. */
  var CARD_TRIES = 3;
  window.LMTechnoCards = window.LMTechnoCards || { submit: null, load: null };

  /* Portée de l'état : l'îlot s'il y en a un (les 3 essais valent pour l'îlot
     entier, pas par élève), sinon l'élève, sinon un brouillon local.
     Volontairement HORS du préfixe « lmtechno-rep: » : celui-ci est purgé à la
     connexion, ce qui rendrait des essais neufs à qui se connecte en cours de
     route. */
  function cardScope() {
    try {
      var s = JSON.parse(localStorage.getItem("lmtechno-eleve") || "null");
      if (s && s.classId) return s.classId + "/" + (s.groupId ? "g:" + s.groupId : s.sid);
    } catch (e) {}
    return "local";
  }
  var CARDS_PATH = location.pathname.replace(/\/index\.html$/, "/");
  function cardsKey(id, scope) {
    return "lmtechno-cartes:" + (scope || cardScope()) + ":" + CARDS_PATH + ":" + id;
  }
  function readCards(id, scope) {
    try { return JSON.parse(localStorage.getItem(cardsKey(id, scope)) || "null") || {}; }
    catch (e) { return {}; }
  }
  function writeCards(id, st) {
    try { localStorage.setItem(cardsKey(id), JSON.stringify(st)); } catch (e) {}
  }
  /* Fusion de deux relevés de cartes : on ne perd jamais un essai déjà
     consommé, ni une carte déjà trouvée. */
  function mergeCards(a, b) {
    var out = {};
    [a || {}, b || {}].forEach(function (src) {
      Object.keys(src).forEach(function (k) {
        var x = out[k] || {}, y = src[k] || {};
        out[k] = { t: Math.max(x.t || 0, y.t || 0), ok: !!(x.ok || y.ok), last: y.last || x.last || "" };
      });
    });
    return out;
  }
  // Attend que sync.js soit prêt, mais seulement si un élève est connecté.
  function waitBridge(what) {
    var connected = false;
    try { connected = !!JSON.parse(localStorage.getItem("lmtechno-eleve") || "null"); } catch (e) {}
    if (!connected) return Promise.resolve(null);
    if (window.LMTechnoCards[what]) return Promise.resolve(window.LMTechnoCards[what]);
    return new Promise(function (resolve) {
      var n = 0;
      var t = setInterval(function () {
        if (window.LMTechnoCards[what] || ++n > 30) { clearInterval(t); resolve(window.LMTechnoCards[what] || null); }
      }, 100);
    });
  }

  document.querySelectorAll("[data-cards-score]").forEach(function (score) {
    var sheet = document.getElementById(score.getAttribute("data-cards-score"));
    if (!sheet) return;
    var id = sheet.id;
    var cards = Array.prototype.slice.call(sheet.querySelectorAll(".cut-card[data-k]"));
    var total = cards.length;
    if (!total) return;

    /* Clé d'une carte : son NUMÉRO IMPRIMÉ. Stable si le contenu de la page
       change ailleurs, et c'est le numéro que l'élève et le professeur voient.
       (data-answer-idx est un compteur global à la page : un paragraphe ajouté
       plus haut décalerait tous les états.) */
    function idxOf(li) {
      var n = li.querySelector(".cut-card-n");
      return n ? n.textContent.trim() : String(cards.indexOf(li) + 1);
    }

    var st = readCards(id);
    // Reprise du brouillon anonyme quand l'élève se connecte en cours d'activité.
    if (!st.cards && cardScope() !== "local") {
      var anon = readCards(id, "local");
      if (anon && anon.cards) st = anon;
    }
    var per = (st.cards && typeof st.cards === "object") ? st.cards : {};
    var revealed = !!(st.cards && st.revealed);   // jamais hérité d'un ancien format
    var sent = !!(st.cards && st.sent);
    var sending = null, queued = false;

    function stateOf(li) { return per[idxOf(li)] || { t: 0, ok: false }; }
    function isLocked(s) { return !s.ok && s.t >= CARD_TRIES; }
    function persist() { st = { cards: per, revealed: revealed, sent: sent }; writeCards(id, st); }

    /* Le libellé de « Saisir notre résultat » doit suivre l'état réel, sinon un
       clic replie le travail de l'îlot au lieu de l'ouvrir. */
    function setAnswering(on) {
      sheet.classList.toggle("answering", on);
      var t = sheet.querySelector(".cards-answer-toggle");
      if (t) t.textContent = on ? "📝 Masquer notre résultat" : "📝 Saisir notre résultat";
    }

    /* Une carte : son verdict et son état (saisie ouverte, juste, verrouillée). */
    function paint(li) {
      var s = stateOf(li);
      var ta = li.querySelector("textarea");
      var b = li.querySelector("[data-check-card]");
      var v = li.querySelector(".cut-card-verdict");
      var done = s.ok || isLocked(s);
      li.classList.toggle("ok", !!s.ok);
      li.classList.toggle("locked", isLocked(s));
      li.classList.toggle("ko", !s.ok && s.t > 0 && !isLocked(s));
      li.classList.toggle("shown", revealed && isLocked(s));
      if (ta) ta.disabled = done;
      if (b) { b.disabled = done; b.textContent = done ? "🔎 Vérifier" : "🔎 Vérifier (" + (CARD_TRIES - s.t) + ")"; }
      if (!v) return;
      if (s.ok) v.textContent = "✅ juste" + (s.t > 1 ? " (au " + s.t + "ᵉ essai)" : "");
      else if (isLocked(s)) v.textContent = revealed
        ? "✔ " + b64(li.getAttribute("data-k")).split("/")[0]
        : "🔒 3 essais épuisés";
      else if (s.t > 0) v.textContent = "❌ essai " + s.t + " / " + CARD_TRIES + " — réessaie";
      else v.textContent = "";
    }
    function paintAll() { cards.forEach(paint); }

    /* Le bilan de la planche, sous les cartes. */
    function summary(extra) {
      var ok = 0, locked = 0, pending = 0;
      cards.forEach(function (li) { var s = stateOf(li); if (s.ok) ok++; else if (isLocked(s)) locked++; else pending++; });
      var started = ok + locked > 0;
      var allDone = pending === 0;
      var html = "";
      if (started) {
        html += "<strong>" + ok + " / " + total + "</strong> carte" + (ok > 1 ? "s" : "") + " juste" + (ok > 1 ? "s" : "");
        if (locked) html += " · <span class=\"cards-locked-n\">🔒 " + locked + " bloquée" + (locked > 1 ? "s" : "") + "</span>";
        if (pending) html += " · " + pending + " à vérifier";
        if (allDone && ok === total) html += " 🎉 Tri parfait !";
      }
      if (allDone && locked && !revealed) {
        if (sent) html += ' <button type="button" class="btn btn-ghost btn-sm" data-reveal>👁 Voir la correction des cartes bloquées</button>';
        else html += '<div class="cards-locked">🔒 La correction s\'affichera une fois votre résultat ' +
          'envoyé au professeur. <button type="button" class="btn btn-ghost btn-sm" data-resend>↻ Envoyer maintenant</button>' +
          "<br><small>Si rien ne part, connecte-toi à ton espace élève puis réessaie.</small></div>";
      }
      if (extra) html += extra;
      score.innerHTML = html;
      score.className = "cards-score" + (html ? " show " : " ") +
        (!started ? "" : allDone && ok === total ? "all-ok" : ok >= total / 2 ? "mid" : "low");

      var resend = score.querySelector("[data-resend]");
      if (resend) resend.addEventListener("click", function () {
        resend.disabled = true;
        send().then(function (okSent) {
          if (!okSent) { summary('<div class="cards-locked">Envoi impossible pour l\'instant. Connecte-toi à ton espace élève, puis réessaie.</div>'); }
        });
      });

      var rev = score.querySelector("[data-reveal]");
      // La correction ne s'affiche qu'une fois l'envoi CONFIRMÉ, et le fait que
      // l'îlot l'ait consultée doit partir avec.
      if (rev) rev.addEventListener("click", function () {
        rev.disabled = true;
        revealed = true; persist();
        send().then(function (okSent) {
          if (!okSent) {
            revealed = false; persist();
            summary('<div class="cards-locked">Envoi impossible : la correction reste fermée. Réessaie dans un instant.</div>');
            return;
          }
          setAnswering(true);
          paintAll();
          summary("");
        });
      });
    }

    /* Ce que reçoit le professeur : l'état de chaque carte, puis le bilan. */
    function payload() {
      var ok = 0, locked = 0, attempts = 0, perCard = {};
      cards.forEach(function (li) {
        var s = stateOf(li);
        if (s.ok) ok++; else if (isLocked(s)) locked++;
        attempts += s.t;
        perCard[idxOf(li)] = { t: s.t, ok: !!s.ok };
      });
      return { title: sheet.getAttribute("data-cards-title") || "", total: total, ok: ok, locked: locked,
               pending: total - ok - locked, attempts: attempts, perCard: perCard, revealed: revealed };
    }
    function doSend() {
      return waitBridge("submit").then(function (submit) {
        if (!submit) return false;
        return submit(id, payload());
      }).then(function (okSent) {
        if (!okSent) return false;
        var was = sent;
        sent = true; persist();
        summary(was ? "" : '<div class="cards-sent">✅ Résultat envoyé au professeur.</div>');
        return true;
      });
    }
    /* Un envoi déjà en vol ne doit pas AVALER la vérification suivante : on
       mémorise qu'il faut rejouer, sinon le dernier état n'arrive jamais. */
    function send() {
      if (sending) { queued = true; return sending; }
      var done = function (r) {
        sending = null;
        if (queued) { queued = false; return send(); }
        return r;
      };
      sending = doSend().then(done, function () { return done(false); });
      return sending;
    }

    function check(li) {
      var s = stateOf(li);
      if (s.ok || isLocked(s)) return;
      var ta = li.querySelector("textarea");
      var v = li.querySelector(".cut-card-verdict");
      var val = ta ? ta.value : "";
      if (!String(val).trim()) { if (v) v.textContent = "— écris d'abord une réponse"; return; }
      // Même réponse que l'essai précédent (double-clic, touche Entrée
      // maintenue) : on ne consomme pas d'essai pour rien.
      var n = norm(val);
      if (s.t > 0 && s.last === n) { if (v) v.textContent = "↻ même réponse — modifie-la avant de revérifier"; return; }
      per[idxOf(li)] = { t: s.t + 1, ok: matches(val, b64(li.getAttribute("data-k"))), last: n };
      persist();
      paint(li);
      summary("");
      send();
    }

    cards.forEach(function (li) {
      var b = li.querySelector("[data-check-card]");
      var ta = li.querySelector("textarea");
      if (b) b.addEventListener("click", function () { check(li); });
      // Entrée = vérifier cette carte (Maj+Entrée pour un retour à la ligne).
      // e.repeat : une touche maintenue ne doit pas brûler les 3 essais.
      if (ta) ta.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (e.repeat) return; check(li); }
      });
    });

    // Affichage immédiat depuis la copie locale…
    paintAll();
    summary("");
    if (cards.some(function (li) { return stateOf(li).t > 0; })) setAnswering(true);

    // …puis l'état du professeur fait foi : on fusionne et on repeint.
    waitBridge("load").then(function (load) {
      if (!load) return null;
      return load(id);
    }).then(function (remote) {
      if (remote && remote.perCard) {
        per = mergeCards(per, remote.perCard);
        if (remote.revealed) revealed = true;
        sent = true;                       // il y a bien une trace chez le professeur
        persist();
        paintAll();
        summary("");
        if (cards.some(function (li) { return stateOf(li).t > 0; })) setAnswering(true);
      }
      // Travail terminé mais jamais transmis (réseau coupé, connexion tardive) :
      // on rattrape, sinon la correction resterait fermée pour toujours.
      if (!sent && cards.some(function (li) { return stateOf(li).t > 0; })) send();
    }).catch(function () {});
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
