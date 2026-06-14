#!/usr/bin/env bash
set -euo pipefail

DOMAIN="dostuffandhavefun.com"
WEBROOT="/var/www/${DOMAIN}"
NGINX_AVAILABLE="/etc/nginx/sites-available/${DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

echo "Shared-server safety check for ${DOMAIN}"
echo "This script only prepares an isolated static site for ${DOMAIN}."
echo

echo "1. Inspecting server basics..."
hostname
id
command -v nginx || true
command -v certbot || true
systemctl is-active nginx || true

echo
echo "2. Existing enabled Nginx sites:"
ls -la /etc/nginx/sites-enabled 2>/dev/null || true

echo
echo "3. Existing site names that mention this domain:"
grep -R "server_name .*${DOMAIN}" /etc/nginx/sites-available /etc/nginx/sites-enabled 2>/dev/null || true

echo
echo "4. Existing certificates that mention this domain:"
ls -la /etc/letsencrypt/live 2>/dev/null || true

echo
echo "Inspection complete."
echo "Only continue if the output shows it is safe to add an isolated ${DOMAIN} site."
echo

read -r -p "Type DEPLOY-${DOMAIN} to continue: " CONFIRMATION
if [[ "${CONFIRMATION}" != "DEPLOY-${DOMAIN}" ]]; then
  echo "Stopped without changes."
  exit 0
fi

echo "Creating isolated web root..."
mkdir -p "${WEBROOT}"

echo "Copy built files into ${WEBROOT} before running the next steps."
echo "Expected local command from this project:"
echo "  rsync -avz --delete dist/ root@2.25.190.115:${WEBROOT}/"
echo
echo "After files are copied, install the Nginx config:"
echo "  cp deploy/nginx-dostuffandhavefun.com.conf ${NGINX_AVAILABLE}"
echo "  ln -sfn ${NGINX_AVAILABLE} ${NGINX_ENABLED}"
echo "  nginx -t && systemctl reload nginx"
echo
echo "Then issue SSL only for this domain:"
echo "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --redirect -m georgeandjohnmcp@gmail.com --agree-tos --no-eff-email"
