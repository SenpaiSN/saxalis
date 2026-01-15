<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$category_id = isset($data['category_id']) ? (int)$data['category_id'] : 0;
$name = isset($data['name']) ? trim($data['name']) : '';

$icon = isset($data['icon']) ? trim($data['icon']) : null;

if ($category_id <= 0 || $name === '') {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>'Champs manquants']);
  exit;
}

// Simple whitelist to avoid letting users store arbitrary icon names
$allowed_icons = ['Target','Car','Taxi','SUV','Bus','Plane','Train','MoneyBag','MoneyWings','Bride','Girl','ManRedHair','CableCar','Hospital','Shopping','Books','Clothes','ShoppingCart','Coffee','Gift','CreditCard','Book','Heart','Film','Truck','User','Calendar','Package','Wallet','LowBattery','Lightning','Plug','WomanWithHeadscarf','Dining','Pasta','HaircutMan','Construction','Factory','CalendarAlt','Bank','DoctorWoman','Medical','Pill','Stethoscope','HealthWorker','Tooth','Droplet','Tools','Graduation','Home','Pin','Phone','Laptop'];
// If a user passed an emoji character directly (e.g. copied an emoji into the form), try to map it to the canonical key
$emoji_map = [
  '🎯' => 'Target',
  '🚗' => 'Car',
  '🚕' => 'Taxi',
  '🚙' => 'SUV',
  '🚌' => 'Bus',
  '✈️' => 'Plane',
  '🚆' => 'Train',
  '💰' => 'MoneyBag',
  '💸' => 'MoneyWings',
  '👰‍♀️' => 'Bride',
  '👧' => 'Girl',
  '👨‍🦰' => 'ManRedHair',
  '🚡' => 'CableCar',
  '🏥' => 'Hospital',
  // new emoji mappings
  '🪫' => 'LowBattery',
  '⚡' => 'Lightning',
  '🔌' => 'Plug',
  '🧕' => 'WomanWithHeadscarf',
  '🍽️' => 'Dining',
  '🍝' => 'Pasta',
  '💇‍♂️' => 'HaircutMan',
  '📦' => 'Package',
  '🏗️' => 'Construction',
  '🏭' => 'Factory',
  '📆' => 'CalendarAlt',
  '🏦' => 'Bank',
  '👩‍⚕️' => 'DoctorWoman',
  '⚕️' => 'Medical',
  '💊' => 'Pill',
  '🩺' => 'Stethoscope',
  '🧑‍⚕️' => 'HealthWorker',
  '🦷' => 'Tooth',
  '💧' => 'Droplet',
  '🛠️' => 'Tools',
  '🎓' => 'Graduation',
  // added per user request
  '🏠' => 'Home',
  '📌' => 'Pin',
  '📱' => 'Phone',
  '💻' => 'Laptop'
];
if ($icon !== null && $icon !== '' && !in_array($icon, $allowed_icons, true)) {
  if (array_key_exists($icon, $emoji_map)) {
    $icon = $emoji_map[$icon];
  }
}
if ($icon !== null && $icon !== '' && !in_array($icon, $allowed_icons, true)) {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>'Icone invalide']);
  exit;
}

try {
  // Vérifier doublon
  $stmt = $pdo->prepare('SELECT id_subcategory FROM subcategories WHERE category_id = ? AND name = ?');
  $stmt->execute([$category_id, $name]);
  if ($stmt->fetch()) {
    echo json_encode(['success'=>false,'error'=>'Sous-catégorie déjà existante']);
    exit;
  }

  $manual_budget = isset($data['manual_budget']) ? (is_numeric($data['manual_budget']) ? (float)$data['manual_budget'] : null) : null;

  // Insert with optional icon and manual budget
  $stmt = $pdo->prepare('INSERT INTO subcategories (category_id, name, icon, manual_budget) VALUES (?, ?, ?, ?)');
  $stmt->execute([$category_id, $name, $icon, $manual_budget]);
  echo json_encode(['success'=>true,'id'=>$pdo->lastInsertId()]);
} catch (PDOException $e) {
  error_log('add_subcategory.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'Erreur serveur']);
}

?>
