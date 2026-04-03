<?php
/**
 * ============================================================
 * LSF Generator — Configuration de la base de données
 * Fichier : config/db-config.php
 * Réalisé par IntA11Y - Solutions
 * ============================================================
 *
 * ⚠️ SÉCURITÉ IMPORTANTE :
 * Ce fichier contient les identifiants de connexion à la BDD.
 * Il doit ABSOLUMENT être placé EN DEHORS du dossier web public.
 *
 * Structure recommandée :
 * /
 * ├── public_html/          ← Dossier web accessible
 * │   ├── index.html
 * │   ├── css/
 * │   ├── js/
 * │   └── api/
 * │       └── lsf-proxy.php
 * └── private/              ← En dehors du web (non accessible)
 *     └── config/
 *         └── db-config.php  ← CE FICHIER
 *
 * Si vous ne pouvez pas placer le fichier hors du web,
 * ajoutez ce .htaccess dans le dossier config/ :
 *   <Files "*.php">
 *     Deny from all
 *   </Files>
 *
 * ============================================================
 */

// Empêche l'accès direct à ce fichier de configuration
// Si quelqu'un tente d'y accéder directement via URL
if (!defined('LSF_APP') && basename($_SERVER['PHP_SELF']) === 'db-config.php') {
    http_response_code(403);
    exit('Accès refusé.');
}

// Définit la constante pour vérifier que ce fichier est bien chargé
define('LSF_APP', true);

// ============================================================
// PARAMÈTRES DE CONNEXION MYSQL
// Modifiez ces valeurs selon votre hébergeur
// ============================================================

/**
 * Hôte MySQL.
 * - En local (XAMPP, WAMP, MAMP) : 'localhost'
 * - Sur IONOS mutualisé : souvent 'db12345678.hosting-data.io' (voir panneau)
 * - Sur OVH : 'votre_serveur.mysql.db'
 */
define('DB_HOST', 'localhost');

/**
 * Nom de la base de données.
 * Créez-la dans phpMyAdmin ou le panneau d'administration de votre hébergeur.
 */
define('DB_NAME', 'lsf_generator');

/**
 * Nom d'utilisateur MySQL.
 * Créez un utilisateur dédié (pas root!) avec seulement les droits nécessaires :
 * SELECT, INSERT, UPDATE, DELETE sur la base lsf_generator.
 */
define('DB_USER', 'lsf_user');

/**
 * Mot de passe MySQL.
 * Utilisez un mot de passe fort et unique.
 * ⚠️ Ne jamais committer ce fichier dans Git (ajoutez-le au .gitignore)
 */
define('DB_PASS', 'CHANGEZ_CE_MOT_DE_PASSE_FORT');

/**
 * Port MySQL (optionnel, 3306 par défaut).
 * La plupart des hébergeurs utilisent le port standard.
 */
define('DB_PORT', '3306');

/**
 * Encodage de la connexion.
 * utf8mb4 = support complet Unicode (emojis, caractères spéciaux).
 */
define('DB_CHARSET', 'utf8mb4');
