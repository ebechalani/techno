# Technologie & SNT — M. Eddy Bachaalany

Site des cours de **Technologie** (collège) et de **SNT** (lycée) du Lycée Montaigne, Beit Chabab.
Refonte professionnelle du site [Google Sites d'origine](https://sites.google.com/view/lmtechno25) : mêmes contenus (séquences, séances, corrections, ressources), avec une navigation moderne, une recherche intégrée, un thème sombre et un affichage adapté au mobile et à l'impression.

**Site en ligne :** https://ebechalani.github.io/techno/

## Organisation

```
content/                  ← LE CONTENU DES COURS (à modifier ici)
  site.json               ← titres, textes d'accueil, liens de pied de page
  sections/*.json         ← une section par fichier (5ème, 4ème, SNT, archives…)
  assets/img/…            ← images des cours (auto-hébergées)
src/
  build.js                ← générateur du site (JSON → HTML)
  styles.css              ← feuille de style
  client.js               ← recherche, thème sombre, menus
  serve.js                ← petit serveur de prévisualisation locale
tools/                    ← outils de migration depuis Google Sites (usage ponctuel)
docs/                     ← site généré (ne pas modifier à la main)
```

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
