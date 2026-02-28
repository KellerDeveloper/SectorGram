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
cd /var/www/sector   # или ваш путь к репозиторию
cd sector-web
npm ci
npm run build
```

Будет создана папка `dist/`. Путь к ней должен совпадать с `$frontend_root` в конфиге nginx (по умолчанию `/var/www/sector/sector-web/dist`).

## 2. Бэкенд

```bash
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

Измените `$frontend_root` в конфиге, если фронт лежит не в `/var/www/sector/sector-web/dist`:

```nginx
set $frontend_root /var/www/sector/sector-web/dist;
```

Включите сайт и проверьте конфиг:

```bash
# Симлинк: файл должен уже лежать в sites-available (см. шаг выше)
sudo ln -sf /etc/nginx/sites-available/sector.moscow.conf /etc/nginx/sites-enabled/
sudo nginx -t
```

Если `nginx -t` пишет «No such file or directory» для `sites-enabled/sector.moscow.conf` — значит в `sites-available` нет файла (cp выполнялся не из корня репо или deploy/ не залит на сервер). Проверьте: `ls -la /etc/nginx/sites-available/sector.moscow.conf`.

### SSL (Let's Encrypt)

Сначала убедитесь, что DNS для `sector.moscow`, `www.sector.moscow` и `api.sector.moscow` указывает на сервер. Затем:

```bash
sudo certbot --nginx -d sector.moscow -d www.sector.moscow -d api.sector.moscow
```

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

## Порты и домены

| Домен | Назначение |
|-------|------------|
| sector.moscow, www.sector.moscow | Статика из `sector-web/dist` (SPA) |
| api.sector.moscow | Прокси на `http://127.0.0.1:4000` (API + Socket.io) |

CORS в бэкенде уже разрешает `https://sector.moscow` и `https://www.sector.moscow`.
