#!/bin/sh

echo "🚀 Starting SaXalis application..."

# Ensure directories exist
mkdir -p /app/API/logs
mkdir -p /app/uploads

# Set permissions
chmod 755 /app/API/logs
chmod 755 /app/uploads
chmod 755 /run/nginx

# Start PHP-FPM in background
echo "📦 Starting PHP-FPM..."
php-fpm -R &

echo "✅ PHP-FPM started"

# Start Nginx (foreground)
echo "🌐 Starting Nginx..."
exec nginx
