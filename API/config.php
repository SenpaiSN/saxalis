<?php
// CORS helper (dev): autorise les origines localhost, 127.0.0.1 et répond aux preflight OPTIONS

// CORS 
// Default allow for production site; in dev the conditional below will override for localhost origin
header("Access-Control-Allow-Origin: https://saxalis.free.nf"); 
header("Access-Control-Allow-Credentials: true"); 
header("Access-Control-Allow-Headers: Content-Type, Authorization"); 
header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); 
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	 http_response_code(200); 
	 exit();
 }



if (isset($_SERVER['HTTP_ORIGIN'])) {
  $origin = $_SERVER['HTTP_ORIGIN'];
  $parsed = parse_url($origin);
  $host = isset($parsed['host']) ? $parsed['host'] : '';
  // Autoriser localhost, 127.0.0.1 et ::1 (IPv6) sur n'importe quel port en dev
  if (preg_match('/^(localhost|127\.0\.0\.1|::1)$/', $host)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Vary: Origin');
    header('Access-Control-Max-Age: 86400');
  } elseif ($host === 'saxalis.free.nf' || $host === 'www.saxalis.free.nf') {
    // Autoriser explicitement votre domaine de production
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Vary: Origin');
    header('Access-Control-Max-Age: 86400');
  }
}
// Répondre aux preflight (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(200);
  exit();
}

// config.php
// Load optional local config (create API/config.local.php on the server and keep it out of git)
if (file_exists(__DIR__ . '/config.local.php')) {
  include __DIR__ . '/config.local.php';
}

// Ensure PHP date/time functions use UTC by default to avoid accidental local offsets when storing times
ini_set('date.timezone', 'UTC');

// Database connection settings — prefer local config -> env vars -> fail if not configured
// Detect database type (PostgreSQL for Render, MySQL for local dev)
$db_driver = getenv('DB_DRIVER') ?: 'mysql';
$host = $host ?? getenv('DB_HOST') ?: '';
$port = $port ?? getenv('DB_PORT') ?: ($db_driver === 'pgsql' ? '5432' : '3306');
$db   = $db ?? getenv('DB_NAME') ?: '';
$user = $user ?? getenv('DB_USER') ?: '';
$pass = $pass ?? getenv('DB_PASSWORD') ?: getenv('DB_PASS') ?: '';

// Vérifier que les credentials sont configurés
if (empty($host) || empty($db) || empty($user)) {
    error_log('Database credentials not configured. Please create config.local.php or set environment variables.');
    die(json_encode(['success' => false, 'message' => 'Configuration error - credentials not found']));
}

// PostgreSQL or MySQL DSN
if ($db_driver === 'pgsql') {
    // PostgreSQL (Render)
    $dsn = "pgsql:host=$host;port=$port;dbname=$db";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_STRINGIFY_FETCHES  => false,
    ];
} else {
    // MySQL (local development)
    $dsn = "mysql:host=$host;port=$port;dbname=$db;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::ATTR_STRINGIFY_FETCHES  => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES 'utf8mb4', time_zone = '+00:00'",
    ];
}

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    error_log('Database connection failed: ' . $e->getMessage());
    die(json_encode(['success' => false, 'message' => 'Database connection error: ' . $e->getMessage()]));
}

// Exchange/conversion helper (static rates). Replace or extend with an external API if you need live rates.
function get_conversion_rate($from, $to) {
  $rates = [
    'EUR' => ['XOF' => 655.957],
    'XOF' => ['EUR' => 1/655.957]
  ];
  if ($from === $to) return 1.0;
  return $rates[$from][$to] ?? null;
}
?>
