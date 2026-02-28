#!/bin/bash

# Скрипт для запуска backend
# Использование: ./start.sh или ./start.sh backend

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_npm() {
  if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ Ошибка: npm не найден!${NC}"
    echo -e "${YELLOW}Node.js и npm не установлены.${NC}"
    echo ""
    echo -e "Установите Node.js одним из способов:"
    echo -e "  1. ${BLUE}Через Homebrew:${NC} brew install node"
    echo -e "  2. ${BLUE}Скачайте с официального сайта:${NC} https://nodejs.org/"
    echo -e "  3. ${BLUE}Через nvm:${NC} curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo ""
    echo -e "После установки перезапустите терминал и попробуйте снова."
    exit 1
  fi
}

case "$1" in
  backend|"")
    check_npm
    echo -e "${BLUE}Запуск backend сервера...${NC}"
    cd "$(dirname "$0")/backend" || exit 1
    if [ ! -d "node_modules" ]; then
      echo -e "${YELLOW}Установка зависимостей backend...${NC}"
      npm install
    fi
    npm run dev
    ;;
  *)
    echo "Использование: ./start.sh [backend]"
    exit 1
    ;;
esac
