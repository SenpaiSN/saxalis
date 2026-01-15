# ACTIONS IMMEDIATES DE SECURITE - SaXalis API
## À effectuer AUJOURD'HUI (Priorité Critique)

---

## 1. SUPPRIMER LES FICHIERS DE LOG IMMEDIATEMENT

```bash
# Depuis le dossier racine SaXalis
cd API
rm -f login.log recurring_login.log check_avatar.log login_errors.log
```

**Pourquoi**: Ces fichiers contiennent des mots de passe en clair et données sensibles.

---

## 2. AJOUTER .log AU .gitignore

Créer ou modifier `.gitignore` à la racine:

```
# Logs
*.log
API/*.log

# Config local
API/config.local.php

# Variables d'environnement
.env
.env.local
```

---

## 3. RETIRER LE LOGGING DES MOTS DE PASSE

**Fichier**: `API/login.php`

**SUPPRIMER les lignes 22 à 31**:
```php
// SUPPRIMER CE BLOC COMPLETEMENT
$logEntry = [
  'time' => date(DATE_ATOM),
  'method' => $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN',
  'uri' => $_SERVER['REQUEST_URI'] ?? '',
  'remote' => $_SERVER['REMOTE_ADDR'] ?? '',
  'headers' => function_exists('getallheaders') ? getallheaders() : [],
  'raw' => $raw,
  'input' => $input
];
@file_put_contents(__DIR__ . '/login.log', json_encode($logEntry) . PHP_EOL, FILE_APPEND);
```

---

## 4. CREER FICHIER .env POUR LES CREDENTIALS

**Créer**: `.env` à la racine du projet

```env
# Base de données
DB_HOST=sql107.infinityfree.com
DB_PORT=3306
DB_NAME=if0_40680976_suivi_depenses
DB_USER=if0_40680976
DB_PASS=OmarndiongueSN

# Application
APP_ENV=production
APP_DEBUG=false
```

**IMPORTANT**: Ajouter `.env` au `.gitignore` !

---

## 5. MODIFIER config.php POUR UTILISER .env

**Fichier**: `API/config.php`

**REMPLACER les lignes 54-60**:
```php
// ANCIEN CODE (À REMPLACER)
$host    = $host ?? getenv('DB_HOST') ?? 'sql107.infinityfree.com';
$port    = $port ?? getenv('DB_PORT') ?? '3306';
$db      = $db ?? getenv('DB_NAME') ?? 'if0_40680976_suivi_depenses';
$user    = $user ?? getenv('DB_USER') ?? 'if0_40680976';
$pass    = $pass ?? getenv('DB_PASS') ?? 'OmarndiongueSN';
```

**PAR**:
```php
// NOUVEAU CODE (SECURISE)
$host = getenv('DB_HOST') ?: 'localhost';
$port = getenv('DB_PORT') ?: '3306';
$db   = getenv('DB_NAME') ?: '';
$user = getenv('DB_USER') ?: '';
$pass = getenv('DB_PASS') ?: '';

// Vérifier que les credentials sont configurés
if (empty($db) || empty($user) || empty($pass)) {
    error_log('Database credentials not configured');
    die(json_encode(['success' => false, 'message' => 'Configuration error']));
}
```

---

## 6. SUPPRIMER config.local.php

```bash
cd API
rm config.local.php
```

**Si déjà dans git**:
```bash
git rm --cached API/config.local.php
git commit -m "security: remove config.local.php from version control"
```

---

## 7. AJOUTER PROTECTION CSRF SUR FICHIERS CRITIQUES

### A. delete_all_transactions.php

**Après la ligne 5**, ajouter:
```php
require 'security.php';

// AJOUTER CETTE LIGNE
verify_csrf_token();
```

### B. update_password.php

**Après la ligne 7**, ajouter:
```php
$data = json_decode($raw, true);

// AJOUTER CETTE LIGNE
require 'security.php';
verify_csrf_token();
```

### C. update_user_profile.php

**Après la ligne 6**, ajouter:
```php
header('Content-Type: application/json; charset=utf-8');

// AJOUTER CES LIGNES
require 'security.php';
verify_csrf_token();
```

---

## 8. SUPPRIMER test_db.php

```bash
cd API
rm test_db.php
```

**Pourquoi**: Expose la structure de la base de données et credentials.

---

## 9. RETIRER LES HEADERS DE DEBUG

