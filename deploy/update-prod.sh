#!/usr/bin/env bash

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
  echo -e "${BLUE}[*]${NC} $*"
}

ok() {
  echo -e "${GREEN}[✔]${NC} $*"
}

warn() {
  echo -e "${YELLOW}[!]${NC} $*"
}

err() {
  echo -e "${RED}[✖]${NC} $*" >&2
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Команда '$1' не найдена. Установите её и повторите."
    exit 1
  fi
}

main() {
  require_cmd git
  require_cmd npm

  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  local project_dir
  project_dir="$(cd "${script_dir}/.." && pwd)"

  log "Проект: ${project_dir}"
  cd "${project_dir}"

  log "Обновляем код из Git (git fetch + git pull)..."
  git fetch --all --prune
  if ! git pull --ff-only; then
    err "git pull не удался. Скорее всего, есть локальные изменения."
    err "Проверьте: git status, затем повторите запуск скрипта."
    exit 1
  fi
  ok "Код обновлён."

  if [ -d "${project_dir}/sector-web" ]; then
    log "Сборка фронтенда (sector-web)..."
    cd "${project_dir}/sector-web"
    npm ci
    npm run build
    ok "Фронтенд собран."
  else
    warn "Папка sector-web не найдена, пропускаю сборку фронтенда."
  fi

  if [ -d "${project_dir}/tg-miniapp" ]; then
    log "Сборка Telegram mini app (tg-miniapp)..."
    cd "${project_dir}/tg-miniapp"
    npm install
    npm run build
    ok "Mini app собран."
  else
    warn "Папка tg-miniapp не найдена, пропускаю сборку mini app."
  fi

  if [ -d "${project_dir}/backend" ]; then
    log "Обновление зависимостей backend и перезапуск через PM2..."
    cd "${project_dir}/backend"
    npm ci

    if command -v pm2 >/dev/null 2>&1; then
      if pm2 describe sector-backend >/dev/null 2>&1; then
        pm2 restart sector-backend
      else
        pm2 start ecosystem.config.cjs
      fi
      ok "Backend обновлён и запущен через PM2."
    else
      warn "PM2 не найден. Запустите backend вручную:"
      echo "  cd backend && npm run dev"
    fi
  else
    warn "Папка backend не найдена, пропускаю шаг backend."
  fi

  ok "Обновление и запуск прод-окружения завершены."
}

main "$@"

