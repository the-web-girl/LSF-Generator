<?php
/**
 * ============================================================
 * LSF Generator — Proxy API PHP
 * Fichier : api/lsf-proxy.php
 * Réalisé par IntA11Y - Solutions
 * ============================================================
 *
 * RÔLE DE CE FICHIER :
 * Ce proxy PHP joue deux rôles importants :
 *
 * 1. CORS (Cross-Origin Resource Sharing) :
 *    Le navigateur interdit aux pages web d'appeler directement
 *    des API tierces (comme Elix LSF) par mesure de sécurité.
 *    Ce proxy, hébergé sur le même domaine, peut lui faire
 *    les requêtes à leur place.
 *
 * 2. CACHE MySQL :
 *    On mémorise les résultats en base de données pour éviter
 *    de rappeler l'API externe à chaque fois (plus rapide,
 *    moins de dépendance à l'API tierce).
 *
 * FLUX :
 *   Navigateur → lsf-proxy.php → [Cache MySQL] ou [API Elix]
 *                              → Réponse JSON → Navigateur
 *
 * COMPATIBILITÉ : PHP 7.4+ / MySQL 5.7+ / MariaDB 10.3+
 *                 Compatible hébergements mutualisés IONOS, OVH, etc.
 * ============================================================
 */

// Empêche l'affichage direct des erreurs PHP en production
// (elles seront dans les logs serveur)
ini_set('display_errors', 0);
error_reporting(E_ALL);

// On inclut le fichier de configuration de la base de données
// Ce fichier doit être EN DEHORS du dossier web public pour la sécurité
// Exemple : si web = /public_html/, config = /private/db-config.php
require_once __DIR__ . '/../config/db-config.php';

// ============================================================
// HEADERS HTTP
// ============================================================

// Type de contenu : JSON (notre réponse sera toujours du JSON)
header('Content-Type: application/json; charset=UTF-8');

// CORS : permet les requêtes depuis le même domaine
// En production, remplacez * par votre domaine exact
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

// Cache HTTP : 1 heure (les signes LSF ne changent pas souvent)
header('Cache-Control: public, max-age=3600');

// ============================================================
// VALIDATION DES PARAMÈTRES
// ============================================================

/**
 * Récupère et valide le paramètre "word" de l'URL.
 * Exemple d'appel : api/lsf-proxy.php?word=bonjour
 */
$word = isset($_GET['word']) ? trim($_GET['word']) : '';

// Validation : le mot ne doit pas être vide
if (empty($word)) {
    http_response_code(400); // Bad Request
    echo json_encode([
        'success' => false,
        'error' => 'Paramètre "word" manquant ou vide.',
    ]);
    exit;
}

// Nettoyage : on accepte seulement les lettres, espaces, tirets et apostrophes
// (évite les injections et les requêtes malformées)
$word = preg_replace('/[^a-zA-ZÀ-ÿ0-9\s\-\']/u', '', $word);
$word = mb_strtolower(mb_substr($word, 0, 100, 'UTF-8'), 'UTF-8'); // max 100 chars

if (empty($word)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Mot invalide après nettoyage.',
    ]);
    exit;
}

// ============================================================
// CONNEXION BASE DE DONNÉES
// ============================================================

/**
 * Tentative de connexion MySQL.
 * On utilise PDO (PHP Data Objects) qui est plus sécurisé
 * que les anciennes fonctions mysql_* et plus portable.
 */
try {
    // DSN = Data Source Name : chaîne de connexion PDO
    $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';

    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        // Mode d'erreur : lève des exceptions (plus facile à gérer)
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,

        // Retourne les données en tableau associatif par défaut
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,

        // Désactive l'émulation des requêtes préparées (sécurité ++)
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

} catch (PDOException $e) {
    // Si la BDD est indisponible, on ne bloque pas tout
    // On continue sans cache et on appelle l'API directement
    error_log('LSF Proxy - Erreur BDD : ' . $e->getMessage());
    $pdo = null;
}

// ============================================================
// VÉRIFICATION DU CACHE
// ============================================================

/**
 * Durée de validité du cache en secondes.
 * 7 jours = 604800 secondes.
 * Les signes LSF ne changent pas souvent, donc on peut cacher longtemps.
 */
