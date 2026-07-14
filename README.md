# Technologie & SNT — M. Eddy Bachaalany

Site des cours de **Technologie** (collège) et de **SNT** (lycée) du Lycée Montaigne, Beit Chabab.
Refonte professionnelle du site [Google Sites d'origine](https://sites.google.com/view/lmtechno25) : mêmes contenus (séquences, séances, corrections, ressources), avec une navigation moderne, une recherche intégrée, un thème sombre et un affichage adapté au mobile et à l'impression.

**Site en ligne :** https://ebechalani.github.io/techno/

## Interactivité pour les élèves

- **Zones de réponse** : sur les fiches d'activité, les lignes de pointillés sont
  devenues des champs où l'élève tape sa réponse. Les réponses sont enregistrées
  automatiquement **dans son navigateur** (rien n'est envoyé sur Internet) et
  peuvent être imprimées / exportées en PDF (bouton « Imprimer »).
- **QCM auto-corrigés** : chaque séance peut avoir un quiz « Teste tes
  connaissances » avec correction immédiate et score. Les questions se
  définissent dans `content/quiz/<section>.json` :

```json
{
  "sequence-1-cybersecurite/seance-2": [
    {
      "q": "Quelle est la couleur d'un mot de passe très fort ?",
      "options": ["Rouge", "Orange", "Vert"],
      "answer": 2,
      "explain": "Le vérificateur de mots de passe affiche le vert pour un mot de passe très fort."
    }
  ]
}
```

`answer` est l'index (à partir de 0) de la bonne réponse dans `options`.

## Organisation

```
content/                  ← LE CONTENU DES COURS (à modifier ici)
  site.json               ← titres, textes d'accueil, liens de pied de page
  sections/*.json         ← une section par fichier (5eme, 4eme, 3eme, snt, sicit)
  quiz/*.json             ← QCM auto-corrigés par séance (facultatif)
  assets/img/…            ← images des cours (auto-hébergées)
src/
  build.js                ← générateur du site (JSON → HTML)
  styles.css              ← feuille de style
  client.js               ← recherche, thème sombre, réponses élèves, quiz
  serve.js                ← petit serveur de prévisualisation locale
tools/                    ← outils de migration depuis Google Sites (usage ponctuel)
docs/                     ← site généré (ne pas modifier à la main)
```

Chaque niveau (5ème, 4ème, 3ème) regroupe **toutes** ses séquences au même
endroit ; une pastille d'année (2025-2026 ou 2020-2024) indique le programme
d'origine de chaque séquence.

## Ajouts et retraits durables (`content/authored/`)

Le dossier `content/sections/` est **régénéré** par `tools/build-content.js`.
Pour ajouter, remplacer ou retirer du contenu de façon **durable** (sans qu'il
soit écrasé à la régénération), on utilise un *overlay* : `content/authored/<niveau>.json`.
Il est appliqué automatiquement à la fin de la génération. Clés disponibles :

| Clé | Effet |
| --- | --- |
| `tagline`, `intro_md` | Remplace le sous-titre / l'intro de la section |
| `dropSequences` | Retire des séquences (liste de slugs) |
| `dropPages` | Retire des pages (`"slugSéquence/slugPage"`) |
| `replacePages` | Remplace/complète une page |
| `replaceSequences` | Remplace une séquence entière (par slug) |
| `addSequences` | Ajoute de nouvelles séquences |
| `sequenceOrder` | Fixe l'ordre d'affichage des séquences |

C'est ce mécanisme qui **retire les données personnelles des pages ASSR** et qui
**ajoute les séquences neuves** alignées sur le programme 2024.

## Modifier le contenu

1. Ouvrir le fichier JSON de la section concernée dans `content/sections/`
   (ex. `5eme-2025.json`). Chaque séquence contient ses pages (`pages[]`) avec :
   - `title` : titre de la page,
   - `content_md` : le contenu en **Markdown** (les images s'écrivent
     `![](assets/img/...)`, les documents intégrés `::embed[Titre](url)`),
   - `resources` : liste de documents liés (Drive, YouTube, LearningApps…).
2. Reconstruire et prévisualiser :

```bash
npm install        # une seule fois
npm run build      # régénère docs/
npm run serve      # prévisualisation sur http://localhost:8080
```

3. Pousser sur GitHub : le site est reconstruit et publié automatiquement
   (workflow `.github/workflows/deploy.yml` → GitHub Pages).

> Astuce : les fichiers de `content/` peuvent aussi être modifiés directement
> sur github.com — le site se met à jour tout seul après chaque commit.

## Publication (une seule fois)

Dans **Settings → Pages** du dépôt GitHub, choisir **Source : GitHub Actions**.

## Types de pages

| `kind`       | Usage                                    |
| ------------ | ---------------------------------------- |
| `seance`     | Séance de cours (numérotée)              |
| `correction` | Correction d'une séance                  |
| `synthese`   | Fiche de synthèse / connaissances        |
| `ressources` | Page de ressources de la séquence        |
| `evaluation` | ASSR, Pix, DNB…                          |
| `annexe`     | Tout le reste (tutoriels, compléments…)  |
