# ✅ CHECKLIST DE SECURITE - SaXalis API

**Date**: 2026-01-15  
**Objectif**: Liste de vérification pour corriger toutes les vulnérabilités

---

## 🔴 ACTIONS CRITIQUES (À faire AUJOURD'HUI)

### Etape 1: Supprimer les fichiers de log sensibles
- [ ] Supprimer `API/login.log`
- [ ] Supprimer `API/recurring_login.log`
- [ ] Supprimer `API/check_avatar.log`
- [ ] Supprimer `API/login_errors.log` (si existe)
- [ ] Vérifier qu'aucun autre fichier .log n'existe dans API/

**Commande**:
```bash
cd API && rm -f *.log
```

---

### Etape 2: Protéger contre le versioning des fichiers sensibles
- [ ] Créer/éditer `.gitignore` à la racine
- [ ] Ajouter `*.log` au .gitignore
- [ ] Ajouter `.env` au .gitignore
- [ ] Ajouter `API/config.local.php` au .gitignore
- [ ] Supprimer `config.local.php` du repository git (si versionné)

**Commandes**:
```bash
echo "*.log" >> .gitignore
echo ".env" >> .gitignore
echo "API/config.local.php" >> .gitignore
git rm --cached API/config.local.php
```

---

### Etape 3: Créer fichier .env pour les credentials
- [ ] Créer fichier `.env` à la racine du projet
- [ ] Ajouter toutes les variables de configuration
- [ ] Vérifier que le fichier n'est PAS accessible via HTTP
- [ ] Tester que les variables sont bien chargées

**Contenu du .env**:
```env
DB_HOST=sql107.infinityfree.com
DB_PORT=3306
DB_NAME=if0_40680976_suivi_depenses
DB_USER=if0_40680976
DB_PASS=OmarndiongueSN
APP_ENV=production
APP_DEBUG=false
```

---

### Etape 4: Modifier config.php pour utiliser .env
- [ ] Ouvrir `API/config.php`
- [ ] Remplacer les valeurs en dur par `getenv()`
- [ ] Retirer les valeurs par défaut des credentials
- [ ] Ajouter vérification que les credentials sont définis
- [ ] Tester la connexion à la base de données

**Modifications dans config.php lignes 54-60**:
```php
// AVANT
$pass = $pass ?? getenv('DB_PASS') ?? 'OmarndiongueSN';

// APRÈS
$pass = getenv('DB_PASS') ?: '';
if (empty($pass)) {
    error_log('DB credentials not configured');
    die(json_encode(['success' => false, 'message' => 'Configuration error']));
}
```

---

### Etape 5: Retirer le logging des mots de passe
- [ ] Ouvrir `API/login.php`
- [ ] Supprimer les lignes 22-31 (bloc $logEntry)
- [ ] Supprimer la ligne 3 (header X-Served-By)
- [ ] Retirer les lignes 82, 96, 102, 111 (recurring_login.log)
- [ ] Vérifier qu'aucun autre endroit ne log des données sensibles

**Lignes à supprimer dans login.php**:
- Ligne 3: `header('X-Served-By: login.php');`
- Lignes 22-31: Tout le bloc `$logEntry = [...]`

---

### Etape 6: Ajouter protection CSRF sur fichiers critiques
- [ ] Modifier `API/delete_all_transactions.php`
- [ ] Modifier `API/update_password.php`
- [ ] Modifier `API/update_user_profile.php`
- [ ] Tester que les opérations fonctionnent avec token CSRF

**Code à ajouter dans chaque fichier**:
```php
require 'security.php';
verify_csrf_token();
```

**Détails**:

**delete_all_transactions.php** - Après ligne 5:
```php
require 'auth.php';
require 'security.php';  // AJOUTER
require_auth();
verify_csrf_token();      // AJOUTER
```

**update_password.php** - Après ligne 7:
```php
$data = json_decode($raw, true);
require 'security.php';   // AJOUTER
verify_csrf_token();      // AJOUTER
```

