# ⚡ MIGRATION RENDER - VERSION RAPIDE (Copier-Coller)

## AVANT: Récupérer les Infos Render

**Sur https://dashboard.render.com → Databases → saxalis-db**

Copier:
```
External Database URL: postgresql://...
Host: 
Port: 5432
User: 
Password: 
Database Name: saxalis
```

**Garder ces infos visibles pendant la migration.**

---

# ÉTAPE 1: Pousser le Code sur GitHub

```powershell
# Terminal PowerShell - Dans le dossier du projet

cd C:\MAMP\htdocs\SaXalis

# Vérifier status git
git status

# Ajouter tout
git add .

# Premier commit
git commit -m "SaXalis - Ready for Render"

# Changer branche à main
git branch -M main

# Ajouter remote (remplacer YOUR_USERNAME et YOUR_REPO)
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Pousser
git push -u origin main
```

⏱️ **5 minutes**
✅ Votre code est maintenant sur GitHub public.

---

# ÉTAPE 2: Importer Base de Données

## Option A: Via PgAdmin (Facile)

**Télécharger pgAdmin4:**
https://www.pgadmin.org/download/

**Après installation:**

1. Ouvrir pgAdmin4
2. Servers → New → Server
   - Name: `Render`
   - Tab Connection:
     - Host: `[Votre Host Render]`
     - Port: `5432`
     - Username: `[Votre User Render]`
     - Password: `[Votre Password Render]`
     - Database: `saxalis`
3. Save

**Pour importer vos données:**

```powershell
# Exporter structure MySQL
mysqldump -u root suivi_depenses --no-data > C:\Users\YourUser\schema.sql

# Exporter données MySQL
mysqldump -u root suivi_depenses --no-create-info > C:\Users\YourUser\data.sql
```

Dans pgAdmin:
1. Database `saxalis` → Query Tool
2. Copier-coller contenu de `schema.sql`
3. Exécuter (F5)
4. Copier-coller contenu de `data.sql`
5. Exécuter (F5)

⏱️ **15 minutes**

---

# ÉTAPE 3: Mettre à Jour API Config

**Éditer: [API/config.php](../API/config.php)**

Remplacer la section database connection (autour de line 60):

```php
<?php
// Remplacer SEULEMENT cette partie:

// Database configuration
$db_driver = getenv('DB_DRIVER') ?: 'pgsql';

if ($db_driver === 'pgsql') {
    // PostgreSQL (Render)
    $db_host = getenv('DB_HOST');
    $db_port = getenv('DB_PORT') ?: '5432';
    $db_name = getenv('DB_NAME');
    $db_user = getenv('DB_USER');
    $db_pass = getenv('DB_PASSWORD');
    $dsn = "pgsql:host=$db_host;port=$db_port;dbname=$db_name";
} else {
    // MySQL (local dev fallback)
    $db_host = getenv('DB_HOST') ?: 'localhost';
    $db_port = getenv('DB_PORT') ?: '3306';
    $db_name = getenv('DB_NAME') ?: 'suivi_depenses';
    $db_user = getenv('DB_USER') ?: 'root';
    $db_pass = getenv('DB_PASS') ?: '';
    $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_name;charset=utf8mb4";
}

// Vérifier credentials
if (empty($db_host) || empty($db_name) || empty($db_user)) {
    die(json_encode(['error' => 'Database credentials missing']));
}

$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $db_user, $db_pass, $options);
} catch (PDOException $e) {
    die(json_encode(['error' => $e->getMessage()]));
}

session_start();
?>
```

Puis:
```powershell
git add API/config.php
git commit -m "Update DB config for PostgreSQL"
git push
```

⏱️ **5 minutes**

---

# ÉTAPE 4: Configurer Render Web Service

**Sur https://dashboard.render.com**

1. Click "+ New" → "Web Service"
2. Connecter repo GitHub "YOUR_REPO"
3. Remplir:
   ```
   Name: saxalis
   Branch: main
   Runtime: Docker
   Build Command: (laisser vide)
   Start Command: (laisser vide)
   Plan: Starter ($5 - $7USD/mois)
   Region: Frankfurt (ou Europe)
   ```
4. Click "Create Web Service"

⏱️ **3 minutes**

---

# ÉTAPE 5: Ajouter Variables d'Environnement

**Sur le Web Service Render:**

1. Tab "Environment"
2. Click "+ Add Environment Variable"
3. Ajouter ces variables:

