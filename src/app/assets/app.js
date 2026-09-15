/* ============================================================================
   Espaces « Technologie & SNT » — logique Firebase (Auth + Realtime Database)
   Module ES partagé par les pages connexion / prof / élève et par la
   synchronisation des pages de cours.

   ▸ Base : Realtime Database (offre gratuite Spark, sans carte bancaire).
   ============================================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, signInAnonymously, updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getDatabase, ref, get, set, update, remove, push, onValue,
  query, orderByChild, equalTo, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

/* ---------- Configuration & initialisation ---------- */

const cfg = window.LMTECHNO_FIREBASE || {};

// Administrateur : approuvé d'office, valide les autres professeurs.
// Doit correspondre à l'e-mail codé dans database.rules.json.
export const ADMIN_EMAIL = String(cfg.adminEmail || "ebechalani@gmail.com").trim().toLowerCase();

export function isConfigured() {
  return !!(cfg.apiKey && cfg.databaseURL && !String(cfg.apiKey).includes("VOTRE_") && !String(cfg.databaseURL).includes("VOTRE_"));
}

let app, auth, db;
if (isConfigured()) {
  app = initializeApp(cfg);
  auth = getAuth(app);
  db = getDatabase(app);
}
export { auth, db };

/* ---------- Utilitaires ---------- */

