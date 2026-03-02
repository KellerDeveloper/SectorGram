# Деплой sector.moscow

Настройка nginx для раздачи фронта (sector.moscow, www) и проксирования API и Socket.io (api.sector.moscow) на Node.js бэкенд.

## Требования на сервере

- Nginx
- Node.js 18+ (бэкенд)
- PM2 (`npm i -g pm2`) для бэкенда
- Certbot для SSL (Let's Encrypt)

## 1. Фронт (sector-web)

На сервере:

```bash
ssh root@89.111.143.86
cd /var/www/sector   # или ваш путь к репозиторию
cd sector-web
npm ci
npm run build
```

Будет создана папка `dist/`. Путь к ней должен совпадать с `$frontend_root` в конфиге nginx (по умолчанию `/var/www/sector/sector-web/dist`).

## 2. Бэкенд

```bash
ssh root@89.111.143.86
cd /var/www/sector/backend
cp .env.example .env
# Отредактировать .env: MONGODB_URI, JWT_SECRET, PORT=4000, CORS_ORIGIN
npm ci
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # автозапуск после перезагрузки
```

Бэкенд должен слушать порт **4000** (значение `PORT` в `.env`).

## 3. Nginx

### Установка конфига

Команды выполнять **из корня репозитория** (например `cd /var/www/sector`). Путь `deploy/nginx/...` именно от корня.

```bash
cd /var/www/sector
sudo cp deploy/nginx/sector.moscow.conf /etc/nginx/sites-available/sector.moscow.conf
```

Если папки `deploy/` на сервере ещё нет — закоммитьте и запушьте её с машины разработки, затем на сервере `git pull`.

Если фронт лежит не в `/var/www/sector/sector-web/dist`, отредактируйте в конфиге директиву `root` в блоке `server` для sector.moscow (строка с `root /var/www/sector/sector-web/dist;`).

Включите сайт и проверьте конфиг:

```bash
# Симлинк: файл должен уже лежать в sites-available (см. шаг выше)
sudo ln -sf /etc/nginx/sites-available/sector.moscow.conf /etc/nginx/sites-enabled/
sudo nginx -t
```

Если `nginx -t` пишет «No such file or directory» для `sites-enabled/sector.moscow.conf` — значит в `sites-available` нет файла (cp выполнялся не из корня репо или deploy/ не залит на сервер). Проверьте: `ls -la /etc/nginx/sites-available/sector.moscow.conf`.

**Если видите «conflicting server name»** — эти же домены объявлены ещё в одном конфиге. Оставьте только один. На сервере:
```bash
ls -la /etc/nginx/sites-enabled/
```
Удалите симлинк на старый конфиг (например `default` или конфиг, который правил certbot), чтобы для sector.moscow, www и api использовался только `sector.moscow.conf`:
```bash
sudo rm /etc/nginx/sites-enabled/default
# или другой файл, где были прописаны эти домены
sudo nginx -t && sudo systemctl reload nginx
```

### SSL (Let's Encrypt)

Сначала убедитесь, что DNS для `sector.moscow`, `www.sector.moscow` и **`api.sector.moscow`** указывает на IP сервера. Затем **обязательно** укажите все три домена:

```bash
sudo certbot --nginx -d sector.moscow -d www.sector.moscow -d api.sector.moscow
```

Если сертификат был получен без `api.sector.moscow`, браузер и curl будут выдавать ошибку вида «subjectAltName does not match host name api.sector.moscow» и запросы к API будут падать. Добавить домен в существующий сертификат:

```bash
sudo certbot --nginx -d sector.moscow -d www.sector.moscow -d api.sector.moscow --expand
```

После этого перезагрузите nginx: `sudo nginx -t && sudo systemctl reload nginx`.

Certbot сам добавит SSL в конфиг. Если вы уже скопировали конфиг из репозитория с путями к сертификатам, после certbot пути будут вида `/etc/letsencrypt/live/sector.moscow/...` — они уже прописаны в `sector.moscow.conf`.

Если подключаете конфиг **до** получения сертификатов, временно закомментируйте блоки `server { listen 443 ... }` и оставьте только `listen 80`, затем запустите certbot — он создаст SSL-блоки сам. После этого можно заменить конфиг на версию из репо с поддержкой 80→301 и 443.

### Применение

**Не запускайте `nginx` вручную** — порты 80/443 уже заняты работающим процессом. Только перезагрузка конфига:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Обновление

**Фронт:**

```bash
cd /var/www/sector && git pull
cd sector-web && npm ci && npm run build
# Перезагрузка nginx не нужна — статика уже из обновлённого dist/
```

**Бэкенд:**

```bash
cd /var/www/sector && git pull
cd backend && npm ci && pm2 restart sector-backend
```

## 5. Telegram mini app (tg-miniapp)

Мини-приложение Telegram живёт в отдельной папке `tg-miniapp` и авторизует пользователя через `Telegram.WebApp.initData`.

### Сборка на сервере

```bash
ssh root@89.111.143.86
cd /var/www/sector
cd tg-miniapp
# В tg-miniapp нет package-lock.json, поэтому используем обычный install
npm install
npm run build
```

После сборки будет создана папка `dist/`, например `/var/www/sector/tg-miniapp/dist`.

### Публикация мини-приложения

Вариант по умолчанию — отдавать mini app по адресу `https://sector.moscow/tg`:

1. В nginx‑конфиге (`deploy/nginx/sector.moscow.conf`, сервер для `sector.moscow`) добавьте блок:

   ```nginx
   # Telegram mini app (https://sector.moscow/tg)
   location /tg/ {
       alias /var/www/sector/tg-miniapp/dist/;
       index index.html;
       try_files $uri $uri/ /tg/index.html;
   }
   ```

2. Перезагрузите nginx:

   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. В `.env` бэкенда (`/var/www/sector/backend/.env`) задайте:

   ```env
   TELEGRAM_WEBAPP_URL=https://sector.moscow/tg
   ```

   Это URL, который будет использовать бот в кнопке «Открыть Sector», а mini app — для проверки `initData`.

4. Убедитесь, что webhook бота смотрит на ваш API:

   ```bash
   curl "https://api.telegram.org/bot<ВАШ_ТОКЕН>/setWebhook?url=https://api.sector.moscow/telegram/webhook"
   ```

После этого мини‑приложение будет открываться из Telegram и авторизовывать пользователя по его Telegram‑аккаунту.

### Обновление mini app через git

Когда вы меняете код `tg-miniapp` локально и пушите в git:

```bash
ssh root@89.111.143.86
cd /var/www/sector
git pull            # стянуть свежий код, в том числе tg-miniapp
cd tg-miniapp
npm install         # при изменении зависимостей
npm run build       # пересобрать dist/
```

Если путь в nginx уже настроен на `/var/www/sector/tg-miniapp/dist`, дополнительных действий не нужно — nginx сразу начнёт отдавать новую сборку.

### Как править nginx‑конфиг для mini app

1. **Правка в репозитории (предпочтительно)**  
   - Локально измените файл `deploy/nginx/sector.moscow.conf` (блок `location /tg/ { ... }`), закоммитьте и запушьте.  
   - На сервере:

     ```bash
     ssh root@89.111.143.86
     cd /var/www/sector
     git pull
     sudo cp deploy/nginx/sector.moscow.conf /etc/nginx/sites-available/sector.moscow.conf
     sudo nginx -t && sudo systemctl reload nginx
     ```

2. **Быстрая правка только на сервере** (если нужно срочно)  
   - Откройте конфиг:

     ```bash
     sudo nano /etc/nginx/sites-available/sector.moscow.conf
     # или vim, если удобнее
     ```

   - Отредактируйте блок `location /tg/ { ... }`, сохраните файл.  
   - Проверьте и примените:

     ```bash
     sudo nginx -t && sudo systemctl reload nginx
     ```

## Порты и домены

| Домен | Назначение |
|-------|------------|
| sector.moscow, www.sector.moscow | Статика из `sector-web/dist` (SPA) |
| api.sector.moscow | Прокси на `http://127.0.0.1:4000` (API + Socket.io) |

CORS в бэкенде разрешает `http` и `https` для `sector.moscow` и `www.sector.moscow`; для preflight (OPTIONS) явно заданы методы и заголовки (`Content-Type`, `Authorization`).

## Проверка после деплоя

Если фронт показывает «Failed to fetch» при логине/регистрации, проверьте **на сервере**:

```bash
# Бэкенд отвечает на localhost?
curl -s http://127.0.0.1:4000/health
# Ожидается: {"ok":true,"mongodb":"connected"} и HTTP 200

# Nginx проксирует api.sector.moscow на бэкенд?
curl -s -o /dev/null -w "%{http_code}" https://api.sector.moscow/health
# Ожидается: 200

# Preflight CORS (OPTIONS) отвечает 204?
# Если вывод пустой — проверьте с -v (verbose) и убедитесь, что бэкенд запущен.
curl -s -i -X OPTIONS --http1.1 "https://api.sector.moscow/auth/login" \
  -H "Origin: https://sector.moscow" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
# Ожидается первая строка: HTTP/1.1 204 No Content и заголовок Access-Control-Allow-Origin.

# Включён только один конфиг для этих доменов (нет conflicting server name)
ls -la /etc/nginx/sites-enabled/
```

Если первый `curl` не даёт 200 — запустите бэкенд: `cd /var/www/sector/backend && pm2 start ecosystem.config.cjs` (или `pm2 restart sector-backend`). Если второй не 200 — проверьте, что в `sites-enabled` только `sector.moscow.conf` и перезагрузите nginx.

**С вашего компьютера:** откройте в браузере `https://api.sector.moscow/health` — должна открыться JSON-строка `{"ok":true,"mongodb":"connected"}`. Если страница не открывается или предупреждение о сертификате — проблема в сети или SSL для api.sector.moscow. После любых правок CORS или nginx перезапустите бэкенд и выполните `sudo nginx -t && sudo systemctl reload nginx`.

### WebSocket (Socket.IO) не подключается

Если в консоли браузера ошибки вида «WebSocket connection to 'wss://sector.moscow/socket.io/...' failed»:

1. **Прокси на том же домене:** в конфиге nginx для `sector.moscow` должен быть блок `location /socket.io/` с проксированием на `http://127.0.0.1:4000` и заголовками `Upgrade`/`Connection` (в `deploy/nginx/sector.moscow.conf` он уже есть). После правок: `sudo nginx -t && sudo systemctl reload nginx`.

2. **Сборка с правильным API:** при сборке фронта должен подхватываться `VITE_API_URL` из `.env.production` (например `https://api.sector.moscow`). Тогда сокет будет подключаться к `api.sector.moscow`. Если переменная не задана, клиент использует текущий хост (`sector.moscow`), поэтому важен пункт 1.

3. Убедитесь, что бэкенд запущен (`pm2 list`, при необходимости `pm2 restart sector-backend`).
