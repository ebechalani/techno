/* ============================================================================
   CONFIGURATION FIREBASE — à remplir avec les valeurs de VOTRE projet.
   ----------------------------------------------------------------------------
   1. Créez un projet sur https://console.firebase.google.com
   2. Ajoutez une application « Web » (</>) et copiez l'objet firebaseConfig.
   3. Collez les valeurs ci-dessous (remplacez les « VOTRE_… »).
   Voir le guide complet : FIREBASE-SETUP.md

   ⚠️ Ces valeurs ne sont PAS des secrets : elles identifient votre projet et
   sont conçues pour figurer dans le code côté navigateur. La sécurité est
   assurée par les règles Firestore (firestore.rules), pas par ces clés.
   ============================================================================ */
window.LMTECHNO_FIREBASE = {
  apiKey: "AIzaSyC5CmXZq9rckDHtMY_sXmnBRWPcGmGMwls",
  authDomain: "techno-ea268.firebaseapp.com",
  projectId: "techno-ea268",
  storageBucket: "techno-ea268.firebasestorage.app",
  messagingSenderId: "132439983873",
  appId: "1:132439983873:web:620a4048a885d6a3d8fd00",
  measurementId: "G-VV0RE8M40V",

  // ⚠️ À COMPLÉTER : URL de la Realtime Database. Après avoir créé la base
  // (Build → Realtime Database → Créer), copiez l'URL affichée en haut, du type
  // https://techno-ea268-default-rtdb.europe-west1.firebasedatabase.app
  databaseURL: "https://techno-ea268-default-rtdb.europe-west1.firebasedatabase.app",

  // Administrateur : ce professeur est approuvé d'office et peut valider les
  // autres comptes professeurs. Doit être IDENTIQUE à l'e-mail codé dans
  // firestore.rules (fonction isAdmin()).
  adminEmail: "ebechalani@gmail.com",
};
