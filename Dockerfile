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
