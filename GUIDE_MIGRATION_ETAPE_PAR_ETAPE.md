# 🚀 GUIDE DE MIGRATION PAS À PAS - Render Deployment

## 💡 AVANT DE COMMENCER

**Collectez ces infos de Render Dashboard:**

1. **PostgreSQL Connection String:**
   - Aller à: https://dashboard.render.com → Databases
   - Cliquer sur votre database "saxalis-db"
   - Copier: **External Database URL** (ressemble à `postgresql://...`)
   - Garder aussi: **Host**, **Port**, **User**, **Password**, **Database**

2. **Préparer GitHub:**
   - Créer un compte GitHub (si pas déjà)
   - Créer repo **PUBLIC** nommé "saxalis"
   - **IMPORTANT:** Render nécessite repo PUBLIC pour le plan gratuit

---

# ÉTAPE 1: Préparer GitHub & Pusher le Code

## Étape 1a: Initialiser le repo GitHub

```powershell
# Sur votre machine (Windows PowerShell)

# 1. Allez dans le dossier du projet
cd C:\MAMP\htdocs\SaXalis

# 2. Vérifier que git est déjà initialisé
git status

# Si erreur "fatal: not a git repository", faire:
git init

# 3. Ajouter all files (sauf .gitignore)
git add .

# 4. Vérifier ce qui sera committé
git status
```

## Étape 1b: Create GitHub repo & Configure Remote

```powershell
# Aller sur GitHub.com → Create New Repository

# Informations:
# - Repository name: saxalis
# - Description: SaXalis - Budget Tracker
# - Visibility: PUBLIC (important!)
# - Initialize: No (vous avez déjà du code)

# Après création, vous verrez comandos pour pusher...
# Exécuter dans PowerShell:

git remote add origin https://github.com/YOUR_USERNAME/saxalis.git
git branch -M main
git commit -m "Initial commit - SaXalis project for Render migration"
git push -u origin main

# Cela peut prendre 1-2 minutes...
# Une fois fait, aller vérifier sur GitHub.com que le code est là
```

## Étape 1c: Créer `.gitignore` si nécessaire

Ajouter à la racine du projet (s'il existe déjà, vérifier qu'il contient):

```gitignore
# Dependencies
node_modules/
vendor/

# Environment
.env
.env.local
config.local.php
API/config.local.php

# Logs
logs/
*.log

# Build & Temp
dist/
build/
tmpclaude*

# OS
.DS_Store
desktop.ini
Thumbs.db

# IDE
.vscode/
.idea/
*.swp

# Git
.git

# Docker (local)
.docker/

# Rubbish/temp
Rubbish/
```

Puis:
```powershell
git add .gitignore
git commit -m "Add gitignore"
git push
```

✅ **Étape 1 Complète:** Votre code est maintenant sur GitHub PUBLIC.

---

# ÉTAPE 2: Importer Base de Données MySQL → PostgreSQL

**C'est l'étape la plus critique.** Vous avez deux approches:

## Approche A: Utiliser pgAdmin (Recommandée - Interface Graphique)

### Étape 2a: Télécharger pgAdmin

1. Aller sur: https://www.pgadmin.org/download/
2. Télécharger pour Windows
3. Installer (garder tous les defaults)

### Étape 2b: Créer connexion vers DB PostgreSQL Render

1. Ouvrir pgAdmin
2. Créer Master Key (password = random, noter-le)
3. Sur la gauche: "Servers" → clic droit → Register → Server
4. Remplir:
   - **Name:** "Render Saxon"
   - **Tab Connection:**
     - **Hostname:** `votre_host_de_DB` (copié de Render Dashboard)
     - **Port:** `5432` (ou celui de Render)
     - **Username:** `saxalis_user` (ou celui de Render)
     - **Password:** `votre_password` (de Render)
     - **Database:** `saxalis` (de Render)
   - Cliquer "Save"

5. Si "Render Saxon" apparaît, ✅ Connexion OK!

### Étape 2c: Exporter Schema MySQL (Structure)

```powershell
# Sur votre machine Windows (ou autre terminal)

# Exporter structure (pas les données encore)
mysqldump -u root -p suivi_depenses --no-data > C:\temp\schema.sql

# Vous allez être demandé de taper le password MySQL (si vous en avez un)
# Si pas de password, juste appuyer Entrée
```