define('CACHE_DURATION', 604800);

$cachedResult = null;

if ($pdo) {
    try {
        /**
         * Requête préparée : cherche le signe dans le cache.
         * Les requêtes préparées empêchent les injections SQL.
         *
         * On vérifie aussi que le cache n'est pas expiré
         * en comparant created_at avec la date actuelle.
         */
        $stmt = $pdo->prepare('
            SELECT sign_data, created_at
            FROM lsf_cache
            WHERE word = :word
              AND created_at > DATE_SUB(NOW(), INTERVAL :duration SECOND)
            LIMIT 1
        ');

        $stmt->execute([
            ':word'     => $word,
            ':duration' => CACHE_DURATION,
        ]);

        $row = $stmt->fetch();

        if ($row) {
            // Cache valide trouvé !
            $cachedResult = json_decode($row['sign_data'], true);
            if ($cachedResult) {
                $cachedResult['cached'] = true;
                $cachedResult['cached_at'] = $row['created_at'];
            }
        }

    } catch (PDOException $e) {
        error_log('LSF Proxy - Erreur lecture cache : ' . $e->getMessage());
    }
}

// Si le cache a une réponse valide, on la retourne immédiatement
if ($cachedResult) {
    echo json_encode(['success' => true, 'sign' => $cachedResult, 'cached' => true]);
    exit;
}

// ============================================================
// APPEL API ELIX LSF
// ============================================================

/**
 * Construit l'URL de l'API Elix LSF.
 * Elix LSF est un dictionnaire collaboratif français de LSF.
 * URL : https://www.elix-lsf.fr
 */
$encodedWord = urlencode($word);
$apiUrl = "https://www.elix-lsf.fr/spip.php?action=elix_recherche&lang=fr&format=json&recherche={$encodedWord}";

/**
 * Appel HTTP avec cURL.
 * cURL est plus robuste que file_get_contents() pour les API externes.
 */
$signData = null;

if (function_exists('curl_init')) {

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL            => $apiUrl,
        CURLOPT_RETURNTRANSFER => true,     // Retourne le contenu plutôt que l'afficher
        CURLOPT_TIMEOUT        => 8,        // Timeout de 8 secondes
        CURLOPT_CONNECTTIMEOUT => 5,        // Timeout de connexion
        CURLOPT_FOLLOWLOCATION => true,     // Suit les redirections
        CURLOPT_MAXREDIRS      => 3,        // Maximum 3 redirections
        CURLOPT_SSL_VERIFYPEER => true,     // Vérifie le certificat SSL (sécurité)
        CURLOPT_USERAGENT      => 'LSFGenerator/1.0 (IntA11Y; accessibility tool)',
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json',
            'Accept-Language: fr-FR,fr;q=0.9',
        ],
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        error_log("LSF Proxy - Erreur cURL pour '{$word}' : {$curlError}");
    } elseif ($httpCode === 200 && $response) {
        // Tentative de décodage JSON
        $apiData = json_decode($response, true);

        if ($apiData && json_last_error() === JSON_ERROR_NONE) {
            // Normalise les données Elix au format attendu par notre application
            $signData = normalizeElixResponse($apiData, $word);
        }
    }
}

// ============================================================
// FALLBACK SI API INDISPONIBLE
// ============================================================

if (!$signData) {
    /**
     * Si l'API Elix est indisponible, on tente SpreadTheSign
     * (une autre base de données de signes internationale).
     */
    $signData = [
        'word'        => $word,
        'videoUrl'    => null,
        'imageUrl'    => null,
        'url'         => "https://www.elix-lsf.fr/spip.php?action=elix_recherche&lang=fr&recherche={$encodedWord}",
        'spreadUrl'   => "https://www.spreadthesign.com/fr.fr/search/?q={$encodedWord}",
        'description' => 'Consultez Elix LSF pour ce signe.',
        'source'      => 'Elix LSF (lien externe)',
        'notFound'    => true,
    ];
}

// ============================================================
// SAUVEGARDE EN CACHE
// ============================================================

/**
 * Sauvegarde le résultat en BDD pour les prochaines requêtes.
 * On sauvegarde même les résultats "non trouvés" pour ne pas
 * rappeler l'API inutilement.
 */