**Fichier**: `API/login.php`

**SUPPRIMER la ligne 3**:
```php
// SUPPRIMER CETTE LIGNE
header('X-Served-By: login.php');
```

---

## 10. CONFIGURER LES VARIABLES D'ENVIRONNEMENT SUR LE SERVEUR

### Pour Apache (.htaccess):
Créer/modifier `.htaccess` à la racine:

```apache
# Protection des fichiers sensibles
<FilesMatch "^\.env">
    Require all denied
</FilesMatch>

<FilesMatch "^config\.local\.php$">
    Require all denied
</FilesMatch>

# Variables d'environnement
SetEnv DB_HOST "sql107.infinityfree.com"
SetEnv DB_PORT "3306"
SetEnv DB_NAME "if0_40680976_suivi_depenses"
SetEnv DB_USER "if0_40680976"
SetEnv DB_PASS "OmarndiongueSN"
SetEnv APP_ENV "production"
```

### Pour Nginx:
Dans le bloc server:

```nginx
location ~ /\.env {
    deny all;
}

location ~ config\.local\.php$ {
    deny all;
}

fastcgi_param DB_HOST "sql107.infinityfree.com";
fastcgi_param DB_PORT "3306";
fastcgi_param DB_NAME "if0_40680976_suivi_depenses";
fastcgi_param DB_USER "if0_40680976";
fastcgi_param DB_PASS "OmarndiongueSN";
```

---

## 11. VERIFIER QUE .git N'EST PAS ACCESSIBLE

Tester dans le navigateur:
```
https://votre-domaine.com/.git/config
```

Si accessible, ajouter au `.htaccess`:
```apache
<DirectoryMatch "\.git">
    Require all denied
</DirectoryMatch>
```

---

## 12. CHANGER LE MOT DE PASSE DE LA BASE DE DONNEES

**IMPORTANT**: Une fois que vous avez déplacé le mot de passe dans .env:

1. Se connecter au panel de l'hébergeur
2. Changer le mot de passe de la base de données
3. Mettre à jour le .env avec le nouveau mot de passe
4. Tester la connexion

---

## VERIFICATION POST-ACTIONS

Après avoir effectué ces actions, vérifier:

```bash
# 1. Vérifier qu'aucun log n'existe
ls -la API/*.log
# Résultat attendu: No such file or directory

# 2. Vérifier que .gitignore contient les bons patterns
cat .gitignore | grep -E "\.log|\.env|config\.local"
# Résultat attendu: lignes présentes

# 3. Vérifier que config.local.php n'existe plus
ls -la API/config.local.php
# Résultat attendu: No such file or directory

# 4. Vérifier que les variables d'environnement sont chargées
php -r "echo getenv('DB_HOST');"
# Résultat attendu: sql107.infinityfree.com
```

---

## TEST DE L'APPLICATION

Après les modifications:

1. **Tester la connexion**:
   - Se déconnecter complètement
   - Se reconnecter avec un compte valide
   - Vérifier que pas d'erreur

2. **Tester les opérations CSRF**:
   - Essayer de supprimer une transaction
   - Essayer de changer le mot de passe
   - Vérifier que ça fonctionne avec un token CSRF valide

3. **Vérifier les logs d'erreur**:
   ```bash
   tail -f /var/log/apache2/error.log
   # ou
   tail -f /var/log/nginx/error.log
   ```

---

## EN CAS DE PROBLEME

Si l'application ne fonctionne plus après les modifications:

1. Vérifier les logs d'erreur PHP
2. Vérifier que les variables d'environnement sont bien chargées
3. Vérifier les permissions des fichiers (644 pour PHP, 755 pour dossiers)
4. Contacter le support de l'hébergeur si nécessaire

---

## ACTIONS À PLANIFIER POUR LA SEMAINE PROCHAINE

1. Implémenter rate limiting sur login.php
2. Remplacer exec() dans export_ocr_feedback.php
3. Ajouter headers de sécurité (CSP, X-Frame-Options)
4. Configurer sessions sécurisées
5. Validation de la force des mots de passe

Voir le fichier `RAPPORT_SECURITE.md` pour le plan d'action complet.

---

**Date**: 2026-01-15  
**Durée estimée**: 30-60 minutes  
**Impact**: AUCUN si bien effectué (l'application continue de fonctionner normalement)
