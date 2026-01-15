<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$id_subcategory = isset($data['id_subcategory']) ? (int)$data['id_subcategory'] : 0;
$name = isset($data['name']) ? trim($data['name']) : '';
$new_category_id = isset($data['category_id']) ? (int)$data['category_id'] : null;

if ($id_subcategory <= 0 || $name === '') {
  http_response_code(400);
  echo json_encode(['success'=>false,'error'=>'Champs manquants']);
  exit;
}

try {
  // ensure subcategory exists
  $stmt = $pdo->prepare('SELECT category_id FROM subcategories WHERE id_subcategory = ? LIMIT 1');
  $stmt->execute([$id_subcategory]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if (!$row) {
    http_response_code(404);
    echo json_encode(['success'=>false,'error'=>'Sous-catégorie introuvable']);
    exit;
  }

  $target_category = $row['category_id'];
  if ($new_category_id !== null && $new_category_id > 0) {
    // verify requested category exists
    $chk = $pdo->prepare('SELECT COUNT(1) FROM categories WHERE id_category = ?');
    $chk->execute([$new_category_id]);
    if ((int)$chk->fetchColumn() === 0) {
      http_response_code(400);
      echo json_encode(['success'=>false,'error'=>'category_id invalide']);
      exit;
    }
    $target_category = $new_category_id;
  }

  // Check duplicate name within target category (exclude current)
  $dup = $pdo->prepare('SELECT id_subcategory FROM subcategories WHERE category_id = ? AND name = ? AND id_subcategory != ?');
  $dup->execute([$target_category, $name, $id_subcategory]);
  if ($dup->fetch()) {
    echo json_encode(['success'=>false,'error'=>'Sous-catégorie déjà existante']);
    exit;
  }

  $icon = isset($data['icon']) ? trim($data['icon']) : null;  $manual_budget = array_key_exists('manual_budget', $data) ? (is_numeric($data['manual_budget']) ? (float)$data['manual_budget'] : null) : null;  $allowed_icons = ['Target','Car','Taxi','SUV','Bus','Plane','Train','MoneyBag','MoneyWings','Bride','Girl','ManRedHair','CableCar','Hospital','Shopping','Books','Clothes','ShoppingCart','Coffee','Gift','CreditCard','Book','Heart','Film','Truck','User','Calendar','Package','Wallet','LowBattery','Lightning','Plug','WomanWithHeadscarf','Dining','Pasta','HaircutMan','Construction','Factory','CalendarAlt','Bank','DoctorWoman','Medical','Pill','Stethoscope','HealthWorker','Tooth','Droplet','Tools','Graduation','Home','Pin','Phone','Laptop'];
  // emoji -> key fallback
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

  $stmt = $pdo->prepare('UPDATE subcategories SET name = ?, category_id = ?, icon = ?, manual_budget = ? WHERE id_subcategory = ?');
  $stmt->execute([$name, $target_category, $icon, $manual_budget, $id_subcategory]);

  echo json_encode(['success'=>true]);
} catch (PDOException $e) {
  error_log('update_subcategory.php PDOException: ' . $e->getMessage());
  http_response_code(500);
  echo json_encode(['success'=>false,'error'=>'Erreur serveur']);
}
