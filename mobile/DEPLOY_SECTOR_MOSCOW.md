# Деплой на sector.moscow — почему сайт не обновляется

Чаще всего на домене «ничего не обновляется» из‑за **кэширования**: браузер или сервер отдают старую версию `index.html` и JS.

## 1. Сборка веб-версии

```bash
cd mobile
npm run build:web
```

Готовые файлы появятся в папке **`dist/`**. Эту папку нужно выкладывать на сервер (корень сайта sector.moscow).

## 2. Как залить папку dist/ на сервер

Нужно скопировать **содержимое** папки `dist/` (файлы `index.html`, `_expo/`, JS, CSS и т.д.) в корневую папку сайта на сервере. Ниже — три способа.

### Способ A: Терминал (SFTP/SCP) — если есть SSH-доступ

Узнайте у хостинга: адрес сервера (например `sector.moscow` или `123.45.67.89`), логин и путь к папке сайта (например `/var/www/sector.moscow` или `/home/user/public_html`).

**Залить всё содержимое `dist/` одной командой:**

```bash
cd /Users/dmitrijkeller/Documents/XCodeProj/sector/mobile
scp -r dist/* ВАШ_ЛОГИН@sector.moscow:/путь/к/папке/сайта/
```

Пример (подставьте свой логин и путь):

```bash
scp -r dist/* user@sector.moscow:/var/www/sector.moscow/
```

Пароль запросит терминал. Если используете SSH-ключ, пароль не понадобится.

**Через rsync (удобно для повторных деплоев — копирует только изменённое):**

```bash
rsync -avz --delete dist/ ВАШ_ЛОГИН@sector.moscow:/путь/к/папке/сайта/
```

### Способ B: Программа с графическим интерфейсом (FTP/SFTP)

1. Установите клиент, например:
   - **FileZilla** — https://filezilla-project.org (Win/Mac/Linux)
   - **Cyberduck** — https://cyberduck.io (Mac/Windows)

2. Создайте подключение:
   - **Протокол:** SFTP (если есть SSH) или FTP — как дал хостинг.
   - **Хост:** `sector.moscow` (или адрес из письма хостинга).
   - **Логин и пароль** — из панели хостинга / письма.

3. Подключитесь. Слева — ваш компьютер, справа — сервер.

4. Слева откройте папку `mobile/dist/`. Справа откройте **корневую папку сайта** (ту, откуда отдаётся sector.moscow — часто `public_html`, `www`, `htdocs` или путь из панели).

5. Выделите **все файлы и папки внутри** `dist/` (не саму папку `dist`, а то, что в ней: `index.html`, `_expo`, и т.д.) и перетащите их в корневую папку сайта справа. При перезаписи подтвердите.

### Способ C: Через панель хостинга (cPanel, ISPmanager и т.п.)

1. Войдите в панель управления хостингом.
2. Откройте **Файловый менеджер** (или «Файлы», «File Manager»).
3. Перейдите в **корневую папку сайта** для sector.moscow.
4. Загрузите файлы: найдите кнопку **«Загрузить» / «Upload»**, выберите все файлы и папки из вашей локальной папки `mobile/dist/` (можно перетащить или выбрать через «Обзор»). Загружать нужно именно содержимое `dist/`, чтобы `index.html` оказался в корне сайта.

---

После заливки откройте https://sector.moscow и сделайте жёсткое обновление (**Cmd+Shift+R** / **Ctrl+Shift+R**). Если настроены заголовки без кэша (раздел ниже), обновления будут видны сразу.

## 3. Заголовки кэширования на сервере (обязательно)

Чтобы после деплоя пользователи сразу видели новую версию, для **главной страницы и index.html** нельзя отдавать долгий кэш.

### Если стоит nginx — пошагово

**Шаг 1.** Подключитесь по SSH к серверу и откройте конфиг nginx. Чаще всего это один из файлов:

```bash
sudo nano /etc/nginx/sites-available/default
```

или, если есть отдельный конфиг для домена:

```bash
sudo nano /etc/nginx/sites-available/sector.moscow
```

В репозитории есть готовый пример конфига: **`mobile/nginx-sector.moscow.example.conf`**. Можно скопировать его на сервер и подключить: см. комментарии в начале файла.

**Шаг 2.** Найдите блок `server { ... }`, который отвечает за sector.moscow (там будет `server_name sector.moscow` или `server_name _`). Должно быть указано `root /var/www/html;` (или уже есть).

**Шаг 3.** Внутри этого блока `server { }` добавьте два блока `location` **до** любого существующего `location /` (если он есть — можно заменить его на вариант ниже). Итог должен быть таким:

```nginx
server {
    # ... существующие директивы (listen, server_name, root и т.д.) ...
    root /var/www/html;

    # Не кэшировать главную и index.html — тогда после деплоя сразу видна новая версия
    location = / {
        try_files /index.html =404;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }
}
```

