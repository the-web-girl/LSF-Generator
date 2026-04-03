# 🤟 LSF Generator — Documentation complète

> Application accessible de génération de signes en **Langue des Signes Française (LSF)**  
> Réalisée par **IntA11Y - Solutions** — Accessibilité numérique pour tous

---

## 📋 Table des matières

1. [Présentation](#présentation)
2. [Fonctionnalités](#fonctionnalités)
3. [Structure du projet](#structure-du-projet)
4. [Installation](#installation)
   - [Sans base de données (mode démo)](#sans-base-de-données-mode-démo)
   - [Avec PHP + MySQL (mode complet)](#avec-php--mysql-mode-complet)
   - [Sur hébergement mutualisé IONOS](#sur-hébergement-mutualisé-ionos)
5. [Configuration](#configuration)
6. [API LSF & Sources de données](#api-lsf--sources-de-données)
7. [Accessibilité (RGAA)](#accessibilité-rgaa)
8. [Architecture technique](#architecture-technique)
9. [Dépannage](#dépannage)
10. [Contribuer](#contribuer)
11. [Licence](#licence)

---

## 📖 Présentation

**LSF Generator** est une application web permettant de rechercher et visualiser des signes de la **Langue des Signes Française (LSF)**. Elle s'adresse à :

- 🧑‍🏫 Les enseignants et éducateurs souhaitant introduire la LSF en classe
- 👨‍👩‍👧 Les familles d'enfants sourds ou malentendants
- 🧑‍⚕️ Les professionnels de santé et du social
- 🌐 Toute personne désireuse d'apprendre la LSF

L'application est conçue avec **l'accessibilité comme priorité absolue**, conformément au **RGAA 4.1** et aux critères **WCAG 2.1 niveau AA**.

---

## ✨ Fonctionnalités

### 🤟 Traduction LSF
- Recherche d'un mot ou d'une phrase
- Mode **mot par mot** (chaque mot traduit séparément)
- Mode **phrase complète** (traitement de la phrase entière)
- Affichage des signes sous forme de **vidéos** ou **illustrations**
- Liens vers **Elix LSF** et **SpreadTheSign** pour chaque signe

### ♿ Accessibilité (PRIORITÉ)
| Fonctionnalité | Description |
|---|---|
| 🔤 **Police dyslexie** | OpenDyslexic, espacement optimisé |
| 🔍 **Taille de texte** | 5 niveaux (75% à 150%) |
| 🎨 **Mode daltonien** | Filtre deutéranopie/protanopie |
| ⬛ **Mode noir & blanc** | Filtre niveaux de gris |
| 🌙 **Mode sombre** | Thème sombre confortable |
| 📖 **Lecture simplifiée** | Interface épurée |
| ⌨️ **Navigation clavier** | 100% accessible sans souris |
| 👁️ **Lecteurs d'écran** | Compatible NVDA, JAWS, VoiceOver |
| 💾 **Sauvegarde** | Préférences mémorisées (localStorage) |

### 📚 Historique
- Sauvegarde des 20 dernières recherches
- Relance rapide d'une recherche précédente
- Effacement possible

### 🔧 Backend (optionnel)
- **Proxy PHP** : contourne les restrictions CORS pour appeler Elix LSF
- **Cache MySQL** : mémorise les résultats 7 jours
- **Historique serveur** : statistiques anonymisées
- Compatible **hébergements mutualisés** (IONOS, OVH, PlanetHoster...)

---

## 🗂️ Structure du projet

```
lsf-app/
│
├── index.html              # Page principale (HTML sémantique)
│
├── css/
│   └── style.css           # Feuille de style (mobile first, WCAG)
│
├── js/
│   └── app.js              # Logique JavaScript (modules A11y, LSF, UI)
│
├── api/
│   └── lsf-proxy.php       # Proxy PHP → API Elix LSF
│
├── config/
│   └── db-config.php       # Configuration BDD (⚠️ à sécuriser)
│
├── sql/
│   └── install.sql         # Script de création des tables MySQL
│
├── .htaccess               # Sécurité Apache (protection config/)
├── .gitignore              # Fichiers à exclure de Git
└── README.md               # Ce fichier
```

---

## 🚀 Installation

### Sans base de données (mode démo)

Le mode démo fonctionne **entièrement côté navigateur**, sans serveur PHP ni MySQL.

**Idéal pour :**
- Les tests locaux
- Un hébergement statique (GitHub Pages, Netlify, Vercel...)
- La démonstration

**Étapes :**

1. **Téléchargez** les fichiers du projet
2. **Ouvrez** `index.html` dans votre navigateur

> ⚠️ En mode démo, les signes sont simulés avec des données locales. Les liens Elix LSF et SpreadTheSign fonctionnent normalement.

---

### Avec PHP + MySQL (mode complet)

**Prérequis :**
- PHP 7.4 ou supérieur
- MySQL 5.7+ ou MariaDB 10.3+
- Serveur web (Apache, Nginx)
- Extension PHP : `PDO`, `PDO_MySQL`, `curl`

#### Étape 1 : Créer la base de données

Connectez-vous à **phpMyAdmin** ou via ligne de commande et créez la base :

```sql
CREATE DATABASE lsf_generator
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Créez un utilisateur dédié (ne pas utiliser root!)
CREATE USER 'lsf_user'@'localhost' IDENTIFIED BY 'VotreMotDePasseFort123!';
GRANT SELECT, INSERT, UPDATE, DELETE ON lsf_generator.* TO 'lsf_user'@'localhost';
FLUSH PRIVILEGES;
```

#### Étape 2 : Importer le schéma

```bash
mysql -u lsf_user -p lsf_generator < sql/install.sql
```

Ou via phpMyAdmin : **Sélectionner la BDD → Importer → Choisir `sql/install.sql`**

#### Étape 3 : Configurer la connexion BDD

Éditez `config/db-config.php` :

```php
define('DB_HOST', 'localhost');     // Hôte MySQL
define('DB_NAME', 'lsf_generator'); // Nom de la BDD
define('DB_USER', 'lsf_user');      // Utilisateur MySQL
define('DB_PASS', 'VotreMotDePasseFort123!'); // Mot de passe
```

#### Étape 4 : Sécuriser le fichier de config

**Option A — Placer hors du dossier web (recommandé) :**
```
/home/votresite/           ← Racine du serveur
├── public_html/           ← Dossier web
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── api/
│       └── lsf-proxy.php
└── private/               ← EN DEHORS du web ✅
    └── config/
        └── db-config.php
```

Puis dans `api/lsf-proxy.php`, ajustez le `require_once` :
```php
require_once __DIR__ . '/../../private/config/db-config.php';
```

**Option B — Protéger avec .htaccess :**

Créez `config/.htaccess` :
```apache
<Files "*.php">
    Order Allow,Deny
    Deny from all
</Files>
```

#### Étape 5 : Déployer

Transférez les fichiers vers votre serveur via FTP (FileZilla, Cyberduck...) ou Git.

---

### Sur hébergement mutualisé IONOS

IONOS est un hébergeur populaire avec des spécificités :

#### Trouver vos paramètres MySQL

1. Connectez-vous à **My IONOS** → **Hébergement** → **MySQL**
2. Notez :
   - **Serveur de base de données** (ex: `db12345678.hosting-data.io`)
   - **Nom de la base de données**
   - **Utilisateur** et **mot de passe**

#### Configurer db-config.php pour IONOS

```php
define('DB_HOST', 'db12345678.hosting-data.io'); // Serveur IONOS
define('DB_NAME', 'dbs12345678');                 // Nom IONOS
define('DB_USER', 'dbu12345678');                 // User IONOS
define('DB_PASS', 'VotreMotDePasse');
```

#### Importer la base via phpMyAdmin IONOS

1. My IONOS → **MySQL** → **Administrer** (ouvre phpMyAdmin)
2. Sélectionnez votre base
3. Onglet **Importer** → Choisissez `sql/install.sql` → **Exécuter**

#### Vérifier la version PHP

Sous IONOS : **Hébergement** → **PHP** → Sélectionnez **PHP 8.1** ou supérieur.

---

## ⚙️ Configuration

### Variables principales (js/app.js)

```javascript
const CONFIG = {
  TEXT_SIZES: [0.75, 0.875, 1, 1.125, 1.25, 1.375, 1.5], // Tailles texte
  HISTORY_MAX: 20,    // Nb max d'entrées dans l'historique
  LOADING_TIMEOUT: 8000, // Timeout de chargement (ms)
};
```

### Ajouter des mots au mock (mode démo)

Dans `js/app.js`, section `LsfService.mockData` :

```javascript
mockData: {
  'votre_mot': {
    source: 'Elix LSF',
    description: 'Description du signe'
  },
  // ...
}
```

---

## 🌐 API LSF & Sources de données

### Elix LSF (source principale)

**Elix LSF** est un dictionnaire collaboratif de la Langue des Signes Française.

- 🌐 Site : [elix-lsf.fr](https://www.elix-lsf.fr)
- 📹 Contenu : vidéos de signes LSF
- 📡 API : `https://www.elix-lsf.fr/spip.php?action=elix_recherche&lang=fr&format=json&recherche=MOT`

> ⚠️ L'API Elix LSF peut avoir des restrictions d'utilisation. Consultez leurs CGU avant un usage en production.

### SpreadTheSign (source secondaire)

Base de données internationale de signes.

- 🌐 Site : [spreadthesign.com](https://www.spreadthesign.com/fr.fr/)
- 🌍 Couvre la LSF et d'autres langues des signes mondiales

### Flux de récupération des données

```
Requête utilisateur
    ↓
1. Cache MySQL (si disponible) ←── Résultat en < 10ms
    ↓ (pas en cache)
2. API Elix LSF via proxy PHP ←── Résultat en 1-3s
    ↓ (API indisponible)
3. Données mock locales ←────────── Toujours disponible
    ↓
Affichage des résultats
```

---

## ♿ Accessibilité (RGAA)

### Critères RGAA 4.1 respectés

| Critère | Description | Statut |
|---|---|---|
| 1.x | Images alternatives | ✅ |
| 2.x | Cadres | ✅ N/A |
| 3.x | Couleurs | ✅ Ratio ≥ 4.5:1 |
| 4.x | Multimédia | ✅ Contrôles natifs |
| 5.x | Tableaux | ✅ N/A |
| 6.x | Liens | ✅ Tous libellés |
| 7.x | Scripts | ✅ Contrôlables clavier |
| 8.x | Code source | ✅ HTML valide |
| 9.x | Structure | ✅ Sémantique correcte |
| 10.x | Présentation | ✅ CSS séparé |
| 11.x | Formulaires | ✅ Labels, erreurs |
| 12.x | Navigation | ✅ Skip link, menus |
| 13.x | Consultation | ✅ Pas de limite temps |

### Navigation clavier

| Touche | Action |
|---|---|
| `Tab` | Passer à l'élément suivant |
| `Shift + Tab` | Passer à l'élément précédent |
| `Enter` / `Espace` | Activer un bouton |
| `Escape` | Fermer la modale |
| `Flèches` | Naviguer dans les boutons radio |

### Lecteurs d'écran testés

- ✅ **NVDA** + Firefox (Windows)
- ✅ **JAWS** + Chrome (Windows)  
- ✅ **VoiceOver** + Safari (macOS / iOS)
- ✅ **TalkBack** + Chrome (Android)

---

## 🏗️ Architecture technique

### Frontend

```
HTML (structure sémantique)
  ↕ CSS Variables (design tokens)
CSS (styles adaptatifs + modes)
  ↕ DOM API
JavaScript (3 modules)
  ├── A11yManager  → Gestion accessibilité + localStorage
  ├── HistoryManager → Historique recherches
  ├── LsfService   → API + Mock data
  └── UIManager    → Rendu + événements
```

### Backend PHP

```
lsf-proxy.php
  ├── Validation et nettoyage des paramètres
  ├── Lecture cache MySQL (PDO + requêtes préparées)
  ├── Appel API Elix LSF (cURL)
  ├── Normalisation des données
  ├── Écriture cache MySQL
  └── Log requête (IP anonymisée)
```

### Base de données MySQL

```sql
lsf_cache         -- Cache des résultats API (7 jours)
lsf_requests      -- Historique anonymisé des recherches
lsf_preferences   -- Préférences utilisateur (optionnel)
v_top_searches    -- Vue : mots les plus recherchés
v_cache_stats     -- Vue : statistiques du cache
```

---

## 🔧 Dépannage

### L'API ne répond pas

**Symptôme :** Le chargement tourne indéfiniment.  
**Solution :** L'application bascule automatiquement sur les données de démo après 5 secondes.  
Vérifiez les logs PHP : `tail -f /var/log/apache2/error.log`

### Erreur de connexion MySQL

**Symptôme :** `PDOException: Access denied`  
**Solution :**
1. Vérifiez `config/db-config.php` (host, user, pass, dbname)
2. Testez la connexion : `mysql -h DB_HOST -u DB_USER -p DB_NAME`
3. Vérifiez les permissions de l'utilisateur MySQL

### Problème CORS sur l'API

**Symptôme :** Erreur dans la console : `Cross-Origin Request Blocked`  
**Solution :** Utilisez le proxy PHP (`api/lsf-proxy.php`) au lieu d'appeler l'API directement.

### Police OpenDyslexic ne se charge pas

**Symptôme :** La police dyslexie ressemble à une police normale.  
**Solution :** Vérifiez la connexion internet (la police est chargée depuis un CDN). Pour un usage hors-ligne, téléchargez la police sur [opendyslexic.org](https://opendyslexic.org) et hébergez-la localement.

### LocalStorage indisponible

**Symptôme :** Les préférences ne sont pas sauvegardées.  
**Cause :** Navigation privée ou politiques de sécurité strictes.  
**Comportement :** L'application fonctionne normalement, les préférences ne sont simplement pas mémorisées entre les sessions.

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! En particulier :

1. **Nouvelles données LSF** : Enrichir `mockData` dans `js/app.js`
2. **Corrections d'accessibilité** : Tout rapport d'issue RGAA est précieux
3. **Support de nouvelles APIs** : Intégration d'autres bases de données LSF
4. **Traductions** : Interface en langue des signes internationale (IS)

### Soumettre un problème d'accessibilité

📧 **access@inta11y.fr**

Incluez :
- Le navigateur et lecteur d'écran utilisé
- La description du problème rencontré
- Les étapes pour reproduire

---

## 📄 Licence

Ce projet est distribué sous licence **MIT**.

```
MIT License — Copyright (c) 2024 IntA11Y - Solutions

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files...
```

---

## 🙏 Remerciements

- **[Elix LSF](https://www.elix-lsf.fr)** — Pour leur dictionnaire LSF collaboratif
- **[SpreadTheSign](https://www.spreadthesign.com)** — Pour leur base internationale
- **[OpenDyslexic](https://opendyslexic.org)** — Pour la police accessible
- **[RGAA](https://www.numerique.gouv.fr/publications/rgaa-accessibilite/)** — Référentiel Général d'Amélioration de l'Accessibilité
- **[WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/)** — Web Content Accessibility Guidelines

---

<p align="center">
  🤟 Réalisé par <strong>IntA11Y - Solutions</strong><br>
  Accessibilité numérique pour tous
</p>
