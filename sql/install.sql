-- ============================================================
-- LSF Generator — Schéma de base de données MySQL
-- Fichier : sql/install.sql
-- Réalisé par IntA11Y - Solutions
-- ============================================================
--
-- INSTRUCTIONS D'INSTALLATION :
-- 1. Connectez-vous à phpMyAdmin ou votre client MySQL
-- 2. Créez la base de données (ou utilisez une existante)
-- 3. Sélectionnez la base de données
-- 4. Importez ce fichier SQL (onglet "Importer" dans phpMyAdmin)
--
-- OU via ligne de commande :
--   mysql -u votre_user -p votre_base < sql/install.sql
--
-- COMPATIBILITÉ :
--   MySQL 5.7+ / MariaDB 10.3+ / PHP 7.4+
--   Hébergements mutualisés : IONOS, OVH, PlanetHoster, etc.
-- ============================================================

-- Encodage pour ce script
SET NAMES 'utf8mb4';
SET CHARACTER SET utf8mb4;

-- ============================================================
-- TABLE : lsf_cache
-- Stocke les résultats de l'API LSF pour éviter des requêtes
-- répétées aux APIs externes (Elix LSF, SpreadTheSign).
-- ============================================================
CREATE TABLE IF NOT EXISTS `lsf_cache` (
    -- Identifiant unique auto-incrémenté
    `id`         INT UNSIGNED     NOT NULL AUTO_INCREMENT,

    -- Le mot recherché (ex: "bonjour", "merci")
    -- UNIQUE : un mot ne peut avoir qu'une seule entrée en cache
    `word`       VARCHAR(255)     NOT NULL,

    -- Les données JSON du signe LSF (vidéo URL, image URL, description, etc.)
    -- MEDIUMTEXT : jusqu'à 16MB, largement suffisant
    `sign_data`  MEDIUMTEXT       NOT NULL,

    -- Date de création (pour la gestion de l'expiration du cache)
    `created_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Date de dernière mise à jour
    `updated_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- ---- Contraintes ----
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_word` (`word`),
    INDEX `idx_created_at` (`created_at`)  -- Index pour les requêtes d'expiration

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Cache des résultats LSF pour éviter les appels répétés aux APIs externes';


-- ============================================================
-- TABLE : lsf_requests
-- Historique anonymisé des requêtes utilisateur.
-- Utile pour les statistiques et l'amélioration du service.
-- ⚠️ L'IP est anonymisée (seuls les 2 premiers octets sont conservés)
-- ============================================================
CREATE TABLE IF NOT EXISTS `lsf_requests` (
    -- Identifiant unique
    `id`          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,

    -- Mot recherché
    `word`        VARCHAR(255)     NOT NULL,

    -- IP anonymisée (ex: 192.168.0.0 au lieu de 192.168.1.42)
    `ip_anonymous` VARCHAR(15)     NOT NULL DEFAULT '0.0.0.0',

    -- Date et heure de la recherche
    `searched_at` DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- ---- Contraintes ----
    PRIMARY KEY (`id`),
    INDEX `idx_word` (`word`),
    INDEX `idx_searched_at` (`searched_at`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Historique anonymisé des recherches LSF pour statistiques';


-- ============================================================
-- TABLE : lsf_preferences (OPTIONNEL)
-- Si vous souhaitez synchroniser les préférences d'accessibilité
-- entre appareils pour des utilisateurs connectés.
-- ============================================================
CREATE TABLE IF NOT EXISTS `lsf_preferences` (
    `id`          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    
    -- Identifiant de session (hash SHA256 de la session PHP)
    `session_hash` CHAR(64)        NOT NULL,
    
    -- Préférences stockées en JSON
    -- Ex: {"dyslexia":true,"dark":false,"textSizeIndex":3}
    -- Note : TEXT ne supporte pas DEFAULT en MySQL 5.7, valeur gérée applicativement
    `prefs_json`  TEXT             NOT NULL,
    
    `created_at`  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_session` (`session_hash`)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
  COMMENT='Synchronisation des préférences accessibilité entre appareils';


-- ============================================================
-- DONNÉES DE TEST (OPTIONNEL)
-- Quelques entrées de cache pour tester sans API
-- ============================================================
INSERT IGNORE INTO `lsf_cache` (`word`, `sign_data`, `created_at`) VALUES
(
    'bonjour',
    '{"word":"bonjour","label":"Bonjour","videoUrl":null,"imageUrl":null,"url":"https://www.elix-lsf.fr/spip.php?action=elix_recherche&lang=fr&recherche=bonjour","spreadUrl":"https://www.spreadthesign.com/fr.fr/search/?q=bonjour","description":"Salutation standard. On agite la main ouverte.","source":"Elix LSF (démo)","notFound":false}',
    NOW()
),
(
    'merci',
    '{"word":"merci","label":"Merci","videoUrl":null,"imageUrl":null,"url":"https://www.elix-lsf.fr/spip.php?action=elix_recherche&lang=fr&recherche=merci","spreadUrl":"https://www.spreadthesign.com/fr.fr/search/?q=merci","description":"Expression de gratitude en LSF.","source":"Elix LSF (démo)","notFound":false}',
    NOW()
),
(
    'au revoir',
    '{"word":"au revoir","label":"Au revoir","videoUrl":null,"imageUrl":null,"url":"https://www.elix-lsf.fr/spip.php?action=elix_recherche&lang=fr&recherche=au+revoir","spreadUrl":"https://www.spreadthesign.com/fr.fr/search/?q=au+revoir","description":"Formule de départ.","source":"Elix LSF (démo)","notFound":false}',
    NOW()
);


-- ============================================================
-- PROCÉDURE : Nettoyage automatique du cache expiré
-- À exécuter périodiquement (cron job) ou manuellement
-- ============================================================
DROP PROCEDURE IF EXISTS `clean_expired_cache`;
DELIMITER $$
CREATE PROCEDURE `clean_expired_cache`()
BEGIN
    -- Supprime les entrées de cache vieilles de plus de 30 jours
    DELETE FROM `lsf_cache`
    WHERE `created_at` < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- Supprime les requêtes de plus de 90 jours
    DELETE FROM `lsf_requests`
    WHERE `searched_at` < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Affiche le nombre de lignes supprimées
    SELECT ROW_COUNT() AS `deleted_rows`;
END$$
DELIMITER ;

-- ============================================================
-- VUE : Statistiques des mots les plus recherchés
-- Permet de voir les mots les plus populaires
-- ============================================================
CREATE OR REPLACE VIEW `v_top_searches` AS
SELECT
    `word`,
    COUNT(*) AS `search_count`,
    MAX(`searched_at`) AS `last_searched`
FROM `lsf_requests`
WHERE `searched_at` > DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY `word`
ORDER BY `search_count` DESC
LIMIT 50;


-- ============================================================
-- VUE : Statistiques du cache
-- Montre l'efficacité du cache
-- ============================================================
CREATE OR REPLACE VIEW `v_cache_stats` AS
SELECT
    COUNT(*) AS `total_cached_words`,
    SUM(CASE WHEN `created_at` > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS `cached_this_week`,
    MIN(`created_at`) AS `oldest_entry`,
    MAX(`created_at`) AS `newest_entry`
FROM `lsf_cache`;


-- ============================================================
-- MESSAGE DE CONFIRMATION
-- ============================================================
SELECT 'Installation de la base de données LSF Generator terminée avec succès !' AS `Status`;
