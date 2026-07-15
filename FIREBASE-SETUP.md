# Activer les espaces (prof + élèves) avec Firebase

Le site fonctionne sans Firebase. Les « espaces » (compte professeur, tableau
de bord, comptes élèves qui sauvegardent leurs réponses et scores) nécessitent
un projet **Firebase** gratuit. Voici comment l'activer — **une seule fois**,
en ~10 minutes. Aucune carte bancaire n'est demandée (offre gratuite « Spark »).

> ℹ️ Je ne peux pas créer le compte Firebase à votre place (il faut vos
> identifiants Google) : suivez ces étapes, puis collez la configuration.

## 1. Créer le projet

1. Allez sur **https://console.firebase.google.com** et connectez-vous avec un
   compte Google.
2. **« Créer un projet »** → nommez-le (ex. `lmtechno`) → validez (vous pouvez
   désactiver Google Analytics, ce n'est pas nécessaire).

## 2. Ajouter une application Web et récupérer la configuration

1. Dans le projet, cliquez sur l'icône **Web `</>`** (« Ajouter une application »).
2. Donnez un surnom (ex. `site`), **sans** hébergement Firebase, puis
   **« Enregistrer l'application »**.
3. Firebase affiche un bloc `const firebaseConfig = { … }`. Copiez ces valeurs.
4. Ouvrez le fichier **`src/app/assets/firebase-config.js`** (dans ce dépôt,
   modifiable directement sur github.com) et **remplacez les `VOTRE_…`** par vos
   valeurs (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId).

> Ces valeurs ne sont pas secrètes : elles identifient le projet. La sécurité
> vient des **règles Firestore** (étape 4).

## 3. Activer l'authentification

1. Menu de gauche → **Build → Authentication → « Commencer »**.
2. Onglet **« Sign-in method »**, activez **deux** fournisseurs :
   - **E-mail/Mot de passe** (pour les professeurs),
   - **Anonyme** (pour les élèves).

## 4. Créer la base de données (Realtime Database — gratuite) et poser les règles

> On utilise la **Realtime Database**, incluse dans l'offre **gratuite** (Spark),
> **sans carte bancaire**. (Firestore, lui, réclame désormais souvent un plan
> payant « Blaze ».)

1. Menu de gauche → **Build → Realtime Database → « Créer une base de données »**.
2. Choisissez une **région** (ex. *Belgium — europe-west1*), puis **« Démarrer
   en mode verrouillé »**.
3. En haut de la page s'affiche l'**URL de la base**, du type
   `https://techno-ea268-default-rtdb.europe-west1.firebasedatabase.app`.
   **Copiez-la** et collez-la dans `src/app/assets/firebase-config.js` à la ligne
   **`databaseURL`** (à la place de `VOTRE_DATABASE_URL`).
4. Onglet **« Règles »** : effacez tout, collez le contenu du fichier
   **`database.rules.json`** (à la racine de ce dépôt), puis **« Publier »**.

## 5. Publier

Enregistrez vos modifications de `firebase-config.js` (commit sur github.com).
Le site se reconstruit et se redéploie automatiquement. C'est prêt !

## 6. Premier usage

1. **Créez d'abord le compte administrateur.** Sur le site, cliquez
   **« 👤 Espace »** → onglet **Professeur** → **« Créer un compte professeur »**
   en utilisant **l'e-mail administrateur** (`ebechalani@gmail.com`) + un mot de
   passe. Ce compte est **approuvé automatiquement** et peut **valider les autres
   professeurs**.
2. **Les autres professeurs** créent leur compte de la même façon : il reste
   **« en attente »** jusqu'à ce que l'administrateur l'approuve depuis son
   tableau de bord (encart **👑 Administration**).
3. Une fois approuvé, un professeur **crée une classe** : un **code** est généré
   (ex. `ABC123`).
4. Il **ajoute ses élèves** par un **pseudo** ; le système attribue à chacun un
   **numéro unique** (ex. « Léa 3 »). C'est l'identifiant, sans nom réel — mieux
   pour la vie privée, et pas de doublon entre deux « Léa ».
5. Donnez à chaque élève le **code de la classe** + son **pseudo** (ex. `ABC123`
   et « Léa 3 »). Il se connecte via **« 👤 Espace » → Élève** ; ses réponses et
   scores de quiz se sauvegardent et le suivent sur tous ses appareils.
6. Vous suivez tout depuis votre **tableau de bord** (séances travaillées, scores).

> 🔑 **Changer d'administrateur ?** Modifiez `adminEmail` dans
> `src/app/assets/firebase-config.js` **et** l'e-mail dans `firestore.rules`
> (fonction `isAdmin`) — les deux doivent rester identiques.

## Vie privée (RGPD)

- On ne stocke que le **prénom** de l'élève et son travail scolaire — aucune
  autre donnée personnelle. N'y mettez rien de sensible.
- Le bouton **« Supprimer »** d'une classe (ou le **×** d'un élève) efface
  définitivement les données correspondantes (droit à l'effacement).
- Informez élèves et familles conformément à la politique de votre établissement.
- L'identifiant « prénom + code de classe » n'est **pas** une authentification
  forte : c'est adapté à des devoirs, pas à des notes officielles ou des données
  confidentielles.
