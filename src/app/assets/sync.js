/* ============================================================================
   Synchronisation du travail de l'élève sur les pages de cours.
   Chargé dynamiquement par client.js UNIQUEMENT si un élève est connecté et
   que Firebase est configuré. Enregistre réponses + scores de quiz vers
   Firestore et les recharge d'un appareil à l'autre.
   ============================================================================ */
import { currentStudent, isConfigured, pageKeyFromPath, loadWork, saveWork } from "./app.js";

(async function () {
  const sess = currentStudent();
  if (!sess || !isConfigured()) return;

  const pageKey = pageKeyFromPath(location.pathname);
  const title = (document.querySelector(".page-head h1") || {}).textContent || document.title;
  const fields = Array.from(document.querySelectorAll(".answer-field textarea"));
  const quizQs = Array.from(document.querySelectorAll(".quiz-q"));

  /* ---- Bandeau « connecté » ---- */
  const base = document.documentElement.getAttribute("data-base") || "./";
  const banner = document.createElement("div");
  banner.className = "sync-banner show";
  banner.innerHTML = '<span class="sync-dot"></span><span>🎒 ' + esc(sess.firstName) +
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
      await saveWork(sess.classId, sess.sid, pageKey, { answers: collectAnswers(), quiz: collectQuiz(), title });
    } catch (e) { /* silencieux : localStorage garde une copie */ }
    dot.classList.remove("saving");
  }
  function schedule() { clearTimeout(saveTimer); saveTimer = setTimeout(push, 900); }

  /* ---- Chargement initial depuis Firestore ---- */
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

  /* ---- Écoute des changements ---- */
  fields.forEach((ta) => ta.addEventListener("input", schedule));
  quizQs.forEach((q) => {
    const btn = q.querySelector(".qq-check");
    if (btn) btn.addEventListener("click", () => setTimeout(push, 60));
  });
  window.addEventListener("beforeunload", () => { try { push(); } catch (e) {} });
})();
