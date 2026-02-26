# Socket.io События - Документация

## Подключение

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  auth: {
    token: "your-jwt-token"
  }
});
```

## События от клиента к серверу

### `join_chat`
Присоединиться к комнате чата. После присоединения вы будете получать все сообщения этого чата.

```javascript
socket.emit("join_chat", chatId);
```

**Ответы:**
- `chat_online_users` - список онлайн пользователей в чате
- `error` - если чат не найден или нет доступа

### `leave_chat`
Покинуть комнату чата.

```javascript
socket.emit("leave_chat", chatId);
```

### `send_message`
Отправить сообщение в чат.

```javascript
socket.emit("send_message", {
  chatId: 1,
  text: "Привет, мир!",
  replyTo: "messageId", // опционально - ID сообщения, на которое отвечаем
  media: { // опционально - медиа файл
    type: "photo",
    url: "data:image/jpeg;base64,...",
    thumbnail: "data:image/jpeg;base64,..."
  }
});
```

**Ответы:**
- `new_message` - сообщение будет отправлено всем участникам чата (включая отправителя)
- `error` - если чат не найден, нет доступа или текст/медиа пустые

### `get_chat_online`
Запросить список онлайн пользователей в конкретном чате.

```javascript
socket.emit("get_chat_online", chatId);
```

**Ответ:**
```javascript
socket.on("chat_online_users", ({ chatId, onlineUsers }) => {
  console.log(`Онлайн в чате ${chatId}:`, onlineUsers);
});
```

### `get_user_status`
Запросить онлайн-статус конкретных пользователей.

```javascript
socket.emit("get_user_status", {
  userIds: [1, 2, 3]
});
```

**Ответ:**
```javascript
socket.on("user_status_response", ({ statuses }) => {
  statuses.forEach(({ userId, isOnline }) => {
    console.log(`Пользователь ${userId}: ${isOnline ? "онлайн" : "оффлайн"}`);
  });
});
```

### `edit_message`
Редактировать сообщение.

```javascript
socket.emit("edit_message", {
  messageId: "messageId",
  text: "Исправленный текст"
});
```

**Ответы:**
- `message_updated` - отправляется всем участникам чата
- `error` - если сообщение не найдено или нет прав на редактирование

### `delete_message`
Удалить сообщение.

```javascript
socket.emit("delete_message", {
  messageId: "messageId"
});
```

**Ответы:**
- `message_deleted` - отправляется всем участникам чата
- `error` - если сообщение не найдено или нет прав на удаление

### `typing_start`
Начать индикатор печати (пользователь начал печатать).

```javascript
socket.emit("typing_start", {
  chatId: 1
});
```

**Ответы:**
- `user_typing` - отправляется другим участникам чата (кроме отправителя)

### `typing_stop`
Остановить индикатор печати (пользователь перестал печатать).

```javascript
socket.emit("typing_stop", {
  chatId: 1
});
```

**Ответы:**
- `user_stopped_typing` - отправляется другим участникам чата

### `mark_read`
Отметить сообщения как прочитанные.

```javascript
socket.emit("mark_read", {
  chatId: 1,
  messageIds: ["msg1", "msg2"] // опционально - конкретные сообщения, иначе все в чате
});
```

**Ответы:**
- `messages_read` - отправляется другим участникам чата для обновления статусов

### `add_reaction`
Добавить реакцию на сообщение.

```javascript
socket.emit("add_reaction", {
  messageId: "messageId",
  emoji: "👍" // Разрешенные: 👍, ❤️, 😂, 😮, 😢, 🙏, 🔥, 👏, 🎉, 💯
});
```

**Ответы:**
- `reaction_added` - отправляется всем участникам чата
- `error` - если сообщение не найдено, нет доступа или недопустимый эмодзи

### `remove_reaction`
Удалить реакцию с сообщения.

```javascript
socket.emit("remove_reaction", {
  messageId: "messageId",
  emoji: "👍"
});
```

**Ответы:**
- `reaction_removed` - отправляется всем участникам чата
- `error` - если сообщение не найдено или нет доступа

### `forward_message`
Переслать сообщение в другой чат.

```javascript
socket.emit("forward_message", {
  messageId: "messageId",
  targetChatId: "targetChatId"
});
```

**Ответы:**
- `new_message` - отправляется всем участникам целевого чата
- `chat_updated` - обновление списка чатов для всех участников
- `error` - если сообщение или чат не найдены, или нет доступа

## События от сервера к клиенту

### `new_message`
Новое сообщение в чате, к которому вы присоединены.

```javascript
socket.on("new_message", (message) => {
  console.log("Новое сообщение:", message);
  // {
  //   id: 123,
  //   chatId: 1,
  //   authorId: 2,
  //   text: "Привет!",
  //   createdAt: "2026-02-17T10:30:00.000Z",
  //   author: {
  //     id: 2,
  //     name: "Иван",
  //     email: "ivan@example.com"
  //   }
  // }
});
```

### `user_status_change`
Изменение онлайн-статуса пользователя.

```javascript
socket.on("user_status_change", (data) => {
  console.log(`Пользователь ${data.user.name} теперь ${data.isOnline ? "онлайн" : "оффлайн"}`);
  // {
  //   userId: 2,
  //   isOnline: true,
  //   user: { id: 2, name: "Иван", email: "ivan@example.com" },
  //   timestamp: "2026-02-17T10:30:00.000Z"
  // }
});
```

### `user_joined_chat`
Пользователь присоединился к чату.

```javascript
socket.on("user_joined_chat", (data) => {
  console.log(`${data.user.name} присоединился к чату ${data.chatId}`);
});
```

### `user_left_chat`
Пользователь покинул чат.

```javascript
socket.on("user_left_chat", (data) => {
  console.log(`Пользователь ${data.userId} покинул чат ${data.chatId}`);
});
```

### `chat_online_users`
Список онлайн пользователей в чате (ответ на `get_chat_online` или при `join_chat`).

```javascript
socket.on("chat_online_users", ({ chatId, onlineUsers }) => {
  console.log(`Онлайн в чате ${chatId}:`, onlineUsers);
  // onlineUsers - массив ID пользователей: [1, 2, 3]
});
```

### `message_updated`
Сообщение было отредактировано.

```javascript
socket.on("message_updated", ({ id, chatId, text, editedAt }) => {
  console.log("Сообщение отредактировано:", id, text);
});
```

### `message_deleted`
Сообщение было удалено.

```javascript
socket.on("message_deleted", ({ id, chatId }) => {
  console.log("Сообщение удалено:", id);
});
```

### `user_typing`
Пользователь начал печатать.

```javascript
socket.on("user_typing", ({ chatId, userId, userName }) => {
  console.log(`${userName} печатает в чате ${chatId}`);
});
```

### `user_stopped_typing`
Пользователь перестал печатать.

```javascript
socket.on("user_stopped_typing", ({ chatId, userId }) => {
  console.log(`Пользователь ${userId} перестал печатать`);
});
```

### `messages_read`
Сообщения были прочитаны.

```javascript
socket.on("messages_read", ({ chatId, userId, messageIds }) => {
  console.log(`Пользователь ${userId} прочитал сообщения в чате ${chatId}`);
  // Обновите статусы сообщений на "read"
});
```

### `reaction_added`
Реакция была добавлена к сообщению.

```javascript
socket.on("reaction_added", ({ messageId, chatId, emoji, userId, reactions }) => {
  console.log(`Пользователь ${userId} добавил реакцию ${emoji} к сообщению ${messageId}`);
  // reactions - массив всех реакций: [{ emoji: "👍", count: 2 }, ...]
  // Обновите UI сообщения
});
```

### `reaction_removed`
Реакция была удалена с сообщения.

```javascript
socket.on("reaction_removed", ({ messageId, chatId, emoji, userId, reactions }) => {
  console.log(`Пользователь ${userId} удалил реакцию ${emoji} с сообщения ${messageId}`);
  // reactions - массив всех реакций после удаления
  // Обновите UI сообщения
});
```

### `error`
Ошибка выполнения операции.

```javascript
socket.on("error", ({ message }) => {
  console.error("Ошибка:", message);
});
```

## Автоматическое поведение

При подключении к серверу:
1. Пользователь автоматически отмечается как онлайн
2. Все участники чатов пользователя получают уведомление `user_status_change` (isOnline: true)
3. Пользователь автоматически присоединяется ко всем своим чатам
4. При отключении пользователь отмечается как оффлайн, и все получают уведомление

## Пример полного использования

```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:4000", {
  auth: { token: "your-jwt-token" }
});

// Подключение
socket.on("connect", () => {
  console.log("Подключен к серверу");
  
  // Присоединяемся к чату
  socket.emit("join_chat", 1);
});

// Получаем список онлайн пользователей
socket.on("chat_online_users", ({ chatId, onlineUsers }) => {
  console.log(`В чате ${chatId} онлайн:`, onlineUsers.length);
});

// Слушаем новые сообщения
socket.on("new_message", (message) => {
  console.log(`${message.author.name}: ${message.text}`);
});

// Следим за статусом пользователей
socket.on("user_status_change", ({ user, isOnline }) => {
  console.log(`${user.name} ${isOnline ? "в сети" : "не в сети"}`);
});

// Отправляем сообщение
function sendMessage(chatId, text) {
  socket.emit("send_message", { chatId, text });
}

// Отключение
socket.on("disconnect", () => {
  console.log("Отключен от сервера");
});
```
