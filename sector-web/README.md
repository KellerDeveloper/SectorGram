# Sector — веб-версия мессенджера

Веб-клиент для [Sector API](../README.md): React + TypeScript + Vite, авторизация по JWT, чаты и сообщения в реальном времени через Socket.io.

## Требования

- **Node.js** 18+
- Запущенный backend (см. [QUICKSTART.md](../QUICKSTART.md))

## Установка и запуск

```bash
cd sector-web
npm install
npm run dev
```

Приложение: **http://localhost:5173**

В режиме разработки запросы к API и Socket.io проксируются на `http://localhost:4000`. Убедитесь, что в `backend/.env` в `CORS_ORIGIN` указан `http://localhost:5173` (или добавьте его через запятую).

## Сборка и деплой на sector.moscow

```bash
npm run build
```

Статика будет в папке `dist/`. Для работы на домене **sector.moscow** уже настроен файл `.env.production`: API и Socket.io идут на **https://api.sector.moscow**. Бэкенд должен быть доступен по этому адресу (в `backend` CORS уже разрешает sector.moscow).

- Фронт раздаётся с **https://sector.moscow** (или www).
- Бэкенд — **https://api.sector.moscow** (тот же сервер или отдельный).

Готовый конфиг nginx и инструкция по деплою: **[deploy/README.md](../deploy/README.md)** (файл конфига: `deploy/nginx/sector.moscow.conf`).

Если API отдаётся с того же домена по пути `/api`, уберите или обнулите `VITE_API_URL` в `.env.production` и пересоберите проект.

## Реализовано

- Вход и регистрация (JWT)
- Список чатов, создание личного чата (поиск пользователей)
- Просмотр чата, отправка и получение сообщений в реальном времени (Socket.io)
- Индикатор «печатает…», прочтения
- Тёмная тема, адаптивная вёрстка

## Структура

- `src/api/` — клиент REST API (auth, users, chats)
- `src/context/AuthContext.tsx` — хранение пользователя и токена
- `src/socket/useSocket.ts` — подключение к Socket.io и подписки на события
- `src/pages/` — страницы: вход, регистрация, список чатов, чат, новый чат
