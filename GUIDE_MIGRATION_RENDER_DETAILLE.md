# 🔧 Guide Pratique de Migration SaXalis vers Render

## Phase 1: Configuration Locale (Render Docker)

### Étape 1: Créer structure Docker

En supposant votre structure:
```
SaXalis/
├─ API/                    (backend PHP)
├─ src/                    (frontend React)
├─ public/                 (assets statiques)
├─ package.json
├─ vite.config.ts
└─ [NOUVEAU] Dockerfile        ← Créer
```

### Étape 2: Dockerfile (PHP 8.2 + Nginx)

Créer `Dockerfile` à la racine:

```dockerfile
FROM php:8.2-fpm-alpine AS php-base

# Install system dependencies
RUN apk add --no-cache \
    nginx \
    mysql-client \
    postgresql-client \
    composer \
    libpq-dev \
    gd-dev \
    && docker-php-ext-configure gd \
    && docker-php-ext-install -j$(nproc) pdo pdo_mysql pdo_pgsql gd

# Build stage for frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.ts tailwind.config.js postcss.config.mjs ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

# Final stage
FROM php-base

WORKDIR /app

# Copy frontend build
COPY --from=frontend-builder /app/dist ./public/dist

# Copy backend
COPY API/ ./API/
COPY index.html ./public/

# Copy Nginx config
COPY nginx.conf /etc/nginx/nginx.conf
COPY php.ini /usr/local/etc/php/conf.d/custom.ini

# Create required directories
RUN mkdir -p /app/API/logs && \
    chmod 755 /app/API/logs && \
    mkdir -p /app/uploads && \
    chmod 755 /app/uploads

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD php -r "echo file_get_contents('http://localhost:8080/index.html') ? 'OK' : 'FAIL';" || exit 1

EXPOSE 8080

# Start script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

### Étape 3: Configuration Nginx

Créer `nginx.conf`:

```nginx
user nobody;
worker_processes auto;
pid /run/nginx.pid;
daemon off;

events {
    worker_connections 1024;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /dev/stdout main;
    error_log /dev/stderr warn;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 50M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/atom+xml image/svg+xml;

    server {
        listen 8080 default_server;
        server_name _;

        root /app/public;
        index index.html index.php;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;

        # Route frontend React (Try files)
        location / {
            # Try to serve static files, then directories, then fallback to index.html
            try_files $uri $uri/ /index.html;
            
            # Cache busting for assets
            location ~* \.(?:js|css|svg|png|jpg|jpeg|gif|woff2?)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # API routes
        location /API/ {
            # Prevent direct access to config files
            location ~ \.(php.?|phar)$ {
                deny all;
            }
            
            location ~ \.php$ {
                fastcgi_pass 127.0.0.1:9000;
                fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
                fastcgi_param REQUEST_URI $request_uri;
                fastcgi_param SCRIPT_NAME $script_name;
                include fastcgi_params;
            }
        }

        # PHP-FPM backend
        location ~ \.php$ {
            try_files $uri =404;
            fastcgi_pass 127.0.0.1:9000;
            fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
            fastcgi_param REQUEST_URI $request_uri;
            include fastcgi_params;

            # Security
            fastcgi_hide_header X-Powered-By;
        }

        # Deny access to sensitive files
        location ~ /\. {
            deny all;
            access_log off;
            log_not_found off;
        }

        location ~ ~$ {
            deny all;
            access_log off;
            log_not_found off;
        }
    }
}
```

### Étape 4: Configuration PHP

Créer `php.ini`:

```ini
; php.ini - Custom configuration for production

; Display errors to logs, not to user
display_errors = Off
log_errors = On
error_log = /dev/stderr

; Session security
session.cookie_httponly = 1
session.cookie_secure = 1
session.cookie_samesite = Strict
session.use_strict_mode = 1

; Performance
max_execution_time = 30
max_input_time = 60
memory_limit = 256M
post_max_size = 50M
upload_max_filesize = 50M

; Opcache (cache opcode PHP)
opcache.enable = 1
opcache.enable_cli = 1
opcache.memory_consumption = 128
opcache.interned_strings_buffer = 8
opcache.max_accelerated_files = 4000
opcache.revalidate_freq = 60
opcache.fast_shutdown = 1

; Date/Time
date.timezone = UTC

; Security
disable_functions = exec,passthru,shell_exec,system,proc_open,popen,curl_exec,curl_multi_exec,parse_ini_file,show_source
```

### Étape 5: Script d'Entrée

Créer `entrypoint.sh`:

```bash
#!/bin/sh

echo "🚀 Starting SaXalis application..."

# Ensure directories exist
mkdir -p /app/API/logs
mkdir -p /app/uploads

# Set permissions
chmod 755 /app/API/logs
chmod 755 /app/uploads

# Start PHP-FPM in background
echo "📦 Starting PHP-FPM..."
php-fpm -R

echo "✅ PHP-FPM started"

# Start Nginx (foreground)
echo "🌐 Starting Nginx..."
exec nginx
```

### Étape 6: Adapter `API/config.php`

Modifier `API/config.php` pour support Render env vars:

```php
<?php
// Load environment variables
function getenv_safe($var, $default = null) {
    $value = getenv($var);
    return $value !== false ? $value : $default;
}

// Database configuration (support à la fois MySQL et PostgreSQL)
if (getenv_safe('DATABASE_URL')) {
    // Render format: postgresql://user:pass@host:port/db
    // ou mysql://user:pass@host:port/db
    
    // Si utilisant PostgreSQL (recommandé)
    $db_driver = 'pgsql';
    $db_host = getenv_safe('DB_HOST', 'localhost');
    $db_port = getenv_safe('DB_PORT', '5432');
    $db_name = getenv_safe('DB_NAME', 'saxalis');
    $db_user = getenv_safe('DB_USER', 'postgres');
    $db_pass = getenv_safe('DB_PASSWORD', '');
} else {
    // Fallback local development
    $db_driver = 'mysql';
    $db_host = 'localhost';
    $db_port = '3306';
    $db_name = 'suivi_depenses';
    $db_user = 'root';
    $db_pass = '';
}

// CORS Configuration
$allowed_origins = [
    'http://localhost:5173',      // Local dev (Vite)
    'http://localhost:3000',      // Alt dev port
    'https://saxalis.free.nf',    // Old domain
    'https://www.saxalis.free.nf',
    getenv_safe('FRONTEND_URL', ''), // Render frontend URL env var
];

// CORS headers
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");

if (isset($_SERVER['HTTP_ORIGIN'])) {
    $origin = $_SERVER['HTTP_ORIGIN'];
    if (in_array($origin, $allowed_origins) || getenv('ENVIRONMENT') === 'local') {
        header("Access-Control-Allow-Origin: $origin");
    }
}

// Handle preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Session security (must be before session_start())
if (getenv('ENVIRONMENT') === 'production') {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', 1);
    ini_set('session.cookie_samesite', 'Strict');
}

session_start();

// Load environment-specific config
if (file_exists(__DIR__ . '/config.local.php')) {
    include __DIR__ . '/config.local.php';
}

// Database connection
try {
    if ($db_driver === 'pgsql') {
        $dsn = "pgsql:host=$db_host;port=$db_port;dbname=$db_name";
    } else {
        $dsn = "mysql:host=$db_host;port=$db_port;dbname=$db_name;charset=utf8mb4";
    }
    
    $pdo = new PDO($dsn, $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_STRINGIFY_FETCHES => false,
    ]);
    
    // Enable persistent connections in production
    if (getenv('ENVIRONMENT') === 'production') {
        $pdo->setAttribute(PDO::ATTR_PERSISTENT, true);
    }
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(['error' => 'Database connection failed']));
}

