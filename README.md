## Realtime мессенджер (React Native + Socket.io)

Проект состоит из двух частей:

- **backend**: сервер на Node.js/Express + Socket.io + MongoDB с JWT-аутентификацией, системой комнат и отслеживанием онлайн-статуса пользователей.
- **mobile**: Expo-приложение на React Native с поддержкой запуска на iOS/Android/Web (через React Native Web) и интеграцией с Socket.io.

> 📖 **Подробная инструкция по запуску**: см. [QUICKSTART.md](./QUICKSTART.md)

### Возможности

- ✅ Регистрация и аутентификация пользователей (JWT)
- ✅ Создание и управление чатами
- ✅ Realtime обмен сообщениями через Socket.io
- ✅ **MongoDB для хранения данных** (пользователи, чаты, сообщения)
- ✅ Система комнат (rooms) для изоляции чатов
- ✅ Отслеживание онлайн-статуса пользователей
- ✅ Уведомления о входе/выходе пользователей из чатов
- ✅ REST API для получения статуса онлайн пользователей
- ✅ **Поиск пользователей** и создание личных чатов
- ✅ **Редактирование профиля** с загрузкой аватара
- ✅ Telegram-подобный UI и функционал
- ✅ **Редактирование и удаление сообщений**
- ✅ **Статусы прочтения** (синие галочки для прочитанных)
- ✅ **Индикатор печати** (typing indicator)
- ✅ **Отправка фото** в чат
- ✅ **Пересылка сообщений** в другие чаты
- ✅ **Улучшенное отображение медиа** (видео, файлы)
- ✅ **Поиск по сообщениям** в чате
- ✅ **Реакции на сообщения** (👍, ❤️, 😂 и другие популярные эмодзи)
- ✅ **Push-уведомления** (через Expo Notifications) при новых сообщениях
- ✅ **Истории (кружки)** как в Telegram — лента кружков над чатами, просмотр и публикация фото/текста на 24 часа

> 📦 **Требования**: MongoDB (локально или Atlas). См. [MONGODB_SETUP.md](./backend/MONGODB_SETUP.md)  
> ☁️ **MongoDB Atlas**: Рекомендуется для начала - не требует установки! См. [MONGODB_ATLAS_SETUP.md](./backend/MONGODB_ATLAS_SETUP.md)  
> 👀 **Просмотр БД**: См. [VIEW_DATABASE.md](./backend/VIEW_DATABASE.md) - как смотреть данные в MongoDB

### Архитектура

- **Backend (Node.js/Express + Socket.io)**:
  - Точка входа: `backend/src/server.js` — запуск HTTP‑сервера и инициализация Socket.io.
  - Конфигурация приложения: `backend/src/app.js` — создание `express`‑приложения, подключение middleware, маршрутов и обработчика ошибок.
  - **Слои**:
    - `routes/` — HTTP‑маршруты (auth, chats, users, notifications).
    - `controllers/` — контроллеры, принимающие запрос и формирующие ответ.
    - `services/` — бизнес‑логика (работа с моделями `User`, `Chat`, `Message` и т.д.).
    - `models/` — Mongoose‑модели.
    - `middleware/` — авторизация (`authMiddleware`), валидация, централизованный обработчик ошибок.
    - `validators/` — схемы валидации входящих данных.
    - `socket/` — инициализация Socket.io и обработчики событий (чаты, присутствие, тайпинг, реакции).
    - `config/` — подключение к базе данных и общая конфигурация.

- **Mobile (Expo React Native)**:
  - Конфигурация URL: `mobile/src/config/env.js` — определяет `API_BASE_URL` и `WS_BASE_URL` через `EXPO_PUBLIC_*` переменные окружения или значения по умолчанию.
  - HTTP‑клиент: `mobile/src/api/client.js` — работа с REST API.
  - WebSocket‑клиент: `mobile/src/api/socket.js` — подключение к Socket.io и управление событиями.
  - **Хуки и состояние**:
    - `hooks/useChatMessages.js` — загрузка и обновление сообщений, подписка на Socket.io события.
    - `hooks/useTypingIndicator.js` — индикатор набора текста.
    - `hooks/useMessageActions.js` — отправка, редактирование, удаление и пересылка сообщений.
    - `hooks/useChatList.js` — список чатов и его обновление в реальном времени.
  - **UI‑компоненты**:
    - `components/MessageList.js`, `components/MessageBubble.js`, `components/MessageInput.js` — основной UI чата.
    - `components/ChatList.js` и `screens/ChatListScreen.js` / `screens/WebChatLayout.js` — список чатов для mobile и web.
  - Аутентификация и хранение токена: `context/AuthContext.js`, `storage/tokenStorage.js`.

### Конфигурация окружения

**Backend (`backend/.env`):**

Скопируйте `backend/.env.example` в `backend/.env` и при необходимости измените значения:

- `MONGODB_URI` — строка подключения к MongoDB (локальная или Atlas).
- `JWT_SECRET` — секрет для подписи JWT‑токенов (обязательно измените в реальном окружении).
- `PORT` — порт HTTP‑сервера (по умолчанию `4000`).
- `CORS_ORIGIN` — список разрешённых origin'ов (через запятую), с которых можно обращаться к API/Socket.io.

**Mobile (Expo, файл `app.json` или `.env` Expo):**

Используются публичные переменные окружения:

- `EXPO_PUBLIC_API_BASE_URL` — базовый URL API, например:
  - `http://localhost:4000` — для web/эмуляторов.
  - `http://<IP_КОМПЬЮТЕРА>:4000` — для реальных устройств в одной сети.
- `EXPO_PUBLIC_WS_BASE_URL` — URL для WebSocket/Socket.io (по умолчанию берётся из `EXPO_PUBLIC_API_BASE_URL`, если не указано отдельно).