**update_user_profile.php** - Après ligne 6:
```php
header('Content-Type: application/json; charset=utf-8');
require 'security.php';   // AJOUTER
verify_csrf_token();      // AJOUTER
```

---

### Etape 7: Supprimer fichiers de test et debug
- [ ] Supprimer `API/test_db.php`
- [ ] Supprimer `API/test_post.php` (si existe)
- [ ] Supprimer `API/debug_*.php` OU les protéger par auth admin
- [ ] Vérifier qu'aucun fichier test/debug n'est accessible

**Commandes**:
```bash
cd API
rm -f test_db.php test_post.php
# Pour les debug_*.php, décider si à garder ou supprimer
```

---

### Etape 8: Configurer variables d'environnement sur le serveur
- [ ] Se connecter au panel d'hébergement
- [ ] Configurer les variables d'environnement
- [ ] OU créer/modifier .htaccess pour définir les variables
- [ ] Tester que getenv() retourne les bonnes valeurs

**Pour Apache (.htaccess)**:
```apache
SetEnv DB_HOST "sql107.infinityfree.com"
SetEnv DB_PORT "3306"
SetEnv DB_NAME "if0_40680976_suivi_depenses"
SetEnv DB_USER "if0_40680976"
SetEnv DB_PASS "OmarndiongueSN"
SetEnv APP_ENV "production"
```

---

### Etape 9: Protéger les fichiers sensibles via .htaccess
- [ ] Créer/modifier `.htaccess` à la racine
- [ ] Bloquer l'accès à `.env`
- [ ] Bloquer l'accès à `.git/`
- [ ] Bloquer l'accès à `config.local.php`
- [ ] Tester que les fichiers ne sont pas accessibles via HTTP

**Contenu .htaccess**:
```apache
# Bloquer .env
<FilesMatch "^\.env">
    Require all denied
</FilesMatch>

# Bloquer .git
<DirectoryMatch "\.git">
    Require all denied
</DirectoryMatch>

# Bloquer config.local.php
<FilesMatch "^config\.local\.php$">
    Require all denied
</FilesMatch>

# Bloquer fichiers de backup
<FilesMatch "\.(bak|backup|old|sql|log)$">
    Require all denied
</FilesMatch>
```

---

### Etape 10: Tests de vérification
- [ ] Tester la connexion (login/logout)
- [ ] Tester ajout de transaction
- [ ] Tester suppression de transaction (vérifier CSRF)
- [ ] Tester changement de mot de passe (vérifier CSRF)
- [ ] Vérifier les logs d'erreur serveur
- [ ] Confirmer qu'aucun mot de passe n'est logué

---

## 🟠 ACTIONS HAUTE PRIORITE (Cette semaine)

### Rate Limiting sur Login
- [ ] Choisir solution: Redis, memcached ou database
- [ ] Créer fonction `check_rate_limit($email, $ip)`
- [ ] Implémenter blocage après 5 tentatives
- [ ] Ajouter CAPTCHA après 3 échecs (optionnel)
- [ ] Logger les tentatives suspectes
- [ ] Tester le blocage

---

### Remplacer exec() par SDK AWS
- [ ] Installer SDK AWS: `composer require aws/aws-sdk-php`
- [ ] Modifier `API/export_ocr_feedback.php`
- [ ] Remplacer `exec('aws s3 cp ...')` par S3Client
- [ ] Tester l'upload S3
- [ ] Retirer les lignes exec()

**Code de remplacement**:
```php
use Aws\S3\S3Client;

$s3 = new S3Client([
    'version' => 'latest',
    'region'  => getenv('AWS_REGION') ?: 'eu-west-1'
]);

$result = $s3->putObject([
    'Bucket' => $s3Bucket,
    'Key'    => $s3Key,
    'SourceFile' => $gzpath
]);
```

---

### Ajouter Headers de Sécurité
- [ ] Ouvrir `API/config.php`
- [ ] Ajouter headers CSP, X-Frame-Options, etc.
- [ ] Tester dans le navigateur (DevTools > Network)
- [ ] Vérifier score sur securityheaders.com

