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

export function logout() {
  try { localStorage.removeItem("lmtechno-eleve"); } catch (e) {}
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

/* ---------- Classes (côté professeur) ---------- */

export async function createClass(name, section) {
  const uid = auth.currentUser.uid;
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

export async function deleteClass(classId, code) {
  const uid = auth.currentUser.uid;
  await remove(ref(db, "work/" + classId));
  await remove(ref(db, "students/" + classId));
  if (code) await remove(ref(db, "classCodes/" + code)).catch(() => {});
  await remove(ref(db, "classes/" + uid + "/" + classId));
}

// Ajoute un élève avec identifiant = pseudo + NUMÉRO UNIQUE. Retourne { sid, label }.
export async function addStudent(classId, pseudo) {
  const base = normId(pseudo);
  if (!base) throw new Error("Pseudo invalide.");
  let n = 1, sid;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    sid = base + "-" + n;
    if (!(await get(ref(db, "students/" + classId + "/" + sid))).exists()) break;
    n++;
  }
  const label = pseudo.trim() + " " + n;
  await update(ref(db, "students/" + classId + "/" + sid), {
    firstName: label, pseudo: pseudo.trim(), number: n, createdAt: serverTimestamp(),
  });
  return { sid, label };
}

export async function removeStudent(classId, sid) {
  await remove(ref(db, "work/" + classId + "/" + sid));
  await remove(ref(db, "students/" + classId + "/" + sid));
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
    answered: data.answers ? Object.keys(data.answers).length : 0,
    title: data.title || "",
  });
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

export async function createGroup(classId, name, sid, firstName) {
  await ensureAnon();
  const clean = String(name || "").trim().slice(0, 40);
  if (!clean) throw new Error("Donne un nom à ton groupe.");
  const r = push(ref(db, "groups/" + classId));
  await set(r, { name: clean, createdAt: serverTimestamp(), members: { [sid]: firstName } });
  saveSession({ groupId: r.key, groupName: clean });
  return { id: r.key, name: clean };
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

export async function saveGroupAnswer(classId, groupId, pageKey, idx, text, by, title) {
  await ensureAnon();
  await set(ref(db, "groupwork/" + classId + "/" + groupId + "/" + pageKey + "/answers/" + idx),
    { text, by, at: serverTimestamp() });
  await update(ref(db, "groupwork/" + classId + "/" + groupId + "/" + pageKey),
    { title: title || "", updatedAt: serverTimestamp(), lastBy: by });
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
