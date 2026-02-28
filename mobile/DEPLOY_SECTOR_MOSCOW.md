# Деплой на sector.moscow — почему сайт не обновляется

Чаще всего на домене «ничего не обновляется» из‑за **кэширования**: браузер или сервер отдают старую версию `index.html` и JS.

## 1. Сборка веб-версии

```bash
cd mobile
npm run build:web
```

Готовые файлы появятся в папке **`dist/`**. Эту папку нужно выкладывать на сервер (корень сайта sector.moscow).

## 2. Заголовки кэширования на сервере (обязательно)

Чтобы после деплоя пользователи сразу видели новую версию, для **главной страницы и index.html** нельзя отдавать долгий кэш.

### Если стоит nginx

Добавьте в конфиг сайта sector.moscow (в `server` или `location /`):

```nginx
server {
    server_name sector.moscow www.sector.moscow;
    root /путь/к/dist;

    location = / {
        try_files /index.html =404;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    location = /index.html {
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    # Остальные файлы (JS/CSS с хешами в имени можно кэшировать)
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=0, must-revalidate";
    }
}
```

Главное: для **`/` и `/index.html`** должно быть **`Cache-Control: no-store`** или **`max-age=0, must-revalidate`**, иначе браузер будет подолгу показывать старую версию.

### Если хостинг задаёт заголовки через панель

Найдите настройки кэша / CDN и для **главной страницы (index.html)** выставьте:
- **Cache-Control:** `no-store` или `max-age=0, must-revalidate`
- Либо отключите кэш для `index.html` и для пути `/`.

## 3. После изменения конфига

1. Перезагрузите nginx: `sudo nginx -t && sudo systemctl reload nginx`
2. Сделайте **жёсткое обновление** в браузере: **Cmd+Shift+R** (Mac) или **Ctrl+Shift+R** (Windows)

## 4. Проверка

В DevTools браузера (F12) → вкладка **Network** → обновите страницу → выберите запрос к `https://sector.moscow/` или `https://sector.moscow/index.html` → во вкладке **Headers** посмотрите **Response Headers**. Там не должно быть `Cache-Control: max-age=...` с большим значением (например 31536000). Для index.html лучше видеть `no-store` или `max-age=0`.

---

**Кратко:** собиравьте `npm run build:web`, выкладывайте содержимое `dist/` на sector.moscow и настройте сервер так, чтобы **index.html и главная страница не кэшировались**.
