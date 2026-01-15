<?php
require 'config.php';
require 'auth.php';
require_auth();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$id = isset($data['id']) ? (int)$data['id'] : 0;
$fields = [];
$params = [];
if (!$id) { http_response_code(400); echo json_encode(['success'=>false,'error'=>'ID manquant']); exit; }

try {
  $uid = current_user_id();
  $c = $pdo->prepare("SELECT user_id FROM objectif_crees WHERE id_objectif = :id LIMIT 1");
  $c->execute([':id' => $id]);
  $owner = $c->fetch(PDO::FETCH_ASSOC);
  if (!$owner || (int)$owner['user_id'] !== $uid) { http_response_code(403); echo json_encode(['success'=>false,'error'=>'Accès refusé']); exit; }

  $allowed = ['montant','id_subcategory','automatique'];
  foreach ($allowed as $k) {
    if (isset($data[$k])) {
      // convert montant to canonical currency (XOF) if provided
      if ($k === 'montant') {
        try {
          // owner user id loaded earlier in $owner
          $userId = (int)$owner['user_id'];
          $cur = $pdo->prepare("SELECT currency FROM users WHERE id = :uid LIMIT 1");
          $cur->execute([':uid' => $userId]);
          $userCurrency = strtoupper(trim($cur->fetchColumn() ?? 'EUR'));
          $mnt = (float)$data['montant'];
          if ($userCurrency !== 'XOF') {
            $rate = get_conversion_rate($userCurrency, 'XOF');
            if ($rate !== null) $mnt = round($mnt * $rate, 2);
          }
          $fields[] = "{$k} = :{$k}";
          $params[':'.$k] = $mnt;
        } catch (Exception $e) { error_log('update_objectif.php: currency conversion error: ' . $e->getMessage()); $fields[] = "{$k} = :{$k}"; $params[':'.$k] = $data[$k]; }
      } else {
        $fields[] = "{$k} = :{$k}"; $params[':'.$k] = $data[$k];
      }
    }
  }
  if (count($fields) === 0) { echo json_encode(['success'=>true]); exit; }

  $params[':id'] = $id;
  $sql = "UPDATE objectif_crees SET " . implode(', ', $fields) . " WHERE id_objectif = :id";
  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  echo json_encode(['success'=>true]);
} catch (PDOException $e) {
  error_log('update_objectif.php PDOException: ' . $e->getMessage());
  http_response_code(500); echo json_encode(['success'=>false,'error'=>'Erreur serveur']);
}
