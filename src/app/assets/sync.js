/* ============================================================================
   Synchronisation du travail de l'élève sur les pages de cours.
   Chargé dynamiquement par client.js UNIQUEMENT si un élève est connecté et
   que Firebase est configuré. Enregistre réponses + scores de quiz vers
   Firestore et les recharge d'un appareil à l'autre.
   ============================================================================ */
// version chaînée depuis l'URL du module (cache-busting de app.js)
const __V = new URL(import.meta.url).searchParams.get("v") || "";
const { currentStudent, isConfigured, pageKeyFromPath, loadWork, saveWork,
  watchGroupAnswers, saveGroupAnswer, markGroupAnswered, logout,
  saveCardsResult, saveGroupCardsResult, loadCardsResult, loadGroupCardsResult } = await import("./app.js" + (__V ? "?v=" + __V : ""));

(async function () {
  const sess = currentStudent();
  if (!sess || !isConfigured()) return;

  const pageKey = pageKeyFromPath(location.pathname);
  const title = (document.querySelector(".page-head h1") || {}).textContent || document.title;
  const fields = Array.from(document.querySelectorAll(".answer-field textarea"));
  const quizQs = Array.from(document.querySelectorAll(".quiz-q"));

  /* ---- Bandeau « connecté » ---- */
  const base = document.documentElement.getAttribute("data-base") || "./";
  const inGroup = !!sess.groupId;
  const banner = document.createElement("div");
  banner.className = "sync-banner show";
  banner.innerHTML = '<span class="sync-dot"></span><span>' +
    (inGroup ? "👥 " + esc(sess.groupName || "Groupe") + " · " + esc(sess.firstName) : "🎒 " + esc(sess.firstName)) +
    '</span><a href="' + base + 'eleve/">Mon espace</a>' +
    '<button type="button" class="sync-logout" title="Se déconnecter de cet ordinateur">Quitter</button>';
  document.body.appendChild(banner);
  // Poste partagé : se déconnecter efface les réponses gardées sur la machine.
  banner.querySelector(".sync-logout").addEventListener("click", async () => {
    if (!confirm("Te déconnecter de cet ordinateur ?\n\nTon travail est enregistré en ligne : tu le retrouveras en te reconnectant. Les réponses affichées ici seront effacées de cette machine.")) return;
    try { await push(); } catch (e) {}
    await logout();
    location.href = base + "connexion/";
  });
  const dot = banner.querySelector(".sync-dot");
  let saveTimer = null;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  /* ---- Récupère l'état courant de la page ---- */
  function collectAnswers() {
    const a = {};
    fields.forEach((ta) => { const k = ta.getAttribute("data-answer-idx"); if (ta.value.trim()) a[k] = ta.value; });
    return a;
  }
  // Intitulé de chaque zone remplie (la consigne qui la précède) : sans lui le
  // professeur reçoit des réponses sans savoir à quelle question elles répondent.
  function collectLabels() {
    const l = {};
    fields.forEach((ta) => {
      const k = ta.getAttribute("data-answer-idx");
      const lab = ta.getAttribute("data-answer-label");
      if (lab && ta.value.trim()) l[k] = lab;
    });
    return l;
  }
  function collectQuiz() {
    if (!quizQs.length) return null;
    const done = document.querySelectorAll(".quiz-q.answered-ok, .quiz-q.answered-ko").length;
    if (!done) return null;
    const good = document.querySelectorAll(".quiz-q.answered-ok").length;
    return { score: good, total: quizQs.length, attempted: done };
  }

  async function push() {
    dot.classList.add("saving");
    try {
      // en mode groupe, les réponses écrites vivent dans le groupe ;
      // le travail personnel ne garde que le quiz (score individuel).
      // En îlot, les réponses écrites appartiennent au groupe : le travail
      // personnel garde le quiz (score individuel) + le NOMBRE de réponses de
      // l'îlot, qui vaut pour chacun de ses membres.
      const groupAnswers = inGroup ? Object.keys(collectAnswers()).length : 0;
      let data;
      if (inGroup) {
        data = { quiz: collectQuiz(), title, groupAnswers };
      } else {
        const labels = collectLabels();
        data = { answers: collectAnswers(), quiz: collectQuiz(), title, path: location.pathname };
        if (Object.keys(labels).length) data.labels = labels;
      }
      await saveWork(sess.classId, sess.sid, pageKey, data);
      if (inGroup) {
        await markGroupAnswered(sess.classId, sess.groupId, pageKey, groupAnswers, title);
      }
      dot.classList.remove("saving");
      return true;
    } catch (e) { /* silencieux : localStorage garde une copie */ }
    dot.classList.remove("saving");
    return false;
  }
  function schedule() { clearTimeout(saveTimer); saveTimer = setTimeout(push, 900); }

  function grow(ta) { ta.style.height = "auto"; ta.style.height = Math.max(ta.scrollHeight + 4, 60) + "px"; }

  /* ================= MODE GROUPE : partage en direct ================= */
  if (inGroup && fields.length) {
    // étiquette d'auteur sous chaque champ
    const authors = new Map();
    fields.forEach((ta) => {
      const tag = document.createElement("div");
      tag.className = "af-author";
      ta.parentElement.appendChild(tag);
      authors.set(ta.getAttribute("data-answer-idx"), tag);
    });

    // réception en direct : met à jour les champs non focalisés
    watchGroupAnswers(sess.classId, sess.groupId, pageKey, (answers) => {
      fields.forEach((ta) => {
        const k = ta.getAttribute("data-answer-idx");
        const a = answers[k];
        if (!a) return;
        const tag = authors.get(k);
        if (tag && a.by) tag.textContent = "✍️ " + a.by;
        // ne pas écraser une saisie en cours, ni une carte déjà jugée
        if (document.activeElement === ta || ta.disabled) return;
        if (ta.value !== a.text) {
          ta.value = a.text;
          ta.parentElement.classList.toggle("saved", !!a.text.trim());
          grow(ta);
        }
      });
    });

    // envoi : chaque frappe (débouncée par champ) écrit dans le groupe
    const timers = new Map();
    fields.forEach((ta) => {
      ta.addEventListener("input", () => {
        const k = ta.getAttribute("data-answer-idx");
        clearTimeout(timers.get(k));
        dot.classList.add("saving");
        timers.set(k, setTimeout(async () => {
          try { await saveGroupAnswer(sess.classId, sess.groupId, pageKey, k, ta.value, sess.firstName, title, ta.getAttribute("data-answer-label") || "", location.pathname); }
          catch (e) {}
          dot.classList.remove("saving");
          const tag = authors.get(k);
          if (tag) tag.textContent = "✍️ " + sess.firstName;
        }, 600));
      });
    });
  } else {
    /* ---- Mode individuel : chargement initial depuis la base ---- */
    try {
      const remote = await loadWork(sess.classId, sess.sid, pageKey);
      if (remote && remote.answers) {
        fields.forEach((ta) => {
          const k = ta.getAttribute("data-answer-idx");
          if (remote.answers[k] != null && !ta.value.trim()) {
            ta.value = remote.answers[k];
            ta.dispatchEvent(new Event("input", { bubbles: true })); // met à jour localStorage + hauteur
          }
        });
      }
    } catch (e) {}
    fields.forEach((ta) => ta.addEventListener("input", schedule));
  }

  /* ---- Vérificateur de cartes : envoi du résultat au professeur ----
     client.js n'ouvre la correction QUE si cette fonction a répondu true :
     le tri de l'îlot part chez le professeur AVANT que le corrigé soit
     visible, sans quoi il suffirait de révéler puis de recopier. */
  window.LMTechnoCards = window.LMTechnoCards || { submit: null, load: null };
  window.LMTechnoCards.submit = async function (sheetId, result) {
    try {
      // 1. les réponses écrites sur les cartes partent d'abord…
      if (inGroup) {
        const sheet = document.getElementById(sheetId);
        const tas = sheet ? Array.from(sheet.querySelectorAll(".cut-card-ans textarea")) : [];
        await Promise.all(tas.map((ta) => saveGroupAnswer(sess.classId, sess.groupId, pageKey,
          ta.getAttribute("data-answer-idx"), ta.value, sess.firstName, title,
          ta.getAttribute("data-answer-label") || "", location.pathname)));
        await markGroupAnswered(sess.classId, sess.groupId, pageKey,
          Object.keys(collectAnswers()).length, title);
      } else if (!(await push())) {
        return false;
      }
      // 2. …puis le score, les essais et la consultation du corrigé.
      const data = { ...result, path: location.pathname, pageTitle: title };
      if (inGroup) await saveGroupCardsResult(sess.classId, sess.groupId, pageKey, sheetId, data);
      else await saveCardsResult(sess.classId, sess.sid, pageKey, sheetId, data);
      return true;
    } catch (e) { return false; }
  };

  // Relecture : l'état enregistré chez le professeur fait foi sur celui du
  // navigateur (connexion en cours de route, autre appareil, autre membre de
  // l'îlot).
  window.LMTechnoCards.load = async function (sheetId) {
    try {
      return inGroup
        ? await loadGroupCardsResult(sess.classId, sess.groupId, pageKey, sheetId)
        : await loadCardsResult(sess.classId, sess.sid, pageKey, sheetId);
    } catch (e) { return null; }
  };

  /* ---- Quiz : toujours individuel ---- */
  quizQs.forEach((q) => {
    const btn = q.querySelector(".qq-check");
    if (btn) btn.addEventListener("click", () => setTimeout(push, 60));
  });
  window.addEventListener("beforeunload", () => { try { push(); } catch (e) {} });
})();
