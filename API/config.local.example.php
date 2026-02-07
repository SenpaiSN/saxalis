<?php
// Example local config. Copy this to config.local.php and fill with your real credentials.
// This file *must not* be committed to your repository.

$host = 'sql107.infinityfree.com';
$port = '3306';
$db   = 'if0_40680976_suivi_depenses';
$user = 'if0_40680976';
$pass = 'OmarndiongueSN';

// Optional: secret token used to securely run recurring-plan runners from cron/scripts
// Generate a long random secret: use a password manager or: python3 -c "import secrets; print(secrets.token_urlsafe(32))"
// If you have a cron service (not on InfinityFree), uncomment and set this:
// $cron_secret = 'your-long-random-secret-here-minimum-32-chars';

// On InfinityFree: You can call the runner from within the app using force=1 while authenticated
// Since InfinityFree doesn't support traditional cron jobs, use the app's UI or a scheduled task from another service
