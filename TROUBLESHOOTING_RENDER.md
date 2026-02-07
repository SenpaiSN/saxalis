# 🔧 GUIDE DÉPANNAGE - Migration Render

Utilisez ce guide si rencontrez des erreurs.

---

## 🚨 ERREUR 1: "502 Bad Gateway"

### Cause Probable
- PHP-FPM ne répond pas
- API crash au démarrage
- Dockerfile erreur

### Solution

**Étape 1: Vérifier les logs**
1. Render Dashboard → Web Service "saxalis"
2. Tab "Logs" (ou "Events")
3. Chercher lignes rouges ou "ERROR"

**Étape 2: Chercher messages spécifiques**

Si vous voyez:
```
PHP Fatal error: ...
```
→ PHP a une erreur. Chercher le message exact

```
Connection refused to database
```
→ Sauter à ERREUR 3

```
Cannot execute entrypoint.sh
```
→ Vérifier fichier entrypoint.sh existe et est exécutable
```powershell
# Local:
ls -la entrypoint.sh  # ou dir entrypoint.sh
```

**Étape 3: Test local Docker (optionnel)**

Si suite vous avez Docker installé:
```powershell
cd C:\MAMP\htdocs\SaXalis

# Build
docker build -t saxalis-test:latest .

# Lancer localement
docker run -it -p 8080:8080 `
  -e DB_DRIVER=mysql `
  -e DB_HOST=host.docker.internal `
  -e DB_USER=root `
  -e DB_PASSWORD="" `
  -e DB_NAME=suivi_depenses `
  -e ENVIRONMENT=local `
  saxalis-test:latest

# Visiter http://localhost:8080

# Si fonctionne localement, problème = env vars Render
```

**Étape 4: Redeploy après fix**

```powershell
# Après correction:
git add .
git commit -m "Fix: [description du fix]"
git push

# Render redéploiera automatiquement
# Attendre 3-5 min
```

---

## 🚨 ERREUR 2: "Cannot GET /" ou "404 Not Found"

### Cause Probable
- Frontend dist/ pas builté
- nginx.conf routing erreur
- Dockerfile stage frontend échoué

### Solution

**Vérifier Dockerfile:**

Dans Dockerfile, vérifier cette section existe:
```dockerfile
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.ts ... ./
RUN npm run build  # Important!

...

FROM php-base
COPY --from=frontend-builder /app/dist ./public/dist
```

**Vérifier logs build:**

Render Dashboard → Logs tab → Chercher:
```
npm run build
```

Si erreur dans logs, ex: "Module not found", alors:
```powershell
# Local fix:
npm ci
npm run build

# Vérifier dist/ existe
dir dist

# Push fix
git add .
git commit -m "Fix frontend build"
git push
```

---

## 🚨 ERREUR 3: "Connection refused - Database"

### Cause Probable
- Env vars DB_HOST, DB_USER, DB_PASSWORD incorrects/manquants
- Typo dans les valeurs
- Database n'existe pas
- PostgreSQL port wrong

### Solution - VÉRIFICATION STRICTE

**Étape 1: Récupérer les valeurs EXACTES**

Render Dashboard → Databases → saxalis-db

Copier EXACTEMENT:
- Host: `____________________________`
- Port: `____________________________`
- User: `____________________________`
- Password: `____________________________` (attention aux caractères spéciaux!)
- Database: `____________________________`

**Étape 2: Les coller dans Render**

Web Service "saxalis" → Environment tab

**VÉRIFIER:**
- [ ] DB_HOST copiée exactement (pas d'extra espaces)
- [ ] DB_USER copiée exactement
- [ ] DB_PASSWORD copiée exactement
- [ ] DB_PORT = 5432
- [ ] DB_DRIVER = pgsql
- [ ] DB_NAME = saxalis

**Important:** Si password contient `@`, `#`, `$`, `:`, etc., peut causer problème. Vérifier.

**Étape 3: Test connexion locale**

