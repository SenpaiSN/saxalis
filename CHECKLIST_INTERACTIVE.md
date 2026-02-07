# 📋 CHECKLIST INTERACTIF - Migration Render

Utilisez ce document en parallèle de la migration. Cochez les cases au fur et à mesure.

---

## 🟦 PRÉPARATION

### Infos à Récupérer (Render Dashboard)

Aller à: https://dashboard.render.com/databases

**Database: saxalis-db**

Remplissez ces champs:
```
[ ] Host: ________________________________
[ ] Port: ________________________________ (normalement 5432)
[ ] User: ________________________________
[ ] Password: ____________________________
[ ] Database: saxalis
[ ] External URL: _________________________
```

**Sauvegardez ces infos dans un fichier sécurisé!**

### GitHub

```
[ ] Créer compte GitHub (github.com si pas déjà)
[ ] Créer repository PUBLIC nommé "saxalis"
[ ] Copier: git remote URL: ____________________________________
```

---

## 🔵 ÉTAPE 1: Pousser Code sur GitHub

**Durée: 5-10 minutes**

```powershell
# Copier-coller dans PowerShell:

cd C:\MAMP\htdocs\SaXalis

[ ] Vérifier que git est installé:
    git --version

[ ] Vérifier que vous êtes dans le bon dossier:
    pwd   # Doit montrer: C:\MAMP\htdocs\SaXalis

[ ] Vérifier status git:
    git status

[ ] Ajouter tous les fichiers:
    git add .

[ ] First commit:
    git commit -m "SaXalis - Ready for Render migration"

[ ] Changer branche à main:
    git branch -M main

[ ] Ajouter remote (remplacer l'URL):
    git remote remove origin  # (ignore si erreur)
    git remote add origin https://github.com/YOU/saxalis.git

[ ] Pousser le code:
    git push -u origin main

# Attendre la fin (peut prendre 1-2 minutes)

[ ] Vérifier sur GitHub.com que votre code est là
```

✅ **Étape 1 Complète**

---

## 🟢 ÉTAPE 2: Migrer Base de Données MySQL → PostgreSQL

**Durée: 15-20 minutes**

### Option 1: Avec PgAdmin (Recommandé)

```
[ ] Télécharger PgAdmin: https://www.pgadmin.org/download/
    (Choisir Windows)

[ ] Installer PgAdmin

[ ] Ouvrir PgAdmin4

[ ] Créer Master Password (random string)
    Master Password: __________________________

[ ] Connecter la DB Render:
    - Gauche: Servers
    - Clic droit: Register → Server
    - Name: Render
    - Connection tab:
      - Hostname: [votre Host Render]
      - Port: 5432
      - Username: [votre User Render]
      - Password: [votre Password Render]
      - Database: saxalis
    - Save

[ ] Si "Render" apparaît, connexion OK ✓

[ ] Exporter structure MySQL:
    POWERSHELL:
    mysqldump -u root suivi_depenses --no-data > C:\temp\schema.sql
    
    [ ] Fichier créé: C:\temp\schema.sql

[ ] Exporter données MySQL:
    POWERSHELL:
    mysqldump -u root suivi_depenses --no-create-info > C:\temp\data.sql
    
    [ ] Fichier créé: C:\temp\data.sql

[ ] Adapter schema pour PostgreSQL:
    OPTION A: Online converter
    - Aller à: https://www.beerus.dev/mysql2pgsql/
    - Copier-coller schema.sql
    - Copy output → Sauver en schema_pgsql.sql
    
    OPTION B: Manuellement (si schema petit)
    - Éditer C:\temp\schema.sql
    - Remplacer:
      - `AUTO_INCREMENT` → DELETE (PostgreSQL utilise SERIAL)
      - `COLLATE utf8mb4_unicode_ci` → DELETE
    - Sauver en schema_pgsql.sql

[ ] Importer schema dans PostgreSQL (via PgAdmin):
    - Clic droit DB "saxalis" → Query Tool
    - Copier-coller contenu schema_pgsql.sql
    - Click Execute (F5)
    - [ ] Pas d'erreurs (ou erreurs non-bloquantes)

[ ] Importer données:
    - Query Tool (DB saxalis)
    - Copier-coller contenu data.sql
    - Execute
    - [ ] Données importées (vérifier dans Tables)

[ ] Vérifier données en PostgreSQL:
    SELECT COUNT(*) FROM users;  (ou autre table)
    [ ] Résultat: ________ lignes

```

