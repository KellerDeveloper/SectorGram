# Как просматривать базу данных MongoDB

## Способ 1: MongoDB Compass (GUI, рекомендуется)

**Самый удобный способ для визуального просмотра данных.**

### Установка

1. Скачайте MongoDB Compass: https://www.mongodb.com/try/download/compass
2. Установите и запустите приложение

### Подключение

1. Откройте MongoDB Compass
2. В поле подключения введите:
   ```
   mongodb://localhost:27017
   ```
3. Нажмите "Connect"

### Просмотр данных

1. Выберите базу данных `realtime-messenger`
2. Просмотрите коллекции:
   - `users` - пользователи
   - `chats` - чаты
   - `messages` - сообщения
3. Кликните на коллекцию для просмотра документов
4. Используйте фильтры и поиск для навигации

**Преимущества:**
- ✅ Визуальный интерфейс
- ✅ Легко редактировать данные
- ✅ Поиск и фильтрация
- ✅ Просмотр индексов и статистики

---

## Способ 2: Командная строка (mongosh)

**Быстрый способ через терминал.**

### Подключение

```bash
mongosh
# или если установлен старый клиент
mongo
```

### Основные команды

```javascript
// Показать все базы данных
show dbs

// Выбрать базу данных
use realtime-messenger

// Показать все коллекции
show collections

// Найти всех пользователей
db.users.find()

// Найти пользователя по email
db.users.find({ email: "user@example.com" })

// Найти все чаты
db.chats.find()

// Найти чат по ID
db.chats.findOne({ _id: ObjectId("...") })

// Найти все сообщения
db.messages.find()

// Найти сообщения конкретного чата
db.messages.find({ chatId: ObjectId("...") })

// Красивый вывод (pretty print)
db.users.find().pretty()

// Подсчет документов
db.users.countDocuments()
db.chats.countDocuments()
db.messages.countDocuments()

// Последние 10 сообщений
db.messages.find().sort({ createdAt: -1 }).limit(10)

// Сообщения с информацией об авторе (populate)
db.messages.find().populate("authorId")
```

### Полезные запросы

```javascript
// Найти пользователя и его чаты
use realtime-messenger

// Пользователь по ID
const userId = ObjectId("...")
db.users.findOne({ _id: userId })

// Все чаты пользователя
db.chats.find({ members: userId })

// Все сообщения пользователя
db.messages.find({ authorId: userId })

// Статистика
db.users.countDocuments()  // Количество пользователей
db.chats.countDocuments()   // Количество чатов
db.messages.countDocuments() // Количество сообщений
```

---

## Способ 3: Studio 3T (альтернативный GUI)

**Мощный инструмент с дополнительными функциями.**

1. Скачайте: https://studio3t.com/download/
2. Установите и запустите
3. Подключитесь к `mongodb://localhost:27017`
4. Выберите базу `realtime-messenger`

**Преимущества:**
- ✅ Расширенные возможности запросов
- ✅ Визуальный query builder
- ✅ Импорт/экспорт данных
- ✅ Сравнение данных

---

## Способ 4: Веб-интерфейс (mongo-express)

**Просмотр через браузер.**

### Установка и запуск

```bash
# Установите mongo-express
npm install -g mongo-express

# Запустите (если MongoDB на localhost:27017)
mongo-express
```

Или через Docker:
```bash
docker run -it --rm \
  --network host \
  -e ME_CONFIG_MONGODB_URL="mongodb://localhost:27017/" \
  mongo-express
```

Откройте в браузере: http://localhost:8081

---

## Способ 5: Через код (Node.js скрипт)

**Для автоматизации и скриптов.**

Создайте файл `backend/scripts/view-db.js`:

```javascript
import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../src/models/User.js";
import Chat from "../src/models/Chat.js";
import Message from "../src/models/Message.js";

dotenv.config();

async function viewDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/realtime-messenger");
    console.log("✅ Подключено к MongoDB\n");

    // Пользователи
    const users = await User.find().select("-passwordHash");
    console.log(`👥 Пользователи (${users.length}):`);
    users.forEach((user) => {
      console.log(`  - ${user.name} (${user.email}) [ID: ${user._id}]`);
    });

    // Чаты
    const chats = await Chat.find().populate("members", "name email");
    console.log(`\n💬 Чаты (${chats.length}):`);
    chats.forEach((chat) => {
      console.log(`  - ${chat.title}`);
      console.log(`    Участники: ${chat.members.map((m) => m.name).join(", ")}`);
      console.log(`    ID: ${chat._id}`);
    });

    // Сообщения
    const messages = await Message.find()
      .populate("authorId", "name")
      .sort({ createdAt: -1 })
      .limit(10);
    console.log(`\n📨 Последние сообщения (${messages.length} из ${await Message.countDocuments()}):`);
    messages.forEach((msg) => {
      console.log(`  - ${msg.authorId.name}: ${msg.text.substring(0, 50)}...`);
      console.log(`    Чат: ${msg.chatId}, Время: ${msg.createdAt}`);
    });

    await mongoose.connection.close();
    console.log("\n✅ Готово!");
  } catch (error) {
    console.error("❌ Ошибка:", error);
    process.exit(1);
  }
}

viewDatabase();
```

Запуск:
```bash
cd backend
node scripts/view-db.js
```

---

## Быстрые команды для просмотра

### Через mongosh

```bash
# Подключиться
mongosh

# В MongoDB shell:
use realtime-messenger
db.users.find().pretty()
db.chats.find().pretty()
db.messages.find().sort({ createdAt: -1 }).limit(5).pretty()
```

### Через Docker (если используете Docker)

```bash
# Подключиться к MongoDB в контейнере
docker exec -it mongodb mongosh

# Или напрямую
docker exec -it mongodb mongosh realtime-messenger
```

---

## Рекомендации

- **Для начала**: Используйте **MongoDB Compass** - самый простой и наглядный способ
- **Для быстрого просмотра**: Используйте **mongosh** в терминале
- **Для разработки**: Используйте **Studio 3T** для расширенных возможностей
- **Для автоматизации**: Создайте скрипты на Node.js

---

## Полезные запросы для отладки

```javascript
// Очистить все данные (ОСТОРОЖНО!)
use realtime-messenger
db.users.deleteMany({})
db.chats.deleteMany({})
db.messages.deleteMany({})

// Найти пользователя по email
db.users.findOne({ email: "test@example.com" })

// Найти все чаты пользователя
db.chats.find({ members: ObjectId("USER_ID") })

// Найти все сообщения в чате
db.messages.find({ chatId: ObjectId("CHAT_ID") }).sort({ createdAt: 1 })

// Статистика по базе
db.stats()
```
