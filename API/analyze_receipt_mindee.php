<?php
/**
 * Appel à Mindee API pour OCR des factures
 * Endpoint: POST /API/analyze_receipt_mindee.php
 * 
 * Retourne:
 * {
 *   "success": true,
 *   "data": {
 *     "merchant": "Carrefour",
 *     "amount": 50.00,
 *     "date": "2024-01-15",
 *     "text": "full text extracted"
 *   }
 * }
 */

require 'config.php';
require 'auth.php';
require_auth();

// Charger la configuration locale (contient MINDEE_API_KEY)
if (file_exists('config.local.php')) {
  require 'config.local.php';
}

header('Content-Type: application/json; charset=utf-8');

try {
  // Vérifier que le fichier existe
  if (!isset($_FILES['document']) || $_FILES['document']['error'] !== UPLOAD_ERR_OK) {
    throw new Exception('No file provided or upload error');
  }

  // Récupérer la clé API Mindee (depuis config.local.php ou getenv pour compatibilité)
  if (empty($mindee_api_key)) {
    $mindee_api_key = getenv('MINDEE_API_KEY');
  }
  
  if (!$mindee_api_key) {
    // Fallback: si pas de clé API, retourner erreur (React utilisera Tesseract)
    throw new Exception('Mindee API key not configured');
  }

  // Nettoyer la clé (supprimer espaces, retours à la ligne)
  $mindee_api_key = trim($mindee_api_key);

  $file_tmp = $_FILES['document']['tmp_name'];
  $file_name = $_FILES['document']['name'];

  // Appel à Mindee API v5
  $ch = curl_init('https://api.mindee.net/v1/products/mindee/expense_receipts/v5/predict');

  $cfile = new CURLFile($file_tmp, $_FILES['document']['type'], $file_name);
  
  curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => ['document' => $cfile],
    CURLOPT_HTTPHEADER => [
      'Authorization: Bearer ' . $mindee_api_key
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_VERBOSE => false
  ]);

  $response = curl_exec($ch);
  $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curl_error = curl_error($ch);
  curl_close($ch);

  // Vérifier les erreurs curl
  if ($response === false) {
    throw new Exception('Curl error: ' . $curl_error);
  }

  // Vérifier le code HTTP de Mindee
  if ($http_code !== 200) {
    $error_data = json_decode($response, true);
    $error_msg = $error_data['error']['message'] ?? 'Unknown Mindee error';
    
    // Debug: log complet si 401
    if ($http_code === 401) {
      error_log('Mindee 401 - Full response: ' . $response);
      error_log('Mindee 401 - Key format check: starts with ' . substr($mindee_api_key, 0, 10));
    }
    
    throw new Exception('Mindee API error (' . $http_code . '): ' . $error_msg);
  }

  $mindee_response = json_decode($response, true);

  if (!isset($mindee_response['document'])) {
    throw new Exception('Invalid Mindee response format');
  }

  // Parser la réponse Mindee
  $doc = $mindee_response['document'];
  $prediction = $doc['inference']['pages'][0]['prediction'] ?? [];

  // Extraire les données
  $merchant = '';
  if (isset($prediction['supplier_name'])) {
    $merchant = is_array($prediction['supplier_name']) 
      ? ($prediction['supplier_name']['value'] ?? '')
      : ($prediction['supplier_name'] ?? '');
  }

  $amount = 0.0;
  if (isset($prediction['total_amount'])) {
    $amt = is_array($prediction['total_amount'])
      ? ($prediction['total_amount']['value'] ?? 0)
      : ($prediction['total_amount'] ?? 0);
    $amount = floatval($amt);
  }

  $date = '';
  if (isset($prediction['date'])) {
    $d = is_array($prediction['date'])
      ? ($prediction['date']['value'] ?? '')
      : ($prediction['date'] ?? '');
    $date = $d ? date('Y-m-d', strtotime($d)) : '';
  }

  // Récupérer le texte complet
  $text = $doc['inference']['pages'][0]['raw_text'] ?? '';

  echo json_encode([
    'success' => true,
    'source' => 'mindee',
    'data' => [
      'merchant' => trim($merchant),
      'amount' => $amount,
      'date' => $date,
      'text' => $text,
      'confidence' => 0.95  // Mindee a une très bonne confiance
    ]
  ]);

} catch (Exception $e) {
  http_response_code(400);
  echo json_encode([
    'success' => false,
    'error' => $e->getMessage(),
    'fallback_to_tesseract' => true
  ]);
}
?>