### Étape 2d: Convertir Schema MySQL → PostgreSQL

⚠️ MySQL et PostgreSQL ont des syntaxes différentes. Il faut adapter:

```powershell
# Option 1: Utiliser MySQL2PostgreSQL online tool
# Aller sur: https://www.pgloader.io/
# Ou: https://www.beerus.dev/mysql2pgsql/
# Copier-coller contenu C:\temp\schema.sql
# Copier output dans fichier schema_pgsql.sql

# Option 2: Adaptations manuelles (si schema.sql petit)
```

### Étape 2e: Importer le Schema dans PostgreSQL Render

```powershell
# Dans pgAdmin:
# 1. Clic droit sur database "saxalis"
# 2. Query Tool
# 3. Copier-coller contenu du schema_pgsql.sql adapté
# 4. Execute (F5 ou click button)

# Si aucune erreur, ✅ Structure importée!
```

### Étape 2f: Exporter Données MySQL

```powershell
# À partir de vos données MySQL:
mysqldump -u root -p suivi_depenses --no-create-info > C:\temp\data.sql

# Cela exporte INSERT statements (compatible PostgreSQL généralement)
```

### Étape 2g: Importer Données dans PostgreSQL Render

```powershell
# Via pgAdmin:
# 1. Query Tool (sur database saxalis)
# 2. Copier-coller contenu data.sql
# 3. Execute

# OU via terminal:
# psql -U saxalis_user -h votre_host -d saxalis < C:\temp\data.sql
```

---

## Approche B: Utiliser MySQL2PostgreSQL Tool (Automatisée)

```powershell
# Option plus agressif: installer pgloader
# https://www.pgloader.io/

# Ou utiliser DBeaver (gratuit, interface graphique) pour Migration Wizard
```

✅ **Étape 2 Complète:** Vos données sont sur PostgreSQL Render.

---

# ÉTAPE 3: Adapter config.php pour PostgreSQL

Vous avez une config MySQL actuellement. Faut adapter pour PostgreSQL.

Modifier [API/config.php](../API/config.php):

```php
// Remplacer la section Database connection par:

<?php
// ... (garder le CORS/headers code pareil)

// Database configuration pour PostgreSQL
$db_driver = getenv('DB_DRIVER') ?: 'pgsql';

if ($db_driver === 'pgsql') {
    // PostgreSQL (Render)
    $db_host = getenv('DB_HOST') ?: '';
    $db_port = getenv('DB_PORT') ?: '5432';
    $db_name = getenv('DB_NAME') ?: '';
    $db_user = getenv('DB_USER') ?: '';
    $db_pass = getenv('DB_PASSWORD') ?: '';
    $charset = 'UTF8';
    $dsn = "pgsql:host=$db_host;port=$db_port;dbname=$db_name";
} else {
    // MySQL (fallback local dev)
    $db_host = getenv('DB_HOST') ?: 'localhost';
    $db_port = getenv('DB_PORT') ?: '3306';
    $db_name = getenv('DB_NAME') ?: 'suivi_depenses';
    $db_user = getenv('DB_USER') ?: 'root';
    $db_pass = getenv('DB_PASS') ?: '';
    $charset = 'utf8mb4';
    $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_name;charset=$charset";
}

// Vérifier credentials
if (empty($db_name) || empty($db_user)) {
    error_log('Database credentials not configured.');
    die(json_encode(['success' => false, 'message' => 'DB Configuration error']));
}

// Connexion PDO
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
    PDO::ATTR_STRINGIFY_FETCHES => false,
];

// Ajouter MySQL-specific options
if ($db_driver !== 'pgsql') {
    $options[PDO::MYSQL_ATTR_INIT_COMMAND] = "SET NAMES 'utf8mb4', time_zone = '+00:00'";
}

try {
    $pdo = new PDO($dsn, $db_user, $db_pass, $options);
} catch (PDOException $e) {
    error_log('Database connection error: ' . $e->getMessage());
    die(json_encode(['success' => false, 'message' => 'Database error']));
}

// Timezone
ini_set('date.timezone', 'UTC');

// Session security
if (getenv('ENVIRONMENT') === 'production') {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', 1);
    ini_set('session.cookie_samesite', 'Strict');
}

session_start();

?>
```

