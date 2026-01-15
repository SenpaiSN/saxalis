<?php
// Migration: add manual_budget DECIMAL(10,2) NULL to categories and subcategories
// Run once: php migrate_add_manual_budget.php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

try {
  $c1 = $pdo->query("SHOW COLUMNS FROM categories LIKE 'manual_budget'")->fetch(PDO::FETCH_ASSOC);
  $c2 = $pdo->query("SHOW COLUMNS FROM subcategories LIKE 'manual_budget'")->fetch(PDO::FETCH_ASSOC);

  $messages = [];
  if (!$c1) {
    $pdo->exec("ALTER TABLE categories ADD COLUMN manual_budget DECIMAL(10,2) NULL");
    $messages[] = "Added manual_budget to categories";
  } else $messages[] = "categories.manual_budget already exists";

  if (!$c2) {
    $pdo->exec("ALTER TABLE subcategories ADD COLUMN manual_budget DECIMAL(10,2) NULL");
    $messages[] = "Added manual_budget to subcategories";
  } else $messages[] = "subcategories.manual_budget already exists";

  echo json_encode(['success' => true, 'messages' => $messages]);
} catch (Exception $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