Если вы не используете переменные окружения Expo, можно временно отредактировать значения по умолчанию в `mobile/src/config/env.js`.

### Быстрый запуск

**Вариант 1: Использовать скрипт**
```bash
# В первом терминале
./start.sh backend

# Во втором терминале
./start.sh mobile
```

**Вариант 2: Вручную**

**Backend:**
```bash
cd backend
npm install      # только первый раз

# Убедитесь, что MongoDB запущен (см. MONGODB_SETUP.md)
# Создайте файл .env с настройками (см. .env.example)

npm run dev
```
Сервер запустится на `http://localhost:4000` и подключится к MongoDB

**Frontend:**
```bash
cd mobile
npm install      # только первый раз
npm start
```

После запуска Expo:
- Нажмите `w` для web версии
- Отсканируйте QR-код для мобильного устройства (нужно приложение Expo Go)
- Нажмите `i` для iOS симулятора или `a` для Android эмулятора

> ⚠️ **Важно**: Для запуска на реальном устройстве укажите `EXPO_PUBLIC_API_BASE_URL` (и при необходимости `EXPO_PUBLIC_WS_BASE_URL`) с IP вашего компьютера, либо отредактируйте значения по умолчанию в `mobile/src/config/env.js`. Подробности в [QUICKSTART.md](./QUICKSTART.md)

### Тесты backend

В backend настроен Jest для базовых unit/integration‑тестов.

```bash
cd backend
npm test          # запустить все Jest‑тесты
```

### API Endpoints

#### Аутентификация
- `POST /auth/register` - Регистрация нового пользователя
- `POST /auth/login` - Вход в систему

#### Чаты
- `GET /chats` - Список чатов пользователя (включает `onlineCount`, `lastMessage`)
- `POST /chats` - Создать новый групповой чат
- `POST /chats/private` - Создать или получить личный чат с пользователем
- `GET /chats/:id/messages` - Получить сообщения чата
- `GET /chats/:id/online` - Получить список онлайн пользователей в чате
- `POST /chats/:id/read` - Отметить сообщения как прочитанные

#### Сообщения
- `PUT /messages/:id` - Редактировать сообщение
- `DELETE /messages/:id` - Удалить сообщение

#### Пользователи
- `GET /users/me` - Получить текущего пользователя
- `PUT /users/me` - Обновить профиль (name, username, bio, avatar)
- `GET /users/online` - Список всех онлайн пользователей
- `POST /users/online-status` - Проверить статус конкретных пользователей
- `GET /users/search?q=query` - Поиск пользователей по имени, email или username
- `POST /notifications/register` - Сохранить Expo Push Token для текущего пользователя

#### Истории (кружки)
- `GET /stories` - Лента историй (пользователи из чатов + свои, за последние 24 ч)
- `POST /stories` - Создать историю (body: `{ type: "photo"|"text", media?: { url }, text? }`)
- `GET /stories/user/:userId` - Истории одного пользователя
- `POST /stories/:id/view` - Отметить историю как просмотренную
- `DELETE /stories/:id` - Удалить свою историю

### Socket.io События

#### Клиент → Сервер
- `join_chat` (chatId) - Присоединиться к комнате чата
- `leave_chat` (chatId) - Покинуть комнату чата
- `send_message` ({ chatId, text, replyTo, media }) - Отправить сообщение
- `edit_message` ({ messageId, text }) - Редактировать сообщение
- `delete_message` ({ messageId }) - Удалить сообщение
- `forward_message` ({ messageId, targetChatId }) - Переслать сообщение
- `typing_start` ({ chatId }) - Начать индикатор печати
- `typing_stop` ({ chatId }) - Остановить индикатор печати
- `mark_read` ({ chatId, messageIds }) - Отметить сообщения как прочитанные
- `add_reaction` ({ messageId, emoji }) - Добавить реакцию на сообщение
- `remove_reaction` ({ messageId, emoji }) - Удалить реакцию с сообщения
- `get_chat_online` (chatId) - Запросить список онлайн пользователей в чате
- `get_user_status` ({ userIds }) - Запросить статус пользователей

#### Сервер → Клиент
- `new_message` - Новое сообщение в чате
- `message_updated` - Сообщение было отредактировано
- `message_deleted` - Сообщение было удалено
- `user_typing` - Пользователь начал печатать
- `user_stopped_typing` - Пользователь перестал печатать
- `messages_read` - Сообщения были прочитаны
- `reaction_added` - Реакция была добавлена к сообщению
- `reaction_removed` - Реакция была удалена с сообщения
- `user_status_change` - Изменение статуса пользователя (онлайн/оффлайн)
- `user_joined_chat` - Пользователь присоединился к чату
- `user_left_chat` - Пользователь покинул чат
- `chat_online_users` - Список онлайн пользователей в чате
- `user_status_response` - Ответ на запрос статуса пользователей
- `error` - Ошибка выполнения операции

### Push-уведомления (Expo)

- На мобильных платформах (iOS/Android) используется `expo-notifications`
- При входе в приложение токен устройства отправляется на backend через `POST /notifications/register`
- При новом сообщении сервер:
  - Сохраняет сообщение в MongoDB
  - Отправляет Socket.io событие `new_message`
  - Дополнительно отправляет **Expo Push** всем участникам чата (кроме отправителя), у кого есть `expoPushToken`

> 💡 В Expo Go push-уведомления полноценно работают только на реальных устройствах. Для продакшена рекомендуется собирать отдельный билд (EAS Build).

> 📖 **Подробная документация по Socket.io событиям**: см. [backend/SOCKET_EVENTS.md](./backend/SOCKET_EVENTS.md)

# SectorGram
# SectorGram
# SectorGram
