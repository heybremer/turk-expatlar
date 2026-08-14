#!/usr/bin/env bash
# Sunucuda güncelleme — GitHub Actions ile aynı script
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/turkexpatlar}"
export APP_DIR
exec bash "$APP_DIR/scripts/production-deploy.sh"