Si vous avez pgAdmin:
1. Servers → "Render" (ou créer new)
2. Remplir avec les mêmes valeurs
3. Si connexion OK → problème = app config
4. Si connexion échoue → problème = DB credentials

**Étape 4: Redeploy**

```powershell
git add .
git commit -m "Fix database connection"
git push
```

---

## 🚨 ERREUR 4: "CORS error" (Frontend → API)

### Symptôme
- Frontend charge
- Browser DevTools → Network tab → API request en rouge
- Error: "Access-Control-Allow-Origin missing"

### Cause Probable
- API/config.php allowed_origins ne contient pas https://saxalis.render.com
- Session cookies pas sécurisés

### Solution

**Étape 1: Éditer API/config.php**

Trouver:
```php
$allowed_origins = [
    'https://saxalis.free.nf',
    ...
];
```

Ajouter APRÈS la première ligne:
```php
$allowed_origins = [
    'https://saxalis.render.com',      // ← AJOUTER CETTE LIGNE
    'https://www.saxalis.render.com',  // ← ET CELLE-CI
    'https://saxalis.free.nf',
    ...
];
```

**Étape 2: Vérifier headers CORS**

```php
// Assurez-vous que ces lignes existent au début du fichier:

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");

// Et vérifier que l'en-tête Origin est envoyée:
if (isset($_SERVER['HTTP_ORIGIN'])) {
    if (in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
        header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
    }
}
```

**Étape 3: Test CORS preflight**

```powershell
# PowerShell - Tester requête preflight (OPTIONS)
$response = Invoke-WebRequest `
  -Uri "https://saxalis.render.com/API/get_transactions.php" `
  -Method OPTIONS `
  -Headers @{'Origin' = 'https://saxalis.render.com'} `
  -ErrorAction SilentlyContinue

$response.Headers.'Access-Control-Allow-Origin'
# Doit afficher: https://saxalis.render.com
```

**Étape 4: Push**

```powershell
git add API/config.php
git commit -m "Fix CORS for Render domain"
git push
```

---

## 🚨 ERREUR 5: "API returns 401 or 403 Unauthorized"

### Cause Probable
- Session pas maintenue
- Authentication token manquant
- Cookie pas transmise

### Solution

**Vérifier credentials dans Render:**

API/config.php:
```php
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);  // Important pour HTTPS!
ini_set('session.cookie_samesite', 'Strict');
```

**Frontend doit envoyer cookies:**

```javascript
// En JavaScript (fetch):
const response = await fetch('/API/get_transactions.php', {
    credentials: 'include',  // ← IMPORTANT! Envoyer les cookies
    headers: {
        'Content-Type': 'application/json'
    }
});
```

Ou avec Axios:
```javascript
const instance = axios.create({
    withCredentials: true  // ← IMPORTANT!
});
```

---

## 🚨 ERREUR 6: "Database table doesn't exist"

### Cause Probable
- Migration données s'est pas faite
- Schema PostgreSQL pas importé

### Solution

**Vérifier via PgAdmin:**

1. PgAdmin → Render → saxalis database
2. Expand "Tables"
3. Chercher vos tables (users, transactions, etc.)

**Si tables vides:**

1. Refaire import schema (ÉTAPE 2 du guide principal)
2. Ou:
```powershell
# Via pgAdmin Query Tool:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

# Afficher les résultats
```

**Si résultat vide:**

→ Refaire l'import complètement:
```powershell
# Export MySQL
mysqldump -u root suivi_depenses > C:\temp\full_dump.sql

# Via pgAdmin Query Tool, importer le fichier
```

---

## 🚨 ERREUR 7: "Build failed" ou "Docker build error"

### Cause Probable
- Dockerfile syntaxe erreur
- npm install échoue (dependances manquantes)
- PHP image pull error

### Solution

**Étape 1: Tester local**

```powershell
cd C:\MAMP\htdocs\SaXalis

# Essayer build
docker build -t test:latest .

# Si erreur, lire message:
# → Fix le problème
# → Retry build
```

**Étape 2: Chercher ligne problématique**