Puis, committer:
```powershell
git add API/config.php
git commit -m "Update config for PostgreSQL support (Render compatible)"
git push
```

✅ **Étape 3 Complète:** API est prête pour PostgreSQL.

---

# ÉTAPE 4: Configurer Variables d'Environnement Render

## Étape 4a: Créer `.env.production` (frontend)

À la racine:

```env
VITE_API_BASE_URL=https://saxalis.render.com
VITE_ENVIRONMENT=production
```

Puis:
```powershell
git add .env.production
git commit -m "Add production environment config"
git push
```

## Étape 4b: Configurer Env Vars dans Render Dashboard

1. Aller à https://dashboard.render.com
2. Créer Web Service (si pas encore fait):
   - "New +"
   - "Web Service"
   - Connecter repo GitHub "saxalis"
   - Remplir:
     - **Name:** saxalis
     - **Branch:** main
     - **Runtime:** Docker
     - **Region:** Frankfurt (ou votre région)
     - **Plan:** Starter (7€/mois)
     - **Auto-deploy:** Yes

3. Cliquer "Create Web Service"

4. Une fois créé, aller à "Environment" (tab)

5. Ajouter ces variables:

```
DB_DRIVER = pgsql
DB_HOST = votre_host_postgresql (de votre DB Render, sans https://)
DB_PORT = 5432
DB_NAME = saxalis
DB_USER = saxalis_user
DB_PASSWORD = votre_password_postgresql
ENVIRONMENT = production
FRONTEND_URL = https://saxalis.render.com
SESSION_SECRET = un_string_aleatoire_de_64_chars
```

Pour générer SESSION_SECRET:
```powershell
# Dans PowerShell:
[Convert]::ToBase64String([System.Random]::new().GetBytes(48))
```

✅ **Étape 4 Complète:** Variables configurées dans Render.

---

# ÉTAPE 5: Connecter Github & Database Render

## Étape 5a: Lier la Database

1. Render Dashboard → Web Service "saxalis"
2. Tab "Environment"
3. Cliquer "+ Add Database"
4. Sélectionner database "saxalis-db" que vous avez créé
5. Render va automatiquement ajouter RENDER_DATABASE_URL

## Étape 5b: Vérifier Build Settings

1. Tab "Settings" du Web Service
2. Vérifier:
   - **Build Command:** Laisser vide (utilise Dockerfile)
   - **Start Command:** Laisser vide (utilise Dockerfile)
   - **Dockerfile Path:** ./Dockerfile

## Étape 5c: Test Local Build (Optionnel)

Avant de déployer, vous pouvez tester Docker localement:

```powershell
# Allez dans le dossier du projet
cd C:\MAMP\htdocs\SaXalis

# Build image
docker build -t saxalis:test .

# Lancer container
docker run -it -p 8080:8080 `
  -e ENVIRONMENT=local `
  -e DB_DRIVER=mysql `
  -e DB_HOST=host.docker.internal `
  -e DB_USER=root `
  -e DB_PASSWORD="" `
  -e DB_NAME=suivi_depenses `
  saxalis:test

# Visiter: http://localhost:8080
# Si ça fonctionne en local, ça va marcher sur Render
```

✅ **Étape 5 Complète:** GitHub + Database liées à Render.

---

# ÉTAPE 6: Déclencher Déploiement

## Étape 6a: Forcer Redeploy

1. Render Dashboard → Web Service "saxalis"
2. Tab "Deploys"
3. Cliquer "Manual Deploy"

Ou simplement pusher un commit:
```powershell
git add .
git commit -m "Ready for Render deployment"
git push origin main

# Render détectera le push et redéploiera automatiquement
```

## Étape 6b: Suivre le Déploiement

1. Render Dashboard → Web Service "saxalis"
2. Tab "Events" ou "Logs"
3. Regarder les logs:
   - "Building image..." (30-60s)
   - "Pushing image..." (30-60s)
   - "Starting service..." 
   - "✅ Service live" = succès

**Attention:** Le premier déploiement peut prendre 2-5 minutes.

Si vous voyez des erreurs:
- Vérifier logs détaillés
- Vérifier env vars
- Vérifier Dockerfile

---

# ÉTAPE 7: Tester les Endpoints

Une fois déployé, Render vous donne une URL comme: `https://saxalis.render.com`

