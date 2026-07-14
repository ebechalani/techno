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

  /* ---------- Tableaux défilants sur mobile ---------- */
  document.querySelectorAll(".prose table").forEach(function (t) {
    if (t.parentElement.classList.contains("table-scroll")) return;
    var w = document.createElement("div");
    w.className = "table-scroll";
    t.parentNode.insertBefore(w, t);
    w.appendChild(t);
  });
})();
