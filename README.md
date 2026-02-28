# Sector — Backend API (Realtime мессенджер)

Backend на Node.js/Express + Socket.io + MongoDB: JWT-аутентификация, чаты, сообщения в реальном времени, онлайн-статус, истории.

> 📖 **Запуск**: см. [QUICKSTART.md](./QUICKSTART.md)

### Возможности API

- Регистрация и аутентификация (JWT)
- Чаты (групповые и личные), сообщения
- Realtime через Socket.io (новые сообщения, тайпинг, реакции, прочтения)
- MongoDB (пользователи, чаты, сообщения, истории)
- Поиск пользователей, профиль, аватар
- Редактирование и удаление сообщений, пересылка
- Реакции на сообщения
- Истории (лента за 24 ч)
- Регистрация push-токенов для уведомлений (`POST /notifications/register`)

> 📦 **MongoDB**: [MONGODB_SETUP.md](./backend/MONGODB_SETUP.md), [MONGODB_ATLAS_SETUP.md](./backend/MONGODB_ATLAS_SETUP.md)  
> 👀 **Просмотр БД**: [VIEW_DATABASE.md](./backend/VIEW_DATABASE.md)

### Архитектура backend

- **Точка входа**: `backend/src/server.js`
- **Приложение**: `backend/src/app.js` (Express, маршруты, middleware)
- **Слои**: `routes/`, `controllers/`, `services/`, `models/`, `middleware/`, `validators/`, `socket/`, `config/`

### Конфигурация

Скопируйте `backend/.env.example` в `backend/.env`:

- `MONGODB_URI` — строка подключения к MongoDB
- `JWT_SECRET` — секрет для JWT
- `PORT` — порт (по умолчанию 4000)
- `CORS_ORIGIN` — разрешённые origin'ы через запятую

### Запуск

```bash
./start.sh
# или
cd backend && npm install && npm run dev
```

Сервер: `http://localhost:4000`

### Тесты

```bash
cd backend && npm test
```

### API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| POST | /auth/register | Регистрация |
| POST | /auth/login | Вход |
| GET | /chats | Список чатов |
| POST | /chats | Создать групповой чат |
| POST | /chats/private | Личный чат |
| GET | /chats/:id/messages | Сообщения чата |
| GET | /chats/:id/online | Онлайн в чате |
| POST | /chats/:id/read | Отметить прочитано |
| PUT | /messages/:id | Редактировать сообщение |
| DELETE | /messages/:id | Удалить сообщение |
| GET | /users/me | Текущий пользователь |
| PUT | /users/me | Обновить профиль |
| GET | /users/online | Список онлайн |
| GET | /users/search?q= | Поиск пользователей |
| POST | /notifications/register | Push-токен |
| GET/POST/DELETE | /stories, /stories/user/:userId, /stories/:id/view | Истории |

### Socket.io

Подробно: [backend/SOCKET_EVENTS.md](./backend/SOCKET_EVENTS.md)

- **Клиент → сервер**: `join_chat`, `leave_chat`, `send_message`, `edit_message`, `delete_message`, `typing_start`, `typing_stop`, `mark_read`, `add_reaction`, `remove_reaction` и др.
- **Сервер → клиент**: `new_message`, `message_updated`, `message_deleted`, `user_typing`, `messages_read`, `reaction_added`, `user_status_change` и др.