// Export for API usage
define('DB', $pdo);
define('ENVIRONMENT', getenv_safe('ENVIRONMENT', 'production'));
?>
```

---

## Phase 2: Test Local avec Docker

### Étape 1: Build Docker image

```bash
cd C:\MAMP\htdocs\SaXalis

# Créer image
docker build -t saxalis:latest .

# Ou avec build progress verbose
docker build --progress=plain -t saxalis:latest .
```

### Étape 2: Lancer container

```bash
docker run -it -p 8080:8080 \
  -e ENVIRONMENT=local \
  -e DB_HOST=host.docker.internal \
  -e DB_USER=root \
  -e DB_PASSWORD=root \
  -e DB_NAME=suivi_depenses \
  saxalis:latest
```

### Étape 3: Tester

- Frontend: http://localhost:8080
- API test: http://localhost:8080/API/get_transactions.php
- Logs: Sortie console Docker

---

## Phase 3: Préparer pour Render

### Étape 1: Créer `render.yaml`

À la racine du projet:

```yaml
services:
  - type: web
    name: saxalis
    runtime: docker
    plan: starter
    region: frankfurt  # ou us-east, eu-west-1
    
    envVars:
      - key: ENVIRONMENT
        value: production
      - key: FRONTEND_URL
        value: "https://saxalis.render.com"  # À adapter avec votre domaine
      - key: DB_DRIVER
        value: pgsql

    # Build
    dockerfilePath: Dockerfile
    
    # Health check
    healthCheckPath: /index.html
    
    # Auto deploy
    preDeployCommand: |
      if [ -f API/migrations.php ]; then php API/migrations.php; fi

databases:
  - name: saxalis-db
    plan: free
    databaseName: saxalis
    ipAllowList: []  # Allow all (à restreindre en prod)
```

### Étape 2: Créer `.dockerignore`

```
node_modules
npm-debug.log
.git
.gitignore
.env
.env.local
.vscode
.idea
*.md
dist
build
coverage
__tests__
.DS_Store
```

### Étape 3: Créer `.rendignore` (optionnel)

```
*.md
.git
.vscode
node_modules
```

---

## Phase 4: Déploiement sur Render

### Étape 1: Créer compte Render

1. Aller sur https://render.com
2. S'inscrire (gratuit)
3. Confirmer email

### Étape 2: Préparer GitHub

```bash
# Initialiser repo (si pas déjà fait)
git init
git add .
git commit -m "Initial commit - ready for Render migration"

