# 🚀 GUIDE DE DÉPLOIEMENT SÉCURISÉ - InfinityFree

**Date:** 15 janvier 2026  
**Environnement:** Production (InfinityFree)

---

## 📋 FICHIERS À UPLOADER

### 1. Fichiers .htaccess (2 fichiers)

**✅ Déjà créés dans le projet:**
- `.htaccess` (racine) - Redirection SPA + headers sécurité + cache
- `API/.htaccess` - Variables d'environnement + sécurité API

### 2. Structure à uploader sur InfinityFree

```
htdocs/
├── .htaccess                    ← Nouveau (sécurité + SPA routing)
├── index.html                   ← Build frontend
├── assets/                      ← Fichiers JS/CSS du build
├── images/                      ← Images publiques
└── API/
    ├── .htaccess                ← Nouveau (variables env + sécurité)
    ├── config.php               ← Modifié (sécurisé)
    ├── login.php                ← Modifié (nettoyé)
    ├── security.php
    ├── auth.php
    ├── delete_all_transactions.php  ← Modifié (CSRF)
    ├── update_password.php      ← Modifié (CSRF)
    ├── update_user_profile.php  ← Modifié (CSRF)
    └── [autres fichiers API...]
```

**❌ NE PAS UPLOADER:**
- `.env`
- `node_modules/`
- `src/` (code source)
- `*.log`
- `.git/`
- `package.json`, `package-lock.json`

---

## 🔧 ÉTAPES DE DÉPLOIEMENT

### ÉTAPE 1: Build du frontend (local)

```bash
cd c:\MAMP\htdocs\SaXalis
npm run build
```

Cela génère le dossier `dist/` avec les fichiers optimisés.

---

### ÉTAPE 2: Préparer les fichiers

