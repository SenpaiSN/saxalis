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

# Copy only package.json (ignore package-lock.json)
COPY package.json ./

# Install dependencies with npm - ignore lock file to avoid conflicts
RUN npm install --no-prefer-offline --no-audit --legacy-peer-deps 2>&1 && npm cache clean --force

# Copy config files and source
COPY index.html vite.config.ts tailwind.config.js postcss.config.mjs ./
COPY src/ ./src/
COPY public/ ./public/

# Build production bundle
RUN npm run build 2>&1

# Final stage
FROM php-base

WORKDIR /app

# Copy frontend build
COPY --from=frontend-builder /app/dist ./public/dist

# Copy backend
COPY API/ ./API/
COPY index.html ./public/

# Create PHP config
RUN mkdir -p /usr/local/etc/php/conf.d && \
    echo 'display_errors = Off' > /usr/local/etc/php/conf.d/custom.ini && \
    echo 'log_errors = On' >> /usr/local/etc/php/conf.d/custom.ini && \
    echo 'error_log = /dev/stderr' >> /usr/local/etc/php/conf.d/custom.ini && \
    echo 'session.cookie_httponly = 1' >> /usr/local/etc/php/conf.d/custom.ini && \
    echo 'session.cookie_secure = 1' >> /usr/local/etc/php/conf.d/custom.ini && \
    echo 'max_execution_time = 30' >> /usr/local/etc/php/conf.d/custom.ini && \
    echo 'memory_limit = 256M' >> /usr/local/etc/php/conf.d/custom.ini && \
    echo 'post_max_size = 50M' >> /usr/local/etc/php/conf.d/custom.ini && \
    echo 'upload_max_filesize = 50M' >> /usr/local/etc/php/conf.d/custom.ini && \
    echo 'date.timezone = UTC' >> /usr/local/etc/php/conf.d/custom.ini && \
    echo 'opcache.enable = 1' >> /usr/local/etc/php/conf.d/custom.ini

# Create Nginx config
RUN mkdir -p /etc/nginx && \
    echo 'user nobody;' > /etc/nginx/nginx.conf && \
    echo 'worker_processes auto;' >> /etc/nginx/nginx.conf && \
    echo 'pid /run/nginx.pid;' >> /etc/nginx/nginx.conf && \
    echo 'daemon off;' >> /etc/nginx/nginx.conf && \
    echo 'events { worker_connections 1024; }' >> /etc/nginx/nginx.conf && \
    echo 'http {' >> /etc/nginx/nginx.conf && \
    echo '  include /etc/nginx/mime.types;' >> /etc/nginx/nginx.conf && \
    echo '  default_type application/octet-stream;' >> /etc/nginx/nginx.conf && \
    echo '  access_log /dev/stdout;' >> /etc/nginx/nginx.conf && \
    echo '  error_log /dev/stderr warn;' >> /etc/nginx/nginx.conf && \
    echo '  sendfile on;' >> /etc/nginx/nginx.conf && \
    echo '  tcp_nopush on;' >> /etc/nginx/nginx.conf && \
    echo '  keepalive_timeout 65;' >> /etc/nginx/nginx.conf && \
    echo '  gzip on;' >> /etc/nginx/nginx.conf && \
    echo '  client_max_body_size 50M;' >> /etc/nginx/nginx.conf && \
    echo '  server {' >> /etc/nginx/nginx.conf && \
    echo '    listen 8080 default_server;' >> /etc/nginx/nginx.conf && \
    echo '    server_name _;' >> /etc/nginx/nginx.conf && \
    echo '    root /app/public;' >> /etc/nginx/nginx.conf && \
    echo '    index index.html index.php;' >> /etc/nginx/nginx.conf && \
    echo '    location ~ \.php$ {' >> /etc/nginx/nginx.conf && \
    echo '      fastcgi_pass 127.0.0.1:9000;' >> /etc/nginx/nginx.conf && \
    echo '      fastcgi_index index.php;' >> /etc/nginx/nginx.conf && \
    echo '      fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;' >> /etc/nginx/nginx.conf && \
    echo '      include /etc/nginx/fastcgi_params;' >> /etc/nginx/nginx.conf && \
    echo '    }' >> /etc/nginx/nginx.conf && \
    echo '    location / {' >> /etc/nginx/nginx.conf && \
    echo '      try_files $uri $uri/ /index.html;' >> /etc/nginx/nginx.conf && \
    echo '    }' >> /etc/nginx/nginx.conf && \
    echo '  }' >> /etc/nginx/nginx.conf && \
    echo '}' >> /etc/nginx/nginx.conf

# Create required directories
RUN mkdir -p /app/API/logs && \
    chmod 755 /app/API/logs && \
    mkdir -p /app/uploads && \
    chmod 755 /app/uploads && \
    mkdir -p /run/nginx

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD php -r "echo file_get_contents('http://localhost:8080/index.html') ? 'OK' : 'FAIL';" || exit 1

EXPOSE 8080

# Create necessary directories
RUN mkdir -p /app/API/logs /app/uploads /run/nginx && \
    chmod 755 /app/API/logs /app/uploads /run/nginx

# Start PHP-FPM and Nginx
CMD php-fpm -D && nginx -g "daemon off;"