✅ **Étape 2 Complète**

---

## 🟡 ÉTAPE 3: Adapter API/config.php

**Durée: 5 minutes**

```
[ ] Ouvrir fichier: API/config.php

[ ] Trouver section "Database connection" (ligne ~60)

[ ] Remplacer la section database par:

```php
<?php
$db_driver = getenv('DB_DRIVER') ?: 'pgsql';

if ($db_driver === 'pgsql') {
    $db_host = getenv('DB_HOST');
    $db_port = getenv('DB_PORT') ?: '5432';
    $db_name = getenv('DB_NAME');
    $db_user = getenv('DB_USER');
    $db_pass = getenv('DB_PASSWORD');
    $dsn = "pgsql:host=$db_host;port=$db_port;dbname=$db_name";
} else {
    $db_host = getenv('DB_HOST') ?: 'localhost';
    $db_port = getenv('DB_PORT') ?: '3306';
    $db_name = getenv('DB_NAME') ?: 'suivi_depenses';
    $db_user = getenv('DB_USER') ?: 'root';
    $db_pass = getenv('DB_PASS') ?: '';
    $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_name;charset=utf8mb4";
}

if (empty($db_host) || empty($db_user) || empty($db_name)) {
    die(json_encode(['error' => 'Database config missing']));
}

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $db_user, $db_pass, $options);
} catch (PDOException $e) {
    error_log('DB Error: ' . $e->getMessage());
    die(json_encode(['error' => 'Database connection failed']));
}

session_start();
?>
```

[ ] Fichier sauvegardé

[ ] Commit et push:
    POWERSHELL:
    git add API/config.php
    git commit -m "Update DB config for PostgreSQL"
    git push

```

✅ **Étape 3 Complète**

---

## 🔴 ÉTAPE 4: Créer Web Service Render

**Durée: 5 minutes**

```
[ ] Aller à: https://dashboard.render.com

[ ] Click "+ New" → "Web Service"

[ ] Connecter votre GitHub repo "saxalis"
    (Clic "Connect account" si première fois)

[ ] Remplir formulaire:
    - Name: saxalis
    - Branch: main
    - Runtime: Docker
    - Build Command: (laisser VIDE)
    - Start Command: (laisser VIDE)
    - Plan: Starter
    - Region: frankfurt (ou votre région)

[ ] Click "Create Web Service"

[ ] Attendre que le service soit créé (30-60s)

[ ] Vous devriez voir l'URL: https://saxalis.render.com

[ ] Copier l'URL: ____________________________

```

✅ **Étape 4 Complète**

---

## 🟣 ÉTAPE 5: Ajouter Variables d'Environnement

**Durée: 5 minutes**

```
[ ] Sur le Web Service Render

[ ] Tab "Environment"

[ ] Click "+ Add Environment Variable" (ou similar)

[ ] Ajouter chaque variable (clic "+ Add" pour chaque):

    1. [ ] Key: DB_DRIVER              Value: pgsql
    2. [ ] Key: DB_HOST                Value: [Votre Host Render]
    3. [ ] Key: DB_PORT                Value: 5432
    4. [ ] Key: DB_NAME                Value: saxalis
    5. [ ] Key: DB_USER                Value: [Votre User Render]
    6. [ ] Key: DB_PASSWORD            Value: [Votre Password Render]
    7. [ ] Key: ENVIRONMENT            Value: production
    8. [ ] Key: FRONTEND_URL           Value: https://saxalis.render.com
    9. [ ] Key: SESSION_SECRET         Value: [random 64 chars]

[ ] Générer SESSION_SECRET (PowerShell):
    [Convert]::ToBase64String([System.Random]::new().GetBytes(48))
    Résultat: ____________________________

[ ] Click "Save" (ou similar button)

[ ] Attendre que les variables soient appliquées (10-30s)

```

✅ **Étape 5 Complète**

---

## 🟠 ÉTAPE 6: Attacher Base de Données

**Durée: 2 minutes**

```
[ ] Sur le Web Service Render

[ ] Toujours tab "Environment"

[ ] Click "+ Add Database"

[ ] Sélectionner: saxalis-db (votre database PostgreSQL)

[ ] Click "Add"

[ ] Render devrait ajouter "RENDER_DATABASE_URL" auto

[ ] Attendre que ça soit appliqué

```

✅ **Étape 6 Complète**

---

## 🔵 ÉTAPE 7: Redéployer

