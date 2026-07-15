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
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJET.firebaseapp.com",
  projectId: "VOTRE_PROJET",
  storageBucket: "VOTRE_PROJET.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID",

  // Administrateur : ce professeur est approuvé d'office et peut valider les
  // autres comptes professeurs. Doit être IDENTIQUE à l'e-mail codé dans
  // firestore.rules (fonction isAdmin()).
  adminEmail: "ebechalani@gmail.com",
};