## Étape 7a: Tester Frontend

```
https://saxalis.render.com
```

Vous devriez voir votre app React.

## Étape 7b: Tester API

```powershell
# Via PowerShell:
$api_url = "https://saxalis.render.com/API/get_transactions.php"

$response = Invoke-WebRequest -Uri $api_url `
  -Method GET `
  -Headers @{'Origin' = 'https://saxalis.render.com'} `
  -ErrorAction Stop

$response.StatusCode
$response.Content | ConvertFrom-Json
```

Ou via browser:
```
https://saxalis.render.com/API/get_transactions.php
```

## Étape 7c: Vérifier CORS

```powershell
# Test CORS headers
$headers = Invoke-WebRequest -Uri "https://saxalis.render.com/API/" -Method OPTIONS

$headers.Headers['Access-Control-Allow-Origin']
# Doit montrer: https://saxalis.render.com
```

✅ **Étape 7 Complète:** API fonctionne sur Render!

---

# ÉTAPE 8: Configurer Domaine (Optionnel)

Si vous voulez pointer `saxalis.free.nf` vers Render:

## Option A: Garder Render Temporary Domain

Render vous donne: `https://saxalis.render.com`
- Plus facile
- Gratuit
- Pas besoin changer domaine

## Option B: Custom Domain

1. Aller à Settings du Web Service
2. "Custom Domains"
3. Ajouter: saxalis.free.nf
4. Render vous donne DNS records
5. Pointer votre registrar (si applicable)
6. Attendre DNS propagation (~1h)

---

# ÉTAPE 9: Mise à Jour des URLs

Mise à jour:

**Frontend env vars:**
```env
VITE_API_BASE_URL=https://saxalis.render.com/API
```

**API config.php CORS:**
```php
$allowed_origins = [
    'https://saxalis.render.com',
    'https://www.saxalis.render.com',
    'https://saxalis.free.nf',  // ancien domaine
];
```

Push:
```powershell
git add .
git commit -m "Update URLs for Render deployment"
git push
```

Render redéploiera automatiquement.

---

# ✅ CHECKLIST COMPLÈTE

- [ ] Code poussé sur GitHub PUBLIC
- [ ] Base PostgreSQL créée sur Render
- [ ] Données migrées MySQL → PostgreSQL
- [ ] API/config.php adapté pour PostgreSQL
- [ ] .env.production créé
- [ ] Web Service créé sur Render
- [ ] Env vars configurées (DB_HOST, DB_USER, DB_PASSWORD, etc.)
- [ ] Database liée dans Render
- [ ] Déploiement lancé (logs vérifiés)
- [ ] Frontend charge correctement
- [ ] API endpoints répondent
- [ ] CORS fonctionne
- [ ] Domaine configuré (facultatif)

---

# 🐛 TROUBLESHOOTING

## Erreur: "502 Bad Gateway"
→ PHP-FPM ne répond pas
→ Vérifier logs Render (Tab "Logs")
→ Voir erreurs PHP/app

## Erreur: "Connection refused - Database"
→ Env vars DB manquantes/incorrectes
→ Vérifier DATABASE_URL dans Render Dashboard
→ Test connexion en SSH dans Render

## Erreur: "CORS error"
→ Vérifier FRONTEND_URL env var
→ Vérifier allowed_origins dans config.php
→ Tester depuis browser en dev tools (Network)

## Frontend charge, API 404
→ Vérifier API path dans VITE_API_BASE_URL
→ Vérifier nginx.conf routing
→ Vérifier PHP endpoints existent

## Build échoue (Docker error)
→ Vérifier Dockerfile syntaxe
→ Tester build local: `docker build .`
→ Vérifier node/npm versions dans Dockerfile

## Lent/Cold Starts Élevés
→ Normal pour plan Starter Render
→ Upgrade vers Standard si nécessaire
→ Ou garder InfinityFree temporairement

---

# 📞 RESSOURCES

**Render Docs:** https://render.com/docs
**PostgreSQL Connect:** https://www.postgresql.org/docs/
**FAQ Render:** https://render.com/help

**Questions?**
1. Vérifier logs (Render Dashboard → Logs tab)
2. Chercher l'erreur spécifique
3. Retry l'étape
4. SSH dans container si nécessaire

Bon courage! 🚀