**Durée: 3-5 minutes (en attente)**

```
[ ] Option A: Via Dashboard
    - Tab "Deploys"
    - Click "Manual Deploy"

[ ] Option B: Via Terminal
    POWERSHELL in C:\MAMP\htdocs\SaXalis:
    git add .
    git commit -m "Ready for final deployment"
    git push

[ ] Aller à Tab "Events" ou "Logs"

[ ] Chercher ces messages:
    ✓ "Building image..."
    ✓ "Pushing image..."
    ✓ "Starting service..."
    ✓ "✅ Service live on https://saxalis.render.com"

[ ] Si erreurs visibles, noter:
    Erreur type: ____________________________

[ ] Attendre jusqu'à "Service live"

```

✅ **Étape 7 Complète**

---

## 🟢 ÉTAPE 8: Tester

**Durée: 2-3 minutes**

```
[ ] Ouvrir navigateur: https://saxalis.render.com

[ ] Vérifier:
    - [ ] Page charge (voir interface)
    - [ ] Pas de "Cannot GET /"
    - [ ] Frontend visible

[ ] Tester API (ouvrir dans navigateur):
    https://saxalis.render.com/API/get_transactions.php

[ ] Vérifier response:
    - [ ] JSON response (ou similaire)
    - [ ] Pas "502 Bad Gateway"
    - [ ] Pas "Connection refused"

[ ] Si erreur, vérifier logs Render:
    - Tab "Logs"
    - Chercher ligne rouge = error
    - Note: ____________________________

[ ] PowerShell test (optionnel):
    $r = Invoke-WebRequest https://saxalis.render.com -ErrorAction SilentlyContinue
    $r.StatusCode   # Doit être 200
    $r.Content.Length  # Doit être > 100

```

✅ **Étape 8 Complète**

---

## 🟡 ÉTAPE 9: Config Frontend Finale

**Durée: 2 minutes**

```
[ ] À la racine du projet, créer .env.production:

VITE_API_BASE_URL=https://saxalis.render.com/API
VITE_ENVIRONMENT=production

Ou éditer s'il existe

[ ] Sauvegarder

[ ] Push:
    POWERSHELL:
    git add .env.production
    git commit -m "Update frontend config for Render"
    git push

[ ] Attendre redéploiement (2-3 min)

```

✅ **Étape 9 Complète**

---

## 🎉 FINAL VERIFICATION

```
[ ] Frontend charge: https://saxalis.render.com
[ ] API répond: https://saxalis.render.com/API/get_transactions.php
[ ] Logs sans erreurs (Render Dashboard)
[ ] Base de données connectée (peut vérifier via pgAdmin)
[ ] Variables d'environnement visibles (Render → Environment tab)

[ ] Tester une action utilisateur:
    - Login si applicable
    - Create un enregistrement
    - Vérifier ça se sauvegarde

```

✅ **ALL COMPLETE! 🚀**

---

## 📞 TROUBLESHOOTING RAPIDE

**Si frontend charge pas:**
```
[ ] Vérifier logs Render (Tab "Logs")
[ ] Chercher "ERROR" ou ligne rouge
[ ] Vérifier Dockerfile existe
[ ] Vérifier nginx.conf existe
[ ] Si config.php erreur: vérifier env vars sont corrects
```

**Si API 502:**
```
[ ] PHP-FPM down
[ ] Vérifier DB connexion env vars
[ ] Vérifier API/config.php syntaxe
[ ] Regarder Render logs détaillés
```

**Si CORS error:**
```
[ ] Éditer API/config.php
[ ] Ajouter https://saxalis.render.com à allowed_origins
[ ] Push et redéployer
```

**Si BDD connection error:**
```
[ ] Copier EXACTEMENT les valeurs depuis Render Dashboard
[ ] Pas d'extra espaces!
[ ] Vérifier char spéciaux dans password
[ ] Test local si possible
```

---

## 🎯 Prochaines Étapes (Après Migration)

```
[ ] Créer backup database (Render Dashboard)
[ ] Setup monitoring (email alerts)
[ ] Custom domain (optional)
[ ] Documenter process pour team
[ ] Delete dev/test data si applicable
```

---

**Status Migration: __________________**

Date début: _______________
Date fin: _______________
Problèmes rencontrés: _________________________________________
Temps total: _______________________
Notes: _____________________________________________________________

---

Bon succès! 🚀 Vous pouvez compléter cette checklist au fur et à mesure.
