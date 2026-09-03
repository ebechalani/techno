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

## Limiter un professeur à certains niveaux

Depuis le tableau de bord **administrateur**, l'encart **👑 Administration**
comporte une section **« Niveaux autorisés par professeur »**. Cochez les
niveaux qu'un collègue peut utiliser pour ses classes, puis **Enregistrer** :

- **Aucune case cochée = tous les niveaux** (comportement par défaut).
- Exemple : pour qu'une collègue ne gère que la 5ᵉ, cochez uniquement **5ème**.
  Son menu « Niveau » (création de classe) n'affichera plus que 5ème, et la
  restriction est aussi vérifiée côté base (`teacherSections` dans
  `database.rules.json`).

> ⚠️ Cette restriction se pose **après** que le professeur a créé son compte et
> qu'il a été **approuvé** — il apparaît alors dans la liste. Elle porte sur les
> **nouvelles** classes ; d'éventuelles classes déjà créées dans d'autres
> niveaux restent visibles jusqu'à leur suppression.

> 🔑 **Changer d'administrateur ?** L'e-mail administrateur est codé à deux
> endroits qui doivent rester identiques : `adminEmail` dans
> `src/app/assets/firebase-config.js` **et** les expressions qui citent cet
> e-mail dans **`database.rules.json`** (les règles actives de la Realtime
> Database). Modifiez les deux, puis **republiez les règles** (voir « Mettre à
> jour les règles de la base » plus bas). *(Le fichier `firestore.rules` du
> dépôt n'est pas utilisé : la sécurité repose sur la Realtime Database.)*

## Mettre à jour les règles de la base

Les **règles** (`database.rules.json`) ne se déploient **pas** automatiquement
avec le site : après les avoir modifiées, il faut les republier. Deux méthodes.

### A. Console (rapide, sans rien installer)

1. **https://console.firebase.google.com** → projet **`techno-ea268`**.
2. Menu de gauche → **Build → Realtime Database** → onglet **« Règles »**.
3. Effacez tout, collez le contenu du fichier **`database.rules.json`** (à la
   racine du dépôt), puis **« Publier »**.

### B. Ligne de commande (réutilisable — recommandé si vous modifiez souvent)

Le dépôt contient déjà `firebase.json` et `.firebaserc` (projet
`techno-ea268`). Une seule fois :

```bash
npm install -g firebase-tools   # installe l'outil Firebase
firebase login                  # ouvre le navigateur, connectez-vous
```

Puis, à chaque changement de règles, depuis la racine du dépôt :

```bash
firebase deploy --only database
```

### C. Automatique — GitHub Actions (aucune action manuelle ensuite)

Le dépôt contient un workflow (`.github/workflows/firebase-rules.yml`) qui
**republie les règles tout seul** dès que `database.rules.json` change sur
`main`. Il faut le configurer **une seule fois** en lui donnant une clé
d'accès (un « compte de service ») rangée dans un secret GitHub :

1. **Créer la clé.** Console Firebase → ⚙️ **Paramètres du projet** → onglet
   **« Comptes de service »** → **« Générer une nouvelle clé privée »**. Un
   fichier **JSON** se télécharge (gardez-le confidentiel : ne le committez
   jamais).
2. **Ranger la clé dans GitHub.** Dépôt GitHub → **Settings → Secrets and
   variables → Actions → New repository secret** :
   - **Name** : `FIREBASE_SERVICE_ACCOUNT`
   - **Secret** : collez **tout le contenu** du fichier JSON téléchargé.
3. C'est prêt. Désormais, chaque modification de `database.rules.json` fusionnée
   dans `main` déclenche le déploiement des règles automatiquement (onglet
   **Actions** du dépôt pour suivre l'exécution). Vous pouvez aussi le lancer à
   la main via **Actions → « Déployer les règles Firebase » → Run workflow**.

> Si le déploiement échoue avec une erreur de permissions, ouvrez la
> **Google Cloud Console → IAM** du projet `techno-ea268` et attribuez au
> compte de service le rôle **« Firebase Realtime Database Admin »**.

## Vie privée (RGPD)

- On ne stocke que le **prénom** de l'élève et son travail scolaire — aucune
  autre donnée personnelle. N'y mettez rien de sensible.
- Le bouton **« Supprimer »** d'une classe (ou le **×** d'un élève) efface
  définitivement les données correspondantes (droit à l'effacement).
- Informez élèves et familles conformément à la politique de votre établissement.
- L'identifiant « prénom + code de classe » n'est **pas** une authentification
  forte : c'est adapté à des devoirs, pas à des notes officielles ou des données
  confidentielles.