**Headers à ajouter dans config.php**:
```php
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: DENY");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("Permissions-Policy: geolocation=(), microphone=(), camera=()");
```

---

### Configurer Sessions Sécurisées
- [ ] Ouvrir `API/config.php`
- [ ] Ajouter configuration session avant session_start()
- [ ] Tester que les cookies sont bien sécurisés
- [ ] Vérifier dans DevTools > Application > Cookies

**Configuration à ajouter**:
```php
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);      // Nécessite HTTPS
ini_set('session.cookie_samesite', 'Strict');
ini_set('session.use_strict_mode', 1);
ini_set('session.gc_maxlifetime', 3600);  // 1 heure
session_name('SAXALIS_SESSION');
```

---

### Validation Force Mot de Passe
- [ ] Créer fonction `validate_password_strength()`
- [ ] Ajouter dans `API/security.php`
- [ ] Utiliser dans `register.php`
- [ ] Utiliser dans `update_password.php`
- [ ] Tester avec mots de passe faibles

**Fonction à ajouter**:
```php
function validate_password_strength($password) {
    if (strlen($password) < 12) {
        throw new ValidationException('Mot de passe: minimum 12 caractères');
    }
    if (!preg_match('/[A-Z]/', $password)) {
        throw new ValidationException('Mot de passe: au moins une majuscule');
    }
    if (!preg_match('/[a-z]/', $password)) {
        throw new ValidationException('Mot de passe: au moins une minuscule');
    }
    if (!preg_match('/[0-9]/', $password)) {
        throw new ValidationException('Mot de passe: au moins un chiffre');
    }
    if (!preg_match('/[^A-Za-z0-9]/', $password)) {
        throw new ValidationException('Mot de passe: au moins un caractère spécial');
    }
    return true;
}
```

---

### Changer Mot de Passe Base de Données
- [ ] Se connecter au panel hébergeur
- [ ] Générer nouveau mot de passe fort (20+ caractères)
- [ ] Changer mot de passe DB
- [ ] Mettre à jour .env avec nouveau mot de passe
- [ ] Mettre à jour variables serveur (.htaccess)
- [ ] Tester la connexion
- [ ] Confirmer que l'ancien mot de passe ne fonctionne plus

---

## 🟡 ACTIONS MOYENNE PRIORITE (Ce mois)

### Pagination sur Listes
- [ ] Modifier `API/get_transactions.php`
- [ ] Ajouter paramètres `page` et `limit`
- [ ] Limiter à 50 par défaut, 100 maximum
- [ ] Retourner métadonnées (total, pages)
- [ ] Appliquer à toutes les listes (categories, goals, etc.)

---

### Audit Logging
- [ ] Créer table `audit_log` en DB
- [ ] Créer fonction `log_audit($action, $table, $record_id, $data)`
- [ ] Logger toutes les modifications (INSERT, UPDATE, DELETE)
- [ ] Logger les connexions/déconnexions
- [ ] Créer endpoint admin pour consulter les logs

---

### Soft Delete
- [ ] Ajouter colonne `deleted_at` aux tables principales
- [ ] Modifier DELETE en UPDATE deleted_at
- [ ] Exclure deleted dans les SELECT
- [ ] Créer endpoint pour restaurer
- [ ] Créer job de purge après 30 jours

---

### Protection Directory Traversal
- [ ] Modifier `API/upload_helper.php`
- [ ] Utiliser `realpath()` pour valider chemin
- [ ] Vérifier que fichier reste dans dossier autorisé
- [ ] Tester avec noms de fichiers malveillants

**Code à ajouter**:
```php
$dest = realpath(rtrim($targetDir, '/')) . '/' . $filename;
$allowedDir = realpath($targetDir);
if (strpos($dest, $allowedDir) !== 0) {
    error_log("Directory traversal attempt: $dest");
    return false;
}
```

---

### Vérification Unicité Email
- [ ] Modifier `API/update_user_profile.php`
- [ ] Vérifier que l'email n'est pas déjà utilisé
- [ ] Exclure l'utilisateur actuel de la vérification
- [ ] Retourner erreur 409 si duplicata

