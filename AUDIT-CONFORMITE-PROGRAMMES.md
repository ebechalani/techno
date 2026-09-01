# Audit de conformité aux programmes officiels

**Site :** https://ebechalani.github.io/techno/
**Date de l'audit :** septembre 2026
**Portée :** Technologie 5ᵉ · 4ᵉ · 3ᵉ (cycle 4) et SNT 2ⁿᵈᵉ

---

## 1. Méthode et textes de référence

L'audit compare, thème par thème, le contenu réellement publié sur le site
(fichiers `content/sections/*.json`) aux attendus des programmes officiels en
vigueur. Chaque séquence du site est rattachée aux thématiques du programme
correspondant, puis les écarts (notions non couvertes ou insuffisamment
explicites) sont relevés.

### Point de vigilance : période de transition 2024‑2026

Le nouveau programme de technologie du cycle 4 (arrêté du 9 février 2024,
BO n° 9 du 29 février 2024) entre en vigueur **de façon échelonnée** :

| Niveau | Programme applicable en 2025‑2026 | Bascule vers le programme 2024 |
|--------|-----------------------------------|--------------------------------|
| **5ᵉ** | Programme 2024 (2ᵉ année d'application) | Rentrée 2024 |
| **4ᵉ** | Programme 2024 (**1ʳᵉ année**, cohorte pilote) | Rentrée 2025 |
| **3ᵉ** | **Ancien programme** (arrêté 2015, consolidé 2020) | Rentrée 2026 |
| **SNT 2ⁿᵈᵉ** | Programme 2019 (arrêté du 17 janvier 2019) | inchangé |

Conséquence pratique : en 2025‑2026, la 3ᵉ doit encore être auditée contre
l'**ancien** programme (4 thématiques), tandis que 5ᵉ et 4ᵉ relèvent déjà du
programme 2024 (3 thèmes / 9 compétences).

---

## 2. Synthèse globale

| Niveau | Référentiel | Couverture des thèmes | Verdict |
|--------|-------------|-----------------------|---------|
| **5ᵉ** | Programme 2024 | 3/3 thèmes abordés | ✅ Conforme — quelques notions à nommer explicitement |
| **4ᵉ** | Programme 2024 | 3/3 thèmes abordés | ✅ Conforme et très à jour (IA, cybersécurité, réparation) |
| **3ᵉ** | Programme 2020 | 4/4 thématiques abordées | ✅ Conforme |
| **SNT** | Programme 2019 | **7/7 thèmes** abordés | ✅ Conforme — 1 capacité à compléter |

**Conclusion générale : le site couvre l'intégralité des thèmes des quatre
programmes de référence.** Les écarts identifiés sont des points de précision
ou d'enrichissement, non des absences structurelles.

---

## 3. Technologie 5ᵉ — Programme 2024

### 3.1 Référentiel

Trois thèmes (intitulés officiels du BO n° 9 du 29 février 2024) :

- **Thème 1 —** « Les objets et les systèmes techniques : leurs usages et
  leurs interactions à découvrir et à analyser »
- **Thème 2 —** « Structure, fonctionnement, comportement : des objets et des
  systèmes techniques à comprendre »
- **Thème 3 —** « Création, conception, réalisation, innovations : des objets
  à concevoir et à réaliser »

Notions nouvelles introduites par le programme 2024 (transversales aux
trois thèmes) : réparabilité, systèmes d'information, **cybersécurité**,
expérience utilisateur, **intelligence artificielle**, résolution des
dysfonctionnements.

### 3.2 Couverture par le site

| Séquence du site | Année | Thème(s) couvert(s) |
|------------------|-------|---------------------|
| **Cybersécurité** (4 séances + jeu + corrections) | 2025‑2026 | Thème 1 (usages, systèmes d'information) — notion nouvelle *cybersécurité* |
| **Réparer un objet technique** | 2025‑2026 | Thème 1 / Thème 3 — notion nouvelle *réparabilité* |
| **Projet fablab : la signalétique du collège** | 2025‑2026 | Thème 3 (conception vectorielle, production à l'atelier, contrôle) |
| **Préserver les ressources** (déchets, tri, appli) | 2020‑2024 | Thème 1 (impacts sociétaux/environnementaux) + programmation |
| **Éclairage automatique** (capteur/actionneur/interface, programmation) | 2020‑2024 | Thème 2 (structure et comportement) + programmation |
| **Vivre dans une boîte** (fonctions, solutions, modélisation 3D) | 2020‑2024 | Thème 2 + Thème 3 (modélisation, conception) |

### 3.3 Points forts

- La **cybersécurité** et la démarche de **réparation**, deux notions phares du
  programme 2024, disposent chacune d'une séquence dédiée avec corrections — le
  site est en avance sur les manuels sur ces points.
- Le thème 3 (conception‑réalisation) est solidement ancré par un **projet
  fablab** complet (analyse du besoin → CAO vectorielle → fabrication →
  contrôle), qui matérialise la démarche de projet attendue.
- Les séquences « legacy » 2020‑2024 (systèmes automatiques, modélisation) ne
  sont pas des redondances : elles alimentent utilement le **thème 2**, moins
  couvert par les séquences récentes.

### 3.4 Écarts et recommandations

- ⚠️ **Vocabulaire du thème 2 non explicite.** Les notions de *chaîne
  d'énergie* / *chaîne d'information* n'apparaissent pas nommément en 5ᵉ
  (contrairement à la 4ᵉ). Le contenu existe fonctionnellement
  (capteur / actionneur / interface dans « Éclairage automatique »), mais il
  gagnerait à être rattaché au vocabulaire officiel du programme 2024.
  → *Reco :* ajouter une fiche de synthèse « chaîne d'information / chaîne
  d'énergie » dans « Éclairage automatique ».
- ⚠️ **Expérience utilisateur (UX)** : notion nouvelle non traitée
  explicitement. Elle pourrait être introduite dans le projet fablab
  signalétique (lisibilité, ergonomie d'un panneau) sans créer de séquence
  supplémentaire.

---

## 4. Technologie 4ᵉ — Programme 2024

### 4.1 Référentiel

Mêmes trois thèmes et mêmes notions nouvelles qu'en 5ᵉ (voir § 3.1), avec des
repères de progressivité relevés : analyse plus complexe des systèmes, première
année d'application du programme 2024 pour ce niveau.

### 4.2 Couverture par le site

| Séquence du site | Année | Thème(s) couvert(s) |
|------------------|-------|---------------------|
| **L'IA générative comme assistant personnel** | 2025‑2026 | Notion nouvelle *IA* — Thème 1 |
| **IA générative et sécurité des données** | 2025‑2026 | *IA* + *cybersécurité* — Thème 1 |
| **Dépanner et réparer un objet technique** | 2025‑2026 | *Résolution des dysfonctionnements* — Thème 1/2 |
| **Choisir un objet (développement durable)** | 2025‑2026 | Thème 1 (cycle de vie, choix responsable) |
| **Matériaux et procédés de fabrication** | 2025‑2026 | Thème 3 (réalisation) |
| **Projet fablab : le boîtier de mon objet connecté** | 2025‑2026 | Thème 3 (CAO à encoches, fabrication, assemblage) |
| Réseau informatique · Portail automatisé · Objets connectés · micro:bit · Feu tricolore Arduino · Serre autonome | 2020‑2024 | Thème 2 (chaînes d'énergie/information, programmation) |

### 4.3 Verdict

**Le niveau 4ᵉ est le plus à jour du site.** Les six notions nouvelles du
programme 2024 sont couvertes, dont l'**IA générative** (deux séquences) et la
**sécurité des données**. Le vocabulaire du thème 2 (chaîne d'énergie / chaîne
d'information) est présent et explicite (relevé à 10 reprises dans le contenu).
Aucun écart bloquant. Les séquences 2020‑2024 conservées documentent bien la
partie « systèmes techniques et programmation » et servent de banque de projets.

---

## 5. Technologie 3ᵉ — Programme 2020 (dernière année de transition)

### 5.1 Référentiel

La 3ᵉ suit encore l'ancien programme (arrêté 2015 consolidé 2020) en 2025‑2026,
structuré en **quatre thématiques** indissociables, à aborder chaque année :

1. Design, innovation et créativité
2. Les objets techniques, les services et les changements induits dans la société
3. La modélisation et la simulation des objets techniques
4. L'informatique et la programmation

### 5.2 Couverture par le site

| Séquence du site | Thématique(s) couverte(s) |
|------------------|---------------------------|
| **La poubelle connectée** (fonctionnement, modélisation 3D, prototype Arduino, Tinkercad) | 2, 3, 4 |
| **Intelligence artificielle** (Teachable Machine, programmation) | 2, 4 |
| **Réseau informatique** | 4 (informatique et programmation) |
| **Projet fablab : produire en série** (CFAO, gabarits, qualité/coûts) | 1, 3 |
| **Chaînes fonctionnelles** / **Fonctions et solutions techniques** | 3 (modélisation) |
| **ASSR 2 · Pix**, **Préparation au DNB** | Compétences numériques / évaluation |

### 5.3 Verdict et recommandations

**Les 4 thématiques sont couvertes.** La modélisation/simulation (thématique 3)
est particulièrement bien servie (modélisation 3D, Tinkercad, chaînes
fonctionnelles), et le **projet « produire en série »** couvre à lui seul le
design, la CFAO et la démarche qualité (thématiques 1 et 3).

- ℹ️ **Préparer la bascule 2026.** À la rentrée 2026, la 3ᵉ passera au programme
  2024. Les séquences IA, réseau et poubelle connectée sont déjà compatibles
  avec les thèmes 2024 ; il faudra surtout ré-étiqueter les contenus avec le
  nouveau vocabulaire (compétences par thème) le moment venu.
- ℹ️ La thématique 2 (« changements induits dans la société ») pourrait être
  rendue plus visible via un temps de débat explicite (déjà amorcé par la
  séquence IA).

---

## 6. SNT 2ⁿᵈᵉ — Programme 2019

### 6.1 Référentiel

Programme d'enseignement de sciences numériques et technologie (arrêté du
17 janvier 2019, BO spécial n° 1 du 22 janvier 2019), organisé en **sept
thèmes**, chacun assorti de contenus et de capacités attendues, avec une
initiation à la **programmation Python** transversale.

### 6.2 Couverture par le site — les 7 thèmes officiels

| # | Thème officiel 2019 | Séquence du site | État |
|---|---------------------|------------------|------|
| 1 | Internet | **Internet** (TCP/IP, routage, DNS, pair‑à‑pair) | ✅ |
| 2 | Le Web | **Le Web** (histoire, HTML/CSS, popularité d'une page) | ✅ |
| 3 | Les réseaux sociaux | **Les réseaux sociaux** (identité numérique, modèle économique, graphes, cyberviolence) | ✅ |
| 4 | Les données structurées et leur traitement | **Les données structurées** (descripteurs, tables, tri/filtre, métadonnées, cloud) | ✅ |
| 5 | Localisation, cartographie et **mobilité** | **Localisation et cartographie** (cartographie, géolocalisation satellite, NMEA) | ⚠️ partiel |
| 6 | Informatique embarquée et objets connectés | **Informatique embarquée et objets connectés** (+ TP Arduino) | ✅ |
| 7 | La photographie numérique | **La photographie numérique** (capteur, formats, traitement d'image) | ✅ |

Bonus hors‑programme officiel mais pertinent : **TP fablab « du pixel au
sticker »** (prolongement concret du thème 7 / vecteur vs pixel).

### 6.3 Verdict et recommandation

**Alignement quasi total : les 7 thèmes du programme 2019 sont présents**, avec
la programmation Python intégrée (page « popularité d'une page », « traiter une
image »). C'est le niveau le mieux aligné du site.

- ⚠️ **Thème 5 — volet « mobilité » à compléter.** Le site traite très bien la
  cartographie et la géolocalisation par satellite (NMEA), mais la capacité
  attendue relative à la **mobilité** — calcul et sélection d'un *itinéraire*
  (algorithme de plus court chemin, ex. Dijkstra) — n'est pas couverte. Aucune
  occurrence d'« itinéraire » ou de calcul de trajet n'a été trouvée dans le
  contenu.
  → *Reco :* ajouter une courte activité « calcul d'itinéraire / plus court
  chemin » (algorithme sur un graphe de villes) pour boucler la capacité
  attendue du thème 5.

---

## 7. Recommandations transversales

Par ordre de priorité :

1. **SNT — compléter le volet « mobilité »** du thème 5 (calcul d'itinéraire) :
   c'est le seul véritable manquement d'une capacité attendue explicite.
2. **5ᵉ — nommer le vocabulaire du programme 2024** : ajouter une synthèse
   « chaîne d'énergie / chaîne d'information » et une amorce d'« expérience
   utilisateur ».
3. **Corriger la note RGPD signalée** (rattachement thématique à revoir) dans
   la séquence concernée — point de contenu déjà repéré, indépendant de la
   conformité programme.
4. **Anticiper la bascule 3ᵉ 2026** : préparer le ré-étiquetage des séquences
   3ᵉ vers les 3 thèmes / 9 compétences du programme 2024.
5. **Optionnel — étendre les QCM auto-corrigés** aux séquences 2020‑2024 et aux
   thèmes SNT, sur le modèle déjà en place (cybersécurité 5ᵉ, IA 4ᵉ).

Aucune de ces actions n'est bloquante : le site est **conforme aux quatre
programmes de référence** sur l'ensemble de leurs thèmes.

---

## 8. Sources officielles

- Programme de technologie du cycle 4 — arrêté du 9 février 2024,
  Bulletin officiel n° 9 du 29 février 2024
  (education.gouv.fr/bo/2024/Hebdo9/MENE2402802A ; annexe programme).
- Guide d'accompagnement du programme de technologie (éduscol STI, mai 2024).
- Programme du cycle 4 en vigueur à la rentrée 2020 (arrêté 2015 consolidé),
  eduscol.education.gouv.fr.
- Programme d'enseignement de SNT, classe de seconde — arrêté du 17 janvier
  2019, BO spécial n° 1 du 22 janvier 2019
  (education.gouv.fr/bo/19/Special1/MENE1901641A.htm).

> *Note méthodologique : les intitulés de thèmes cités entre guillemets sont
> repris de la version officielle des programmes. Le rattachement des séquences
> aux thèmes relève de l'analyse d'audit et n'engage pas l'administration.*