if ($pdo && $signData) {
    try {
        /**
         * INSERT ... ON DUPLICATE KEY UPDATE :
         * Si le mot existe déjà (contrainte UNIQUE), on met à jour.
         * Sinon on insère.
         */
        $stmt = $pdo->prepare('
            INSERT INTO lsf_cache (word, sign_data, created_at)
            VALUES (:word, :data, NOW())
            ON DUPLICATE KEY UPDATE
                sign_data  = :data2,
                created_at = NOW()
        ');

        $stmt->execute([
            ':word'  => $word,
            ':data'  => json_encode($signData),
            ':data2' => json_encode($signData),
        ]);

        // Enregistre aussi la requête utilisateur dans l'historique
        logUserRequest($pdo, $word);

    } catch (PDOException $e) {
        error_log('LSF Proxy - Erreur écriture cache : ' . $e->getMessage());
        // Pas grave : on répond quand même
    }
}

// ============================================================
// RÉPONSE FINALE
// ============================================================

echo json_encode([
    'success' => true,
    'sign'    => $signData,
    'cached'  => false,
    'word'    => $word,
]);

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

/**
 * Normalise la réponse de l'API Elix LSF au format attendu.
 *
 * L'API Elix retourne des données dans un format spécifique.
 * On les adapte au format utilisé par notre application JS.
 *
 * @param array  $data Structure JSON de l'API Elix
 * @param string $word Mot recherché
 * @return array|null Données normalisées ou null si rien trouvé
 */
function normalizeElixResponse(array $data, string $word): ?array
{
    // L'API Elix retourne un tableau d'entrées
    // On prend la première correspondance
    if (empty($data) || !isset($data[0])) {
        return null;
    }

    $entry = $data[0];

    // Extrait l'URL de la vidéo (format MP4 ou WebM)
    $videoUrl = null;
    if (!empty($entry['video'])) {
        $videoUrl = is_array($entry['video'])
            ? ($entry['video']['mp4'] ?? $entry['video']['webm'] ?? null)
            : $entry['video'];
    }

    // Extrait l'URL de l'image (illustration)
    $imageUrl = null;
    if (!empty($entry['image'])) {
        $imageUrl = is_string($entry['image']) ? $entry['image'] : null;
    }

    // URL de la page Elix du signe
    $elixUrl = !empty($entry['url'])
        ? $entry['url']
        : "https://www.elix-lsf.fr/spip.php?action=elix_recherche&lang=fr&recherche=" . urlencode($word);

    return [
        'word'        => $word,
        'label'       => $entry['label'] ?? $word,
        'videoUrl'    => $videoUrl,
        'imageUrl'    => $imageUrl,
        'url'         => $elixUrl,
        'spreadUrl'   => "https://www.spreadthesign.com/fr.fr/search/?q=" . urlencode($word),
        'description' => $entry['definition'] ?? $entry['description'] ?? '',
        'source'      => 'Elix LSF',
        'notFound'    => false,
    ];
}

/**
 * Enregistre une requête utilisateur dans la table d'historique.
 * Utile pour les statistiques et l'amélioration du service.
 *
 * @param PDO    $pdo  Connexion BDD
 * @param string $word Mot recherché
 */
function logUserRequest(PDO $pdo, string $word): void
{
    try {
        // On anonymise l'IP (on prend seulement les 2 premiers octets)
        // ex: 192.168.1.42 → 192.168.0.0
        $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
        $parts = explode('.', $ip);
        $anonymizedIp = isset($parts[0], $parts[1])
            ? $parts[0] . '.' . $parts[1] . '.0.0'
            : '0.0.0.0';

        $stmt = $pdo->prepare('
            INSERT INTO lsf_requests (word, ip_anonymous, searched_at)
            VALUES (:word, :ip, NOW())
        ');

        $stmt->execute([
            ':word' => $word,
            ':ip'   => $anonymizedIp,
        ]);

    } catch (PDOException $e) {
        // Silencieux : l'historique n'est pas critique
        error_log('LSF Proxy - Erreur log requête : ' . $e->getMessage());
    }
}