```
DB_DRIVER           → pgsql
DB_HOST             → [Votre Host de Render DB]
DB_PORT             → 5432
DB_NAME             → saxalis
DB_USER             → [Votre User de Render DB]
DB_PASSWORD         → [Votre Password de Render DB]
ENVIRONMENT         → production
FRONTEND_URL        → https://saxalis.render.com
SESSION_SECRET      → (générer une string aléatoire)
```

Pour générer SESSION_SECRET:
```powershell
# PowerShell
[Convert]::ToBase64String([System.Random]::new().GetBytes(48))
```

⏱️ **5 minutes**

---

# ÉTAPE 6: Attacher Base de Données

**Sur le Web Service Render:**

1. Tab "Environment" (encore)
2. Click "+ Add Database"
3. Sélectionner "saxalis-db" (celle que vous avez créé)
4. Save

Render va ajouter `RENDER_DATABASE_URL` automatiquement.

⏱️ **2 minutes**

---

# ÉTAPE 7: Lancer le Déploiement

**Option A: Depuis Render Dashboard**
1. Web Service → Tab "Deploys"
2. Click "Manual Deploy"

**Option B: Depuis Terminal**
```powershell
cd C:\MAMP\htdocs\SaXalis

# Faire petit changement pour trigger deploy
echo "" >> README.md

git add README.md
git commit -m "Trigger Render deploy"
git push
```

Render va builder et déployer (2-5 min).

⏱️ **5 minutes attente**

---

# ÉTAPE 8: Vérifier Déploiement

**Render Dashboard:**

1. Tab "Logs"
2. Chercher:
   - ✅ "Building image..."
   - ✅ "Pushing image..."
   - ✅ "Starting service..."
   - ✅ "✅ Service live" ou "Live on https://saxalis.render.com"

Si erreurs, voir Details et chercher ligne rouge (error).

⏱️ **2 minutes de vérification**

---

# ÉTAPE 9: Tester

```powershell
# Terminal - Tester frontend
Start-Process https://saxalis.render.com

# Tester API (devrait retourner JSON ou 401)
$response = Invoke-WebRequest https://saxalis.render.com/API/get_transactions.php
$response.StatusCode
```

Ou dans le browser:
```
https://saxalis.render.com
https://saxalis.render.com/API/get_transactions.php
```

⏱️ **2 minutes**

---

# ÉTAPE 10: Finaliser .env Frontend

**À la racine du projet, créer `.env.production`:**

```env
VITE_API_BASE_URL=https://saxalis.render.com/API
VITE_ENVIRONMENT=production
```

Puis:
```powershell
git add .env.production
git commit -m "Add production env config"
git push
```

Render redéploiera automatiquement.

⏱️ **3 minutes**

---

# ✅ RÉSUMÉ TEMPS TOTAL

```
Étape 1 (GitHub):          5 min
Étape 2 (DB Import):      15 min
Étape 3 (API Config):      5 min
Étape 4 (Render Setup):    3 min
Étape 5 (Env Vars):        5 min
Étape 6 (Attach DB):       2 min
Étape 7 (Deploy):          5 min (en attente)
Étape 8 (Vérifier):        2 min
Étape 9 (Test):            2 min
Étape 10 (Final):          3 min
───────────────────────────────
TOTAL:                     47 min (avec attente)
```

---

# 🚨 Si Erreurs

```
"502 Bad Gateway"
→ Regarder Render Logs (onglet "Logs")
→ Chercher erreur rouge
→ Vérifier env vars (taper correctement)

"Cannot connect to database"
→ Vérifier DB_HOST, DB_USER, DB_PASSWORD
→ Copier exactement depuis Render Dashboard
→ Pas de typo!

"CORS error in console"
→ Éditer API/config.php
→ Ajouter https://saxalis.render.com à allowed_origins
→ Pousser et redéployer

API returns 404
→ Vérifier fichier existe dans API/
→ Vérifier endpoint path dans requests
→ Check nginx.conf routing
```

---

# 🎯 AFTERMIGRATION

**Bravo! Votre site est maintenant sur Render!**

Pour garder à jour:
- `git push` = redéploy automatique
- Logs accessibles via Dashboard
- Database accessible via pgAdmin (External Database URL)
- Domaine custom configurable (Settings → Custom Domains)

**Prochaines actions (optionnel):**
- [ ] Ajouter monitoring emails
- [ ] Setup backups database
- [ ] Custom domain (saxalis.free.nf)
- [ ] Upgrade vers Standard plan si besoin

Bon succès! 🚀
