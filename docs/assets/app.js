/* ============================================================================
   Espaces « Technologie & SNT » — logique Firebase (authentification + données)
   Module ES partagé par les pages connexion / prof / élève et par la
   synchronisation des pages de cours.
   ============================================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, signInAnonymously, updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc,
  query, where, serverTimestamp, deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* ---------- Configuration & initialisation ---------- */

const cfg = window.LMTECHNO_FIREBASE || {};

// Adresse de l'administrateur (prof qui approuve les nouveaux comptes profs).
// Doit correspondre à la valeur codée dans firestore.rules.
export const ADMIN_EMAIL = String(cfg.adminEmail || "ebechalani@gmail.com").trim().toLowerCase();

export function isConfigured() {
  return !!(cfg.apiKey && cfg.projectId && !String(cfg.apiKey).includes("VOTRE_"));
}

let app, auth, db;
if (isConfigured()) {
  app = initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };

/* ---------- Utilitaires ---------- */

// Identifiant technique d'un élève à partir de son prénom (ASCII, minuscules).
export function normId(name) {
  return String(name || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Code de classe aléatoire lisible (sans caractères ambigus).
function makeCode() {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}

// Clé de page de cours (à partir du chemin d'URL).
export function pageKeyFromPath(pathname) {
  return String(pathname || location.pathname)
    .replace(/index\.html$/, "").replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_") || "accueil";
}

/* ---------- Authentification professeur ---------- */

export async function teacherSignUp(email, password, name) {
  const mail = email.trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) await updateProfile(cred.user, { displayName: name });
  const admin = mail === ADMIN_EMAIL;
  await setDoc(doc(db, "teachers", cred.user.uid), {
    name: name || "", email: mail,
    approved: admin,   // l'admin est approuvé d'office ; les autres attendent
    isAdmin: admin,
    createdAt: serverTimestamp(),
  });
  return cred.user;
}

// Profil du professeur connecté (dont approved / isAdmin).
export async function myTeacher() {
  const d = await getDoc(doc(db, "teachers", auth.currentUser.uid));
  return d.exists() ? { id: d.id, ...d.data() } : null;
}

/* ---------- Administration (approbation des professeurs) ---------- */

export async function listPendingTeachers() {
  const snap = await getDocs(query(collection(db, "teachers"), where("approved", "==", false)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function approveTeacher(uid) {
  await setDoc(doc(db, "teachers", uid), { approved: true }, { merge: true });
}
export async function rejectTeacher(uid) {
  await deleteDoc(doc(db, "teachers", uid));
}

export function teacherSignIn(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function logout() {
  try { localStorage.removeItem("lmtechno-eleve"); } catch (e) {}
  return signOut(auth);
}

// cb reçoit { role: 'prof'|'eleve'|null, user }
export function onAuth(cb) {
  if (!auth) { cb({ role: null, user: null }); return () => {}; }
  return onAuthStateChanged(auth, (user) => {
    if (!user) return cb({ role: null, user: null });
    cb({ role: user.isAnonymous ? "eleve" : "prof", user });
  });
}

/* ---------- Classes (côté professeur) ---------- */

export async function createClass(name) {
  const uid = auth.currentUser.uid;
  let code, taken = true, tries = 0;
  do { code = makeCode(); taken = (await getDoc(doc(db, "classCodes", code))).exists(); }
  while (taken && ++tries < 8);
  const ref = await addDoc(collection(db, "classes"), {
    name, teacherUid: uid, code, createdAt: serverTimestamp(),
  });
  await setDoc(doc(db, "classCodes", code), { classId: ref.id, teacherUid: uid });
  return { id: ref.id, code, name };
}

export async function listMyClasses() {
  const uid = auth.currentUser.uid;
  const snap = await getDocs(query(collection(db, "classes"), where("teacherUid", "==", uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteClass(classId, code) {
  // RGPD : supprime les élèves, leur travail, le code et la classe.
  const studs = await getDocs(collection(db, "classes", classId, "students"));
  for (const s of studs.docs) {
    const work = await getDocs(collection(db, "classes", classId, "students", s.id, "work"));
    for (const w of work.docs) await deleteDoc(w.ref);
    await deleteDoc(s.ref);
  }
  if (code) await deleteDoc(doc(db, "classCodes", code)).catch(() => {});
  await deleteDoc(doc(db, "classes", classId));
}

// Ajoute un élève avec un identifiant = pseudo + NUMÉRO UNIQUE dans la classe.
// Retourne { sid, label } ; `label` (ex. « Léa 3 ») est le code à donner à l'élève.
export async function addStudent(classId, pseudo) {
  const base = normId(pseudo);
  if (!base) throw new Error("Pseudo invalide.");
  let n = 1, sid;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    sid = base + "-" + n;
    const ex = await getDoc(doc(db, "classes", classId, "students", sid));
    if (!ex.exists()) break;
    n++;
  }
  const label = pseudo.trim() + " " + n;
  await setDoc(doc(db, "classes", classId, "students", sid), {
    firstName: label, pseudo: pseudo.trim(), number: n, createdAt: serverTimestamp(),
  }, { merge: true });
  return { sid, label };
}

export async function removeStudent(classId, sid) {
  const work = await getDocs(collection(db, "classes", classId, "students", sid, "work"));
  for (const w of work.docs) await deleteDoc(w.ref);
  await deleteDoc(doc(db, "classes", classId, "students", sid));
}

export async function listStudents(classId) {
  const snap = await getDocs(collection(db, "classes", classId, "students"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Détail du travail d'un élève (tableau de bord prof, ou espace élève).
export async function loadStudentWork(classId, sid) {
  await ensureAnon();
  const snap = await getDocs(collection(db, "classes", classId, "students", sid, "work"));
  return snap.docs.map((d) => ({ pageKey: d.id, ...d.data() }));
}

/* ---------- Connexion élève (code de classe + prénom) ---------- */

export async function studentJoin(code, firstName) {
  code = String(code || "").trim().toUpperCase();
  const map = await getDoc(doc(db, "classCodes", code));
  if (!map.exists()) throw new Error("Code de classe inconnu.");
  const { classId } = map.data();
  await signInAnonymously(auth);
  const sid = normId(firstName);
  const sref = doc(db, "classes", classId, "students", sid);
  const sdoc = await getDoc(sref);
  if (!sdoc.exists()) {
    throw new Error("Pseudo non reconnu dans cette classe. Écris-le exactement comme ton professeur te l'a donné (avec le numéro).");
  }
  const cls = await getDoc(doc(db, "classes", classId));
  const session = {
    classId, sid, firstName: (sdoc.data().firstName || firstName).trim(),
    className: cls.exists() ? cls.data().name : "",
  };
  try { localStorage.setItem("lmtechno-eleve", JSON.stringify(session)); } catch (e) {}
  return session;
}

export function currentStudent() {
  try { return JSON.parse(localStorage.getItem("lmtechno-eleve") || "null"); } catch (e) { return null; }
}

/* ---------- Travail de l'élève (réponses + quiz) ---------- */

// S'assure d'une session Firebase anonyme (pour réécrire depuis un autre appareil).
async function ensureAnon() {
  if (!auth.currentUser) await signInAnonymously(auth);
}

export async function saveWork(classId, sid, pageKey, data) {
  await ensureAnon();
  await setDoc(doc(db, "classes", classId, "students", sid, "work", pageKey),
    { ...data, updatedAt: serverTimestamp() }, { merge: true });
  // Résumé de progression sur le document élève (pour le tableau de bord).
  const summary = { lastActive: serverTimestamp() };
  summary["progress." + pageKey] = {
    quiz: data.quiz || null,
    answered: data.answers ? Object.keys(data.answers).length : 0,
    title: data.title || "",
  };
  await setDoc(doc(db, "classes", classId, "students", sid), {
    progress: { [pageKey]: { quiz: data.quiz || null, answered: data.answers ? Object.keys(data.answers).length : 0, title: data.title || "" } },
    lastActive: serverTimestamp(),
  }, { merge: true });
}

export async function loadWork(classId, sid, pageKey) {
  await ensureAnon();
  const d = await getDoc(doc(db, "classes", classId, "students", sid, "work", pageKey));
  return d.exists() ? d.data() : null;
}