Если у вас был только `root /var/www/html;` и одного `location /` не было — просто добавьте все три блока `location` как выше.

**Полный пример файла `/etc/nginx/sites-available/default`** (только HTTP, без SSL):

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    root /var/www/html;
    index index.html;

    server_name sector.moscow www.sector.moscow _;

    # Не кэшировать главную и index.html
    location = / {
        try_files /index.html =404;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }
}
```

Если у вас уже настроен HTTPS (SSL), в конфиге будет второй блок `server { listen 443 ssl; ... }`. В него тоже добавьте `root` и три блока `location` как выше (без изменения `listen`, `ssl_certificate` и остального). Итог: в блоке для 443 должны быть `root /var/www/html;` и те же три `location`.

**Шаг 4.** Сохраните файл (в nano: Ctrl+O, Enter, Ctrl+X).

**Шаг 5.** Проверьте конфиг и перезагрузите nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Если `nginx -t` выдал ошибку — вернитесь к конфигу и проверьте скобки и точки с запятой.

Главное: для **`/` и `/index.html`** должен быть **`Cache-Control: no-store`** (или `max-age=0`), иначе браузер будет подолгу показывать старую версию.

### Если хостинг задаёт заголовки через панель

Найдите настройки кэша / CDN и для **главной страницы (index.html)** выставьте:
- **Cache-Control:** `no-store` или `max-age=0, must-revalidate`
- Либо отключите кэш для `index.html` и для пути `/`.

## 4. После изменения конфига

1. Перезагрузите nginx: `sudo nginx -t && sudo systemctl reload nginx`
2. Сделайте **жёсткое обновление** в браузере: **Cmd+Shift+R** (Mac) или **Ctrl+Shift+R** (Windows)

## 5. Проверка

В DevTools браузера (F12) → вкладка **Network** → обновите страницу → выберите запрос к `https://sector.moscow/` или `https://sector.moscow/index.html` → во вкладке **Headers** посмотрите **Response Headers**. Там не должно быть `Cache-Control: max-age=...` с большим значением (например 31536000). Для index.html лучше видеть `no-store` или `max-age=0`.

---

## 6. Почему ничего не поменялось после заливки

Если вы залили `dist/`, а на сайте по-прежнему старая версия, проверьте по шагам.

### А. На сервере — действительно ли там новые файлы

Подключитесь по SSH и выполните:

```bash
ls -la /var/www/html/
```

Должны быть файлы `index.html`, папка `_expo` и т.д. Посмотрите **дату** у `index.html` — она должна совпадать с моментом заливки. Если даты старые или там один только `index.nginx-debian.html` — заливка попала не туда или не перезаписала файлы.

Проверьте, какой файл отдаётся при запросе главной:

```bash
curl -I http://127.0.0.1/
```

В ответе должна быть строка с `200` и путь к отдаваемой странице. Если nginx отдаёт другой root (не `/var/www/html`), конфиг нужно поправить.

### Б. Какой root у nginx для sector.moscow

Проверьте, откуда nginx берёт файлы для вашего домена:

```bash
grep -r "root\|server_name" /etc/nginx/sites-enabled/
```

Для `server_name sector.moscow` (или `www.sector.moscow`) должна быть строка `root /var/www/html;` (или путь к папке, куда вы залили `dist/`). Если там другой каталог — либо залейте файлы туда, либо измените `root` на `/var/www/html` и перезагрузите nginx.

### В. Кэш — заголовки и браузер

1. **Заголовки без кэша** для `/` и `/index.html` в nginx должны быть добавлены и nginx перезагружен (см. раздел 3 выше). После правок:
   ```bash
   sudo nginx -t && sudo systemctl reload nginx
   ```

2. **В браузере:** откройте сайт в режиме **инкогнито** (Cmd+Shift+N / Ctrl+Shift+N) или сделайте жёсткое обновление **Cmd+Shift+R** (Mac) / **Ctrl+Shift+R** (Windows). Если в инкогнито видна новая версия — мешал кэш браузера.

3. **Проверка заголовков:** F12 → вкладка **Network** → обновите страницу → клик по запросу к `sector.moscow` или `index.html` → **Headers** → **Response Headers**. Должно быть `Cache-Control: no-store` или `max-age=0`. Если там `max-age=31536000` или другое большое число — nginx или CDN кэшируют; нужно поправить конфиг (или отключить кэш в панели хостинга).

### Г. Залито содержимое папки, а не сама папка

В `/var/www/html/` должен лежать **сам** файл `index.html`, а не папка `dist` с ним внутри. Правильно: `/var/www/html/index.html`. Неправильно: `/var/www/html/dist/index.html`. Если получилось второе — переместите файлы из `/var/www/html/dist/` в `/var/www/html/` или залейте заново именно **содержимое** `dist/` в корень.

---

**Кратко:** собиравьте `npm run build:web`, выкладывайте содержимое `dist/` на sector.moscow и настройте сервер так, чтобы **index.html и главная страница не кэшировались**.