# Push sur GitHub
git remote add origin https://github.com/YOUR_USERNAME/saxalis.git
git branch -M main
git push -u origin main
```

⚠️ **Important:** Le repo DOIT être public pour Render (plan gratuit)

### Étape 3: Connecter Render à GitHub

1. Aller à https://dashboard.render.com/
2. Click "New +" → "Web Service"
3. Sélectionner "Docker" comme Runtime
4. Connecter votre repo GitHub
5. Remplir:
   - **Name:** `saxalis`
   - **Branch:** `main`
   - **Build Command:** (laisser vide - utilise Dockerfile)
   - **Start Command:** (laisser vide - utilise Dockerfile)
   - **Plan:** Starter (gratuit)
   - **Region:** Frankfurt (ou proche de vous)

6. Cliquer "Deploy"

### Étape 4: Configurer Variables d'Environnement

Dans Render Dashboard:
1. Aller à votre service Web Service
2. "Environment" tab
3. Ajouter variables:

```
ENVIRONMENT = production
DB_DRIVER = pgsql
FRONTEND_URL = https://saxalis.render.com
SESSION_SECRET = votre_secret_aleatoire_64_chars
```

### Étape 5: Connecter Database

1. Aller à "Databases" tab
2. Créer nouvelle PostgreSQL database
3. Copier connection details
4. Ajouter env vars:

```
RENDER_DATABASE_URL = postgresql://user:pass@host:port/db
DB_HOST = host
DB_PORT = 5432
DB_NAME = database_name
DB_USER = user
DB_PASSWORD = password
```

---

## Phase 5: Migration Base de Données

### Option A: PostgreSQL (Recommandé)

Render offre PostgreSQL gratuit. Si vous voulez migrer depuis MySQL:

```bash
# Depuis votre machine locale:

# 1. Export MySQL structure
mysqldump -u root -p suivi_depenses --no-data > schema.sql

# 2. Adapter schema pour PostgreSQL
# (il y a des outils ou faire manuellement)

# 3. Importer dans PostgreSQL Render
psql postgresql://user:pass@host:port/db < schema_adapted.sql

# 4. Export MySQL données
mysqldump -u root -p suivi_depenses --no-create-info > data.sql

# 5. Importer données
psql postgresql://user:pass@host:port/db < data.sql
```

### Option B: Garder MySQL

Si vous voulez garder MySQL (moins idéal):
1. Créer compte clearDB ou JawsDB (MySQL as a service)
2. Récupérer connection string
3. Changer config.php pour MySQL
4. Ajouter à env vars Render

---

## Phase 6: Pointing Domaine

### Si vous gardez saxalis.free.nf
1. Laisser actuellement (Render support custom domains sur plan pro)

### Pour domaine custom (saxon.fr, etc)
1. Aller à "Settings" du Web Service
2. "Custom domains"
3. Ajouter domaine
4. Entrer DNS records (Render vous donne les infos)
5. Pointer registrar vers Render nameservers

---

## ✅ Checklist Finale

- [ ] Dockerfile créé et testé localement
- [ ] nginx.conf configuré
- [ ] php.ini configuré
- [ ] API/config.php adapté pour env vars
- [ ] entrypoint.sh créé et exécutable
- [ ] render.yaml créé
- [ ] .dockerignore créé
- [ ] Repo GitHub préparé (public)
- [ ] Compte Render créé
- [ ] Service Web connecté à GitHub
- [ ] Database PostgreSQL créée
- [ ] Env vars configurées
- [ ] Base de données migrée/importée
- [ ] Tests des endpoints API
- [ ] Frontend fonctionne
- [ ] Logs sans erreur PHP
- [ ] HTTPS fonctionnel

---

## 🐛 Troubleshooting

### Logs
```bash
# Console Render (Dashboard → Logs tab)
# Regarder les logs pour erreurs PHP, Nginx, etc.
```

### Erreurs Courantes

**502 Bad Gateway**
→ PHP-FPM ne répond pas
→ Vérifier logs
→ Vérifier entrypoint.sh permissions

**Connection refused - API**
→ Database not initialized
→ Env vars manquantes
→ Vérifier DATABASE_URL

**Static files 404**
→ Frontend dist/ pas builté
→ Vérifier dockerfile stage 1 (frontend-builder)
→ Vérifier dist/ dans final image

**CORS errors**
→ Adapter ALLOWED_ORIGINS en config.php
→ Vérifier FRONTEND_URL env var

---

## 📞 Besoin d'aide?

**Render docs:** https://render.com/docs
**Docker PHP:** https://hub.docker.com/_/php
**PostgreSQL:** https://www.postgresql.org/docs/

**Si erreurs après déploiement:**
1. Vérifier Console Logs dans Render Dashboard
2. SSH into container (Render Dashboard)
3. Tester commands manuellement