Si "npm ERR!":
```
# Dans Dockerfile, ligne problématique = build stage frontend
# Vérifier:
# - package.json existe
# - Les deps dans package.json installables
```

```powershell
# Tester local:
npm ci
npm run build
```

**Étape 3: Push fix**

```powershell
git add .
git commit -m "Fix Docker build"
git push
```

---

## 🚨 ERREUR 8: "Service keeps restarting" ou "Crash loop"

### Symptôme
- Render logs montrent le service qui redémarre toutes les 10s
- "Health check failed"

### Cause Probable
- entrypoint.sh erreur
- PHP-FPM crash
- Nginx erreur

### Solution

**Étape 1: SSH dans Render (si plan payant)**

1. Web Service → Logs
2. Clic "SSH" button (si disponible)
3. Essayer commandes:
```bash
php-fpm -v  # Vérifier PHP fonctionne
nginx -t    # Test config nginx
ps aux      # Lister processes
```

**Étape 2: Simplifier entrypoint.sh**

Si problème, tester version minimum:
```sh
#!/bin/sh
php-fpm -D
nginx
```

**Étape 3: Debug localement**

```powershell
docker run -it saxalis:test /bin/sh

# Dedans:
php-fpm -v
nginx -t
ls /app/
```

---

## 🚨 ERREUR 9: "Stuck on Deploying" ou très lent

### Cause Probable
- Build prend longtemps (normal 1-3min)
- Render saturation
- npm install super lent

### Solution

**Attendre 3-5 minutes minimum**

Render build peut être lent sur plan gratuit.

**Optimiser npm:**

```dockerfile
# Dans Dockerfile, ajouter optiona npm:
RUN npm ci --prefer-offline --no-audit --no-fund

# Plus rapide!
```

---

## 🚨 ERREUR 10: "White screen" ou page blanche

### Cause Probable
- React app erreur
- JavaScript error
- Frontend CSS pas chargé

### Solution

**Vérifier console navigateur:**

1. Ouvrir https://saxalis.render.com
2. F12 (DevTools)
3. Tab "Console"
4. Chercher messages rouges
5. Chercher "Failed to fetch" = API connection

**Si "Failed to fetch /API/...":**

→ Voir ERREUR 4 (CORS) ou ERREUR 3 (DB Connection)

---

## ℹ️ COMMENT LIRE LES LOGS RENDER

Render Dashboard → Web Service → Tab "Logs"

**Chercher ces patterns:**

```
✅ "Successfully"     = Bon
✅ "Started"          = Bon
✅ "Service live"     = Bon

🔴 "ERROR" = Problème!
🔴 "FATAL" = Problème critique!
🔴 "Connection refused" = DB pas accessible
🔴 "Cannot find file" = Fichier manquant

```

**Copier la ligne complète d'erreur et Google-la!**

---

## 🆘 LAST RESORT: Reset complet

Si rien ne marche et tout est cassé:

**Étape 1: Backup data**

```powershell
# Exporter data depuis PostgreSQL
mkdir C:\backups
# Utiliser pgAdmin → Export

# Exporter data depuis MySQL (fallback)
mysqldump -u root suivi_depenses > C:\backups\backup.sql
```

**Étape 2: Reset Render**

1. Render Dashboard
2. Web Service → Settings
3. "Delete Service"
4. Recréer un nouveau (recommencer depuis ÉTAPE 4)

**Étape 3: Re-import data**

```powershell
# Via pgAdmin:
# Create fresh database
# Import backup.sql
```

---

## 📞 RESSOURCES EXTERNES

**Si encore bloqué:**

1. **Render Support:** https://render.com/help
2. **Laravel Forge/Envoyer** (blog posts): déploiement serveur
3. **Stack Overflow:** Tag [render], [postgresql], [php-fpm]
4. **GitHub Issues:** PHP Docker images

---

**💡 Conseil:** 
- Garder un terminal Render logs OUVERT pendant troubleshooting
- Lire logs avant de changer quoi que ce soit
- Ne pas paniquer, la plupart des erreurs Docker sont faciles à fix

Bon courage! 🚀