export function normId(name) {
  return String(name || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function makeCode() {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

export function pageKeyFromPath(pathname) {
  return String(pathname || location.pathname)
    .replace(/index\.html$/, "").replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_") || "accueil";
}

// snapshot -> tableau d'objets { id, ...valeur }
function toList(snap) {
  const out = [];
  snap.forEach((c) => { out.push({ id: c.key, ...c.val() }); });
  return out;
}

/* ---------- Authentification professeur ---------- */

export async function teacherSignUp(email, password, name) {
  const mail = email.trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(cred.user, { displayName: name });
  const admin = mail === ADMIN_EMAIL;
  await set(ref(db, "teachers/" + cred.user.uid), {
    name: name || "", email: mail, approved: admin, isAdmin: admin, createdAt: serverTimestamp(),
  });
  return cred.user;
}

export function teacherSignIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/* ---------- Brouillons locaux (ordinateurs partagés) ----------
 * Les réponses sont gardées dans le navigateur sous une clé
 * `lmtechno-rep:{classId}/{sid}:{page}`. Sur un poste partagé entre plusieurs
 * classes, il faut effacer celles des AUTRES élèves : sinon le suivant relit
 * le travail du précédent. `keepScope` conserve les brouillons de l'élève
 * indiqué (utile quand il se reconnecte sur son propre appareil). */
export function clearLocalAnswers(keepScope) {
  try {
    const kill = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || k.indexOf("lmtechno-rep:") !== 0) continue;
      if (keepScope && k.indexOf("lmtechno-rep:" + keepScope + ":") === 0) continue;
      kill.push(k);
    }
    kill.forEach((k) => localStorage.removeItem(k));
    return kill.length;
  } catch (e) { return 0; }
}

export function logout() {
  try { localStorage.removeItem("lmtechno-eleve"); } catch (e) {}
  clearLocalAnswers(null); // rien ne doit rester sur un poste partagé
  return signOut(auth);
}

export function onAuth(cb) {
  if (!auth) { cb({ role: null, user: null }); return () => {}; }
  return onAuthStateChanged(auth, (user) => {
    if (!user) return cb({ role: null, user: null });
    cb({ role: user.isAnonymous ? "eleve" : "prof", user });
  });
}

export async function myTeacher() {
  const s = await get(ref(db, "teachers/" + auth.currentUser.uid));
  return s.exists() ? { id: auth.currentUser.uid, ...s.val() } : null;
}

// Crée le profil professeur s'il manque, et répare/promeut l'admin au besoin.
// Corrige le cas où le compte Auth a été créé avant que la base ou les règles
// ne soient prêtes (aucun profil écrit).
export async function ensureTeacher() {
  const u = auth.currentUser;
  const mail = (u.email || "").trim().toLowerCase();
  const admin = mail === ADMIN_EMAIL;
  const r = ref(db, "teachers/" + u.uid);
  const s = await get(r);
  if (s.exists()) {
    const v = s.val();
    if (admin && (v.approved !== true || v.isAdmin !== true)) {
      await update(r, { approved: true, isAdmin: true });
      return { id: u.uid, ...v, approved: true, isAdmin: true };
    }
    return { id: u.uid, ...v };
  }
  const rec = { name: u.displayName || "", email: mail, approved: admin, isAdmin: admin, createdAt: serverTimestamp() };
  await set(r, rec);
  return { id: u.uid, ...rec };
}

/* ---------- Administration ---------- */

export async function listPendingTeachers() {
  const s = await get(query(ref(db, "teachers"), orderByChild("approved"), equalTo(false)));
  return toList(s);
}
export async function approveTeacher(uid) {
  await update(ref(db, "teachers/" + uid), { approved: true });
}
export async function rejectTeacher(uid) {
  await remove(ref(db, "teachers/" + uid));
}
// Tous les professeurs (approuvés + en attente) — pour la gestion des niveaux.
export async function listTeachers() {
  const s = await get(ref(db, "teachers"));
  return toList(s);
}

/* ---------- Niveaux autorisés par professeur (restriction posée par l'admin) ----------
 * teacherSections/{uid} = { "5eme": true, ... }  — nœud écrit UNIQUEMENT par l'admin.
 * Absent (ou vide) = le professeur peut utiliser TOUS les niveaux (comportement par défaut).
 * Renvoie un tableau de niveaux, ou null si aucune restriction. */

function sectionsFromSnap(s) {
  if (!s.exists()) return null;
  const v = s.val() || {};
  const list = Object.keys(v).filter((k) => v[k]);
  return list.length ? list : null;
}
// Niveaux autorisés du professeur connecté.
export async function mySections() {
  return sectionsFromSnap(await get(ref(db, "teacherSections/" + auth.currentUser.uid)));
}
// Niveaux autorisés d'un professeur donné (admin).
export async function getTeacherSections(uid) {
  return sectionsFromSnap(await get(ref(db, "teacherSections/" + uid)));
}
// Définit (admin) les niveaux autorisés d'un professeur. [] ou null => aucune restriction.
export async function setTeacherSections(uid, sections) {
  if (!sections || !sections.length) { await remove(ref(db, "teacherSections/" + uid)); return; }
  const map = {};
  for (const s of sections) map[s] = true;
  await set(ref(db, "teacherSections/" + uid), map);
}

/* ---------- Classes (côté professeur) ---------- */

export async function createClass(name, section) {
  const uid = auth.currentUser.uid;
  const allowed = await mySections();
  if (allowed && !allowed.includes(section)) {
    throw new Error("Ce niveau ne fait pas partie des niveaux autorisés pour votre compte.");
  }
  let code, taken = true, tries = 0;
  do { code = makeCode(); taken = (await get(ref(db, "classCodes/" + code))).exists(); }
  while (taken && ++tries < 8);
  const newRef = push(ref(db, "classes/" + uid));
  const id = newRef.key;
  await set(newRef, { name, section: section || "", teacherUid: uid, code, createdAt: serverTimestamp() });
  await set(ref(db, "classCodes/" + code), { classId: id, teacherUid: uid });
  return { id, code, name, section: section || "" };
}

export async function listMyClasses() {
  const uid = auth.currentUser.uid;
  const s = await get(ref(db, "classes/" + uid));
  return toList(s);
}

// Supprime la classe ET toutes les données rattachées (droit à l'effacement).
// L'ordre compte : les règles autorisent ces suppressions parce que la classe
// appartient encore au professeur — on efface donc `classes/...` en DERNIER.
export async function deleteClass(classId, code) {
  const uid = auth.currentUser.uid;
  await remove(ref(db, "work/" + classId));
  await remove(ref(db, "groupwork/" + classId));
  await remove(ref(db, "groups/" + classId));
  await remove(ref(db, "students/" + classId));
  await remove(ref(db, "roster/" + classId));
  if (code) await remove(ref(db, "classCodes/" + code)).catch(() => {});
  await remove(ref(db, "classes/" + uid + "/" + classId));
}

/* ---------- Trombinoscope léger (roster) ----------
 * roster/{classId}/{sid} = prénom affiché.
 * `students/` contient aussi la progression et les scores : il reste réservé au
 * professeur. Le roster n'expose QUE les prénoms, pour que les élèves puissent
 * composer leur îlot eux-mêmes. Écriture réservée au professeur propriétaire. */

export async function listRoster(classId) {
  await ensureAnon();
  const s = await get(ref(db, "roster/" + classId));
  const out = [];
  s.forEach((c) => out.push({ sid: c.key, firstName: c.val() }));
  out.sort((a, b) => String(a.firstName).localeCompare(String(b.firstName)));
  return out;
}

// Réaligne le roster sur la liste des élèves (appelé par le tableau de bord :
// met à jour les classes existantes sans migration manuelle).
export async function syncRoster(classId, students) {
  const map = {};
  for (const st of students) map[st.id] = st.firstName || st.pseudo || "";
  await set(ref(db, "roster/" + classId), map);
}

// Ajoute un élève avec identifiant = pseudo + NUMÉRO.
// Le numéro est unique DANS LA CLASSE (Léa 1, Marc 2, Sofia 3…) : auparavant il
// repartait de 1 pour chaque prénom, si bien que presque tout le monde était
// « 1 ». Retourne { sid, label }.
export async function addStudent(classId, pseudo) {
  const base = normId(pseudo);
  if (!base) throw new Error("Pseudo invalide.");
  const snap = await get(ref(db, "students/" + classId));
  const taken = new Set();
  let maxN = 0;
  snap.forEach((c) => {
    taken.add(c.key);
    const n = Number((c.val() || {}).number);
    if (Number.isFinite(n) && n > maxN) maxN = n;
  });
  let n = maxN + 1;
  let sid = base + "-" + n;
  while (taken.has(sid)) { n++; sid = base + "-" + n; }
  const label = pseudo.trim() + " " + n;
  await update(ref(db, "students/" + classId + "/" + sid), {
    firstName: label, pseudo: pseudo.trim(), number: n, createdAt: serverTimestamp(),
  });
  await set(ref(db, "roster/" + classId + "/" + sid), label);
  return { sid, label };
}

export async function removeStudent(classId, sid) {
  await remove(ref(db, "work/" + classId + "/" + sid));
  await remove(ref(db, "students/" + classId + "/" + sid));
  await remove(ref(db, "roster/" + classId + "/" + sid));
}

export async function listStudents(classId) {
  const s = await get(ref(db, "students/" + classId));
  return toList(s);
}

export async function loadStudentWork(classId, sid) {
  await ensureAnon();
  const s = await get(ref(db, "work/" + classId + "/" + sid));
  const out = [];
  s.forEach((c) => { out.push({ pageKey: c.key, ...c.val() }); });
  return out;
}

/* Toutes les réponses écrites d'une classe, regroupées par page — c'est ainsi
 * qu'un professeur corrige : une question, toutes les réponses à la suite.
 * Les règles n'autorisent la lecture que sous `work/{classe}/{élève}` : on lit
 * donc élève par élève (en parallèle) plutôt que la classe d'un bloc.
 * Renvoie [{ pageKey, title, path, entries: [{ who, idx, label, text }] }]. */
export async function loadClassAnswers(classId, students, groups) {
  await ensureAnon();
  const pages = new Map();
  const page = (key, title, path) => {
    if (!pages.has(key)) pages.set(key, { pageKey: key, title: title || key, path: path || "", entries: [] });
    const p = pages.get(key);
    if (title && (!p.title || p.title === key)) p.title = title;
    if (path && !p.path) p.path = path;
    return p;
  };

  await Promise.all((students || []).map(async (st) => {
    const snap = await get(ref(db, "work/" + classId + "/" + st.id)).catch(() => null);
    if (!snap || !snap.exists()) return;
    snap.forEach((c) => {
      const w = c.val() || {};
      const answers = w.answers || {};
      const labels = w.labels || {};
      const keys = Object.keys(answers).sort((a, b) => Number(a) - Number(b));
      if (!keys.length) return;
      const p = page(c.key, w.title, w.path);
      keys.forEach((k) => p.entries.push({ who: st.firstName || st.id, idx: Number(k), label: labels[k] || "", text: answers[k] }));
    });
  }));

  await Promise.all((groups || []).map(async (g) => {
    const snap = await get(ref(db, "groupwork/" + classId + "/" + g.id)).catch(() => null);
    if (!snap || !snap.exists()) return;
    snap.forEach((c) => {
      const w = c.val() || {};
      const answers = w.answers || {};
      const keys = Object.keys(answers).sort((a, b) => Number(a) - Number(b));
      if (!keys.length) return;
      const p = page(c.key, w.title, w.path);
      keys.forEach((k) => {
        const a = answers[k] || {};
        if (!String(a.text || "").trim()) return;
        p.entries.push({ who: "👥 " + g.name + (a.by ? " · " + a.by : ""), idx: Number(k), label: a.label || "", text: a.text });
      });
    });
  }));

  const out = [...pages.values()];
  out.forEach((p) => p.entries.sort((a, b) => a.idx - b.idx || String(a.who).localeCompare(String(b.who))));
  out.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  return out;
}

/* ---------- Connexion élève (code de classe + pseudo) ---------- */

export async function studentJoin(code, firstName) {
  code = String(code || "").trim().toUpperCase();
  await ensureAnon(); // se connecter AVANT de lire (les règles exigent auth != null)
  const map = await get(ref(db, "classCodes/" + code));
  if (!map.exists()) throw new Error("Code de classe inconnu.");
  const { classId, teacherUid } = map.val();
  const sid = normId(firstName);
  const sdoc = await get(ref(db, "students/" + classId + "/" + sid));
  if (!sdoc.exists()) {
    throw new Error("Pseudo non reconnu dans cette classe. Écris-le exactement comme ton professeur te l'a donné (avec le numéro).");
  }
  const cls = await get(ref(db, "classes/" + teacherUid + "/" + classId));
  const session = {
    classId, sid,
    firstName: (sdoc.val().firstName || firstName).trim(),
    className: cls.exists() ? cls.val().name : "",
    section: cls.exists() ? (cls.val().section || "") : "",
  };
  // Poste partagé : on efface les brouillons de tous les AUTRES élèves, et on
  // garde ceux de celui qui se connecte (son travail est de toute façon
  // rechargé depuis la base par sync.js).
  clearLocalAnswers(classId + "/" + sid);
  try { localStorage.setItem("lmtechno-eleve", JSON.stringify(session)); } catch (e) {}
  return session;
}

export function currentStudent() {
  try { return JSON.parse(localStorage.getItem("lmtechno-eleve") || "null"); } catch (e) { return null; }
}

/* ---------- Travail de l'élève (réponses + quiz) ---------- */

async function ensureAnon() {
  if (auth && !auth.currentUser) await signInAnonymously(auth);
}

export async function saveWork(classId, sid, pageKey, data) {
  await ensureAnon();
  await update(ref(db, "work/" + classId + "/" + sid + "/" + pageKey), {
    ...data, updatedAt: serverTimestamp(),
  });
  // Résumé de progression sur le nœud élève (pour le tableau de bord).
  await update(ref(db, "students/" + classId + "/" + sid), { lastActive: serverTimestamp() });
  await update(ref(db, "students/" + classId + "/" + sid + "/progress/" + pageKey), {
    quiz: data.quiz || null,
    // En îlot, les réponses vivent dans le groupe : on compte celles de l'îlot.
    answered: data.answers ? Object.keys(data.answers).length : (data.groupAnswers || 0),
    title: data.title || "",
  });
}

/* En îlot, une réponse écrite par UN membre vaut pour TOUT l'îlot : on inscrit
 * la progression sur chaque membre, pour que le tableau de bord du professeur
 * et l'espace de chaque élève la reflètent. Le texte, lui, reste unique dans
 * `groupwork/` — on ne duplique qu'un compteur. */
export async function markGroupAnswered(classId, groupId, pageKey, answered, title) {
  await ensureAnon();
  const g = await get(ref(db, "groups/" + classId + "/" + groupId + "/members"));
  if (!g.exists()) return 0;
  const sids = Object.keys(g.val() || {});
  await Promise.all(sids.map((sid) =>
    update(ref(db, "students/" + classId + "/" + sid + "/progress/" + pageKey), {
      answered, title: title || "", viaGroup: groupId,
    }).catch(() => {})
  ));
  return sids.length;
}

export async function loadWork(classId, sid, pageKey) {
  await ensureAnon();
  const s = await get(ref(db, "work/" + classId + "/" + sid + "/" + pageKey));
  return s.exists() ? s.val() : null;
}

/* ---------- Groupes d'îlot (travail collaboratif) ----------
 * groups/{classId}/{groupId}   : { name, members: {sid: prénom}, createdAt }
 * groupwork/{classId}/{groupId}/{pageKey} :
 *   { title, answers: {idx: {text, by, at}}, updatedAt }
 * Les réponses d'un membre apparaissent en direct chez les autres (onValue).
 */

function saveSession(patch) {
  try {
    const s = JSON.parse(localStorage.getItem("lmtechno-eleve") || "null") || {};
    Object.assign(s, patch);
    localStorage.setItem("lmtechno-eleve", JSON.stringify(s));
    return s;
  } catch (e) { return null; }
}

export async function listGroups(classId) {
  await ensureAnon();
  const s = await get(ref(db, "groups/" + classId));
  const out = [];
  s.forEach((c) => {
    const v = c.val() || {};
    out.push({ id: c.key, name: v.name || c.key, members: v.members || {} });
  });
  return out;
}

// `members` : { sid: prénom } des camarades choisis par le créateur de l'îlot.
// Le créateur en fait toujours partie, même s'il ne s'est pas coché.
export async function createGroup(classId, name, sid, firstName, members) {
  await ensureAnon();
  const clean = String(name || "").trim().slice(0, 40);
  if (!clean) throw new Error("Donne un nom à ton groupe.");
  const all = Object.assign({}, members || {}, { [sid]: firstName });
  const r = push(ref(db, "groups/" + classId));
  await set(r, { name: clean, createdAt: serverTimestamp(), members: all });
  await detachFromOtherGroups(classId, Object.keys(all), r.key);
  saveSession({ groupId: r.key, groupName: clean });
  return { id: r.key, name: clean };
}

// Un élève ne travaille que dans UN îlot : on le retire des autres.
async function detachFromOtherGroups(classId, sids, keepGroupId) {
  if (!sids.length) return;
  const all = await listGroups(classId);
  for (const g of all) {
    if (g.id === keepGroupId) continue;
    for (const sid of sids) {
      if (g.members && g.members[sid]) {
        await remove(ref(db, "groups/" + classId + "/" + g.id + "/members/" + sid));
      }
    }
  }
}

// Remplace la composition d'un îlot (ajout/retrait de camarades).
export async function setGroupMembers(classId, groupId, members) {
  await ensureAnon();
  await set(ref(db, "groups/" + classId + "/" + groupId + "/members"), members || {});
  await detachFromOtherGroups(classId, Object.keys(members || {}), groupId);
}

// Répartition aléatoire de la classe en îlots équilibrés (côté professeur).
// `size` = nombre d'élèves visé par îlot ; la répartition en tourniquet évite
// qu'il reste un îlot d'un seul élève. `replace` efface les îlots existants
// (et leur travail partagé) : l'appelant doit avoir demandé confirmation.
export async function shuffleIntoGroups(classId, students, size, replace) {
  const list = (students || []).filter((s) => s && s.id);
  if (!list.length) throw new Error("Aucun élève dans cette classe.");
  if (replace) {
    for (const g of await listGroups(classId)) await removeGroup(classId, g.id);
  }
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  const per = Math.min(Math.max(2, Number(size) || 4), Math.max(2, arr.length));
  const count = Math.max(1, Math.ceil(arr.length / per));
  const buckets = Array.from({ length: count }, () => []);
  arr.forEach((st, i) => buckets[i % count].push(st));
  const made = [];
  for (let i = 0; i < buckets.length; i++) {
    const members = {};
    for (const st of buckets[i]) members[st.id] = st.firstName || st.pseudo || "";
    made.push(await createGroupForClass(classId, "Îlot " + (i + 1), members));
  }
  return made;
}

// Création d'un îlot par le PROFESSEUR depuis son tableau de bord : il choisit
// les élèves, sans faire partie du groupe et sans toucher à la session élève.
export async function createGroupForClass(classId, name, members) {
  const clean = String(name || "").trim().slice(0, 40);
  if (!clean) throw new Error("Donne un nom à l'îlot.");
  const r = push(ref(db, "groups/" + classId));
  await set(r, { name: clean, createdAt: serverTimestamp(), members: members || {} });
  await detachFromOtherGroups(classId, Object.keys(members || {}), r.key);
  return { id: r.key, name: clean };
}

// Retrouve l'îlot auquel appartient un élève — source de vérité côté base,
// pour qu'un élève AJOUTÉ par un camarade voie son groupe sans rien faire.
export async function findMyGroup(classId, sid) {
  const groups = await listGroups(classId);
  return groups.find((g) => g.members && g.members[sid]) || null;
}

export async function joinGroup(classId, groupId, sid, firstName) {
  await ensureAnon();
  const g = await get(ref(db, "groups/" + classId + "/" + groupId));
  if (!g.exists()) throw new Error("Ce groupe n'existe plus.");
  await update(ref(db, "groups/" + classId + "/" + groupId + "/members"), { [sid]: firstName });
  saveSession({ groupId, groupName: (g.val() || {}).name || "" });
  return { id: groupId, name: (g.val() || {}).name || "" };
}

export async function leaveGroup(classId, groupId, sid) {
  await ensureAnon();
  await remove(ref(db, "groups/" + classId + "/" + groupId + "/members/" + sid));
  saveSession({ groupId: null, groupName: null });
}

// Écoute en direct les réponses de groupe d'une page. Retourne l'arrêt d'écoute.
export function watchGroupAnswers(classId, groupId, pageKey, cb) {
  const r = ref(db, "groupwork/" + classId + "/" + groupId + "/" + pageKey + "/answers");
  return onValue(r, (snap) => cb(snap.val() || {}));
}

export async function saveGroupAnswer(classId, groupId, pageKey, idx, text, by, title, label, path) {
  await ensureAnon();
  await set(ref(db, "groupwork/" + classId + "/" + groupId + "/" + pageKey + "/answers/" + idx),
    { text, by, at: serverTimestamp(), label: label || "" });
  await update(ref(db, "groupwork/" + classId + "/" + groupId + "/" + pageKey),
    { title: title || "", updatedAt: serverTimestamp(), lastBy: by, path: path || "" });
}

// Côté professeur : travail d'un groupe, page par page.
export async function loadGroupWork(classId, groupId) {
  await ensureAnon();
  const s = await get(ref(db, "groupwork/" + classId + "/" + groupId));
  const out = [];
  s.forEach((c) => { out.push({ pageKey: c.key, ...c.val() }); });
  return out;
}

export async function removeGroup(classId, groupId) {
  await remove(ref(db, "groupwork/" + classId + "/" + groupId));
  await remove(ref(db, "groups/" + classId + "/" + groupId));
}
