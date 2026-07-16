/* ============================================================================
   Synchronisation du travail de l'élève sur les pages de cours.
   Chargé dynamiquement par client.js UNIQUEMENT si un élève est connecté et
   que Firebase est configuré. Enregistre réponses + scores de quiz vers
   Firestore et les recharge d'un appareil à l'autre.
   ============================================================================ */
import { currentStudent, isConfigured, pageKeyFromPath, loadWork, saveWork,
  watchGroupAnswers, saveGroupAnswer } from "./app.js";

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
    '</span><a href="' + base + 'eleve/">Mon espace</a>';
  document.body.appendChild(banner);
  const dot = banner.querySelector(".sync-dot");
  let saveTimer = null;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  /* ---- Récupère l'état courant de la page ---- */
  function collectAnswers() {
    const a = {};
    fields.forEach((ta) => { const k = ta.getAttribute("data-answer-idx"); if (ta.value.trim()) a[k] = ta.value; });
    return a;
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
      const data = inGroup
        ? { quiz: collectQuiz(), title }
        : { answers: collectAnswers(), quiz: collectQuiz(), title };
      await saveWork(sess.classId, sess.sid, pageKey, data);
    } catch (e) { /* silencieux : localStorage garde une copie */ }
    dot.classList.remove("saving");
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
        if (document.activeElement === ta) return;        // ne pas écraser une saisie en cours
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
          try { await saveGroupAnswer(sess.classId, sess.groupId, pageKey, k, ta.value, sess.firstName, title); }
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

  /* ---- Quiz : toujours individuel ---- */
  quizQs.forEach((q) => {
    const btn = q.querySelector(".qq-check");
    if (btn) btn.addEventListener("click", () => setTimeout(push, 60));
  });
  window.addEventListener("beforeunload", () => { try { push(); } catch (e) {} });
})();