1. **Copier .htaccess dans dist/**
   ```bash
   copy .htaccess dist\.htaccess
   ```

2. **Vérifier le contenu de dist/**
   ```
   dist/
   ├── .htaccess
   ├── index.html
   ├── assets/
   │   ├── index-xxxxx.js
   │   └── index-xxxxx.css
   └── images/
   ```

---

### ÉTAPE 3: Upload via FTP/File Manager

#### Option A: File Manager InfinityFree

1. Connexion à InfinityFree Control Panel
2. Ouvrir **File Manager**
3. Aller dans `htdocs/`
4. **Supprimer tout le contenu existant**
5. **Upload:**
   - Tout le contenu de `dist/` → dans `htdocs/`
   - Dossier `API/` complet → dans `htdocs/API/`

#### Option B: FTP (FileZilla)

**Connexions:**
```
Host: ftpupload.net (ou votre serveur FTP)
Username: if0_40680976
Password: [votre mot de passe FTP]
Port: 21
```

**Upload:**
1. Local: `dist/*` → Remote: `/htdocs/`
2. Local: `API/` → Remote: `/htdocs/API/`

---

### ÉTAPE 4: Vérifier API/.htaccess

**⚠️ IMPORTANT:** Ouvrir `API/.htaccess` sur le serveur et vérifier que les credentials sont corrects:

```apache
SetEnv DB_HOST sql107.infinityfree.com
SetEnv DB_PORT 3306
SetEnv DB_NAME if0_40680976_suivi_depenses
SetEnv DB_USER if0_40680976
SetEnv DB_PASS OmarndiongueSN     ← Vérifier
```

---

### ÉTAPE 5: Permissions des dossiers

Définir les permissions sur InfinityFree:

```
htdocs/                  → 755
htdocs/API/              → 755
htdocs/API/uploads/      → 755 (créer si n'existe pas)
htdocs/API/uploads/profiles/  → 755 (créer si n'existe pas)
htdocs/API/uploads/invoices/  → 755 (créer si n'existe pas)
```

**Créer les dossiers manquants via File Manager:**
```
API/uploads/
API/uploads/profiles/
API/uploads/invoices/
```

---

### ÉTAPE 6: Tests de vérification

#### 1. Test de base
```
https://saxalis.free.nf/
```
✅ Devrait afficher votre application

#### 2. Test API de connexion DB

Créer temporairement `API/test_connection.php`:
```php
<?php
require 'config.php';
echo json_encode([
    'success' => true, 
    'db_connected' => isset($pdo),
    'env_loaded' => !empty(getenv('DB_HOST'))
]);
```

Visiter:
```
https://saxalis.free.nf/API/test_connection.php
```

✅ Devrait retourner: `{"success":true,"db_connected":true,"env_loaded":true}`

**⚠️ Supprimer ce fichier après test!**

#### 3. Test headers de sécurité

Visiter:
```
https://securityheaders.com/?q=https://saxalis.free.nf
```

✅ Devrait montrer les headers (X-Frame-Options, CSP, etc.)

#### 4. Test login

Visiter:
```
https://saxalis.free.nf/
```

Essayer de se connecter avec vos identifiants.

✅ Login devrait fonctionner sans erreurs 403 (CSRF)

---

## 🔍 DÉPANNAGE

### Erreur: "Configuration error"

**Cause:** Variables d'environnement non chargées

**Solution:**
1. Vérifier que `API/.htaccess` existe
2. Vérifier les directives `SetEnv`
3. Certains hébergeurs désactivent `SetEnv` → Utiliser alternative

**Alternative si SetEnv ne fonctionne pas:**

Créer `API/config.local.php` sur le serveur:
```php
<?php
$host = 'sql107.infinityfree.com';
$port = '3306';
$db   = 'if0_40680976_suivi_depenses';
$user = 'if0_40680976';
$pass = 'OmarndiongueSN';
```

Et protéger via `.htaccess`:
```apache
<Files "config.local.php">
    Require all denied
</Files>
```

### Erreur 403 sur les requêtes POST

**Cause:** Token CSRF manquant dans les requêtes frontend

**Solution:**
Vérifier que le frontend envoie bien le token CSRF (déjà implémenté dans `src/services/api.ts`)

### Erreur 500 sur certains endpoints

**Cause:** Fonction `exec()` désactivée dans `.htaccess`

**Solution:**
Si `export_ocr_feedback.php` plante, modifier `API/.htaccess`:
```apache
# Retirer exec de la liste disable_functions
php_value disable_functions "passthru,shell_exec,system,proc_open,popen"
```

### Images/avatars ne s'affichent pas

**Cause:** Dossier uploads manquant ou permissions incorrectes

**Solution:**
```bash
# Via File Manager, créer:
htdocs/API/uploads/
htdocs/API/uploads/profiles/ (permissions 755)
htdocs/API/uploads/invoices/ (permissions 755)
```

---

## 🛡️ VÉRIFICATIONS DE SÉCURITÉ POST-DÉPLOIEMENT

### Checklist:

- [ ] Fichier `.env` NON présent sur le serveur
- [ ] `API/.htaccess` contient les variables d'environnement
- [ ] `.htaccess` racine configure les headers de sécurité
- [ ] Aucun fichier `.log` présent
- [ ] `test_connection.php` supprimé après test
- [ ] Headers de sécurité visibles sur securityheaders.com
- [ ] Login fonctionne
- [ ] CSRF fonctionne (pas d'erreur 403 sur update_password)
- [ ] Upload d'avatar fonctionne
- [ ] Permissions dossiers corrects (755)

---

## 📊 COMPARAISON AVANT/APRÈS

| Aspect | Avant | Après |
|--------|-------|-------|
| Credentials | 🔴 Dans Git | ✅ Variables env |
| Headers sécurité | 🔴 Absents | ✅ Configurés |
| CSRF | 🔴 Partiel | ✅ Complet |
| Logs sensibles | 🔴 Exposés | ✅ Supprimés |
| Debug headers | 🔴 Actifs | ✅ Retirés |
| Sessions | 🔴 Non sécurisées | ✅ httpOnly + secure |
| Upload limites | 🔴 Illimité | ✅ 2MB |
| Fonctions dangereuses | 🔴 Actives | ✅ Désactivées |

---

## 🎯 PROCHAINES ÉTAPES

Après déploiement réussi:

1. **Monitoring**
   - Surveiller les logs d'erreurs PHP
   - Vérifier les performances

2. **Sauvegardes**
   - Configurer backup automatique DB (hebdomadaire)
   - Sauvegarder les uploads

3. **Améliorations futures**
   - Rate limiting sur login (via IP)
   - Authentification 2FA
   - Monitoring d'intrusion

---

## 📞 SUPPORT

En cas de problème:

1. Vérifier les logs PHP sur InfinityFree
2. Consulter `SECURITE_ACTIONS_COMPLETEES.md`
3. Tester en local d'abord avec MAMP

---

**✅ Guide de déploiement prêt !**

Date: 15 janvier 2026
