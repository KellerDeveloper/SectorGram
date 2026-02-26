# Установка зависимостей и запуск Backend

## Шаг 1: Установите MongoDB

См. [MONGODB_SETUP.md](./MONGODB_SETUP.md) для подробных инструкций.

**Быстрая установка (macOS):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

## Шаг 2: Установите зависимости Node.js

```bash
cd backend
npm install
```

Это установит:
- mongoose - для работы с MongoDB
- dotenv - для переменных окружения
- express, socket.io, jwt, bcryptjs и другие зависимости

## Шаг 3: Настройте переменные окружения

Создайте файл `.env` в папке `backend`:

```bash
cp .env.example .env
```

Или создайте вручную с содержимым:
```
MONGODB_URI=mongodb://localhost:27017/realtime-messenger
JWT_SECRET=your-secret-key-change-this
PORT=4000
```

## Шаг 4: Запустите сервер

```bash
npm run dev
```

Вы должны увидеть:
```
✅ Подключено к MongoDB: mongodb://localhost:27017/realtime-messenger
Backend listening on http://localhost:4000
```

## Готово! 🎉

Сервер готов к работе. Теперь можно запускать frontend приложение.

## Решение проблем

### Ошибка подключения к MongoDB

1. Убедитесь, что MongoDB запущен:
   ```bash
   brew services list
   ```

2. Проверьте URI в `.env` файле

3. Попробуйте подключиться вручную:
   ```bash
   mongosh
   ```

### Ошибки при установке зависимостей

```bash
rm -rf node_modules package-lock.json
npm install
```

### Порт уже занят

Измените `PORT` в `.env` файле на другой порт (например, 4001).
