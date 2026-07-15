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

## 4. Créer la base de données et poser les règles

1. Menu de gauche → **Build → Firestore Database → « Créer une base de données »**.
2. Choisissez **mode production**, puis une région (ex. `europe-west`).
3. Une fois créée, onglet **« Règles »** : effacez tout, collez le contenu du
   fichier **`firestore.rules`** (à la racine de ce dépôt), puis **« Publier »**.

## 5. Publier

Enregistrez vos modifications de `firebase-config.js` (commit sur github.com).
Le site se reconstruit et se redéploie automatiquement. C'est prêt !

## 6. Premier usage

1. Sur le site, cliquez **« 👤 Espace »** → onglet **Professeur** →
   **« Créer un compte professeur »** (votre e-mail + un mot de passe).
2. **Créez une classe** : un **code** est généré (ex. `ABC123`).
3. **Ajoutez vos élèves** par leur **prénom** (mettez « Léa M. », « Léa B. » s'il
   y a des homonymes — c'est l'identifiant que l'élève tapera).
4. Donnez à chaque élève le **code de la classe** + son **prénom** exact.
   Il se connecte via **« 👤 Espace » → Élève**, et dès lors ses réponses et ses
   scores de quiz se sauvegardent et le suivent sur tous ses appareils.
5. Vous suivez tout depuis votre **tableau de bord** (séances travaillées, scores).

## Vie privée (RGPD)

- On ne stocke que le **prénom** de l'élève et son travail scolaire — aucune
  autre donnée personnelle. N'y mettez rien de sensible.
- Le bouton **« Supprimer »** d'une classe (ou le **×** d'un élève) efface
  définitivement les données correspondantes (droit à l'effacement).
- Informez élèves et familles conformément à la politique de votre établissement.
- L'identifiant « prénom + code de classe » n'est **pas** une authentification
  forte : c'est adapté à des devoirs, pas à des notes officielles ou des données
  confidentielles.