---

### Nettoyage Fichiers Orphelins
- [ ] Modifier `API/upload_avatar.php`
- [ ] Si update DB échoue, supprimer fichier uploadé
- [ ] Créer job de nettoyage hebdomadaire
- [ ] Détecter fichiers sans référence DB

---

### Retirer Suppresseurs d'Erreurs
- [ ] Chercher tous les `@` dans le code
- [ ] Remplacer par try/catch appropriés
- [ ] Logger les erreurs au lieu de les masquer
- [ ] Tester que les erreurs sont bien gérées

---

### Améliorer Validation Email
- [ ] Créer fonction `validate_email_strict()`
- [ ] Vérifier format strict
- [ ] Blacklister domaines jetables
- [ ] Optionnel: vérifier MX record
- [ ] Utiliser dans register et update_profile

---

## ⚪ ACTIONS FAIBLE PRIORITE (Optionnel)

### Vérification Résolution Images
- [ ] Ajouter vérification dimensions dans upload_helper
- [ ] Limiter à 2000x2000 pixels
- [ ] Optionnel: redimensionner automatiquement

---

### Versioning API
- [ ] Créer dossier API/v1/
- [ ] Déplacer tous les fichiers
- [ ] Mettre à jour frontend pour utiliser /v1/
- [ ] Documenter dans README

---

### Documentation OpenAPI
- [ ] Installer swagger-php
- [ ] Documenter tous les endpoints
- [ ] Générer openapi.yaml
- [ ] Créer interface Swagger UI

---

### Tests de Sécurité Automatisés
- [ ] Installer PHPStan
- [ ] Installer OWASP ZAP
- [ ] Créer suite de tests
- [ ] Intégrer dans CI/CD
- [ ] Exécuter hebdomadairement

---

## 🔍 VERIFICATION FINALE

### Checklist de Vérification Complète
- [ ] Aucun credential en clair dans le code
- [ ] Aucun fichier .log dans le repository
- [ ] .env dans .gitignore
- [ ] CSRF sur tous les endpoints modifiants
- [ ] Rate limiting actif sur login
- [ ] Headers de sécurité présents
- [ ] Sessions sécurisées (HttpOnly, Secure, SameSite)
- [ ] Validation force mot de passe
- [ ] exec() remplacé par SDK
- [ ] Fichiers debug supprimés
- [ ] .htaccess protège fichiers sensibles
- [ ] HTTPS actif et forcé
- [ ] Tests fonctionnels passent
- [ ] Aucune erreur dans logs serveur

---

### Tests de Sécurité
- [ ] Tester avec OWASP ZAP
- [ ] Tester injection SQL (doit échouer)
- [ ] Tester CSRF (doit bloquer sans token)
- [ ] Tester brute force (doit bloquer après 5)
- [ ] Tester accès à .env (doit être bloqué)
- [ ] Tester accès à .git/ (doit être bloqué)
- [ ] Vérifier headers avec securityheaders.com
- [ ] Scanner avec composer audit

---

### Documentation
- [ ] Documenter nouvelles variables d'environnement
- [ ] Créer guide de déploiement sécurisé
- [ ] Documenter politique de mots de passe
- [ ] Créer plan de réponse aux incidents

---

## 📊 SUIVI DE PROGRESSION

**Date de début**: ________________  
**Date cible de fin**: ________________

**Progression**:
- [ ] Actions Critiques (10 étapes)
- [ ] Actions Haute Priorité (6 tâches)
- [ ] Actions Moyenne Priorité (8 tâches)
- [ ] Actions Faible Priorité (4 tâches)

**Score de Sécurité**:
- Initial: 45/100
- Après actions critiques: ~60/100
- Après actions haute priorité: ~75/100
- Après actions moyenne priorité: ~85/100
- Objectif final: 90/100

---

**NOTE**: Cochez chaque case une fois l'action complétée et testée.

**Date de création**: 2026-01-15  
**Dernière mise à jour**: ________________
