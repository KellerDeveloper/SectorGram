# Настройка MongoDB

> ⚠️ **Если получили ошибку с Command Line Tools** - см. [MONGODB_TROUBLESHOOTING.md](./MONGODB_TROUBLESHOOTING.md)

## Установка MongoDB

### Вариант 1: Docker (рекомендуется, если проблемы с Homebrew)

**Самый простой способ без проблем с зависимостями:**

```bash
# Установите Docker Desktop с https://www.docker.com/products/docker-desktop/

# Запустите MongoDB в Docker
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb-data:/data/db \
  mongo:latest

# Проверьте статус
docker ps

# Остановка
docker stop mongodb

# Запуск
docker start mongodb
```

### Вариант 2: macOS (через Homebrew)

```bash
# Установите MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Запустите MongoDB
brew services start mongodb-community

# Проверьте статус
brew services list
```

> ⚠️ Если получили ошибку с Command Line Tools - используйте Docker или MongoDB Atlas

### Вариант 3: MongoDB Atlas (облачная БД, без установки)

1. Зарегистрируйтесь на https://www.mongodb.com/cloud/atlas
2. Создайте бесплатный кластер (M0)
3. Получите connection string
4. Обновите `.env` файл (см. ниже)

### Вариант 4: Официальный установщик

1. Скачайте с https://www.mongodb.com/try/download/community
2. Запустите установщик
3. Следуйте инструкциям

## Проверка подключения

После установки MongoDB должен быть доступен на `mongodb://localhost:27017`

Проверьте подключение:
```bash
mongosh
# или
mongo
```

Если команда работает - MongoDB установлен правильно!

## Настройка проекта

1. **Скопируйте файл .env.example в .env:**
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Или создайте .env вручную** с содержимым:
   ```
   MONGODB_URI=mongodb://localhost:27017/realtime-messenger
   JWT_SECRET=your-secret-key-here
   PORT=4000
   ```

3. **Запустите сервер:**
   ```bash
   npm install
   npm run dev
   ```

Сервер автоматически подключится к MongoDB и создаст базу данных `realtime-messenger`.

## Использование MongoDB Atlas (облачная БД) ⭐ РЕКОМЕНДУЕТСЯ

**Лучший вариант для начала** - не требует установки MongoDB локально!

📖 **Подробная инструкция**: см. [MONGODB_ATLAS_SETUP.md](./MONGODB_ATLAS_SETUP.md)

**Быстрый старт:**

1. Зарегистрируйтесь на https://www.mongodb.com/cloud/atlas
2. Создайте бесплатный кластер (M0)
3. Настройте пользователя БД и сетевой доступ
4. Получите connection string
5. Обновите `MONGODB_URI` в `.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/realtime-messenger?retryWrites=true&w=majority
   ```

**Преимущества Atlas:**
- ✅ Не нужно устанавливать MongoDB локально
- ✅ Работает из любой точки мира
- ✅ Бесплатный тариф (512MB)
- ✅ Автоматические бэкапы
- ✅ Мониторинг и аналитика

## Структура базы данных

После первого запуска будут созданы коллекции:

- **users** - пользователи системы
- **chats** - чаты
- **messages** - сообщения

## Полезные команды MongoDB

```bash
# Подключиться к MongoDB
mongosh

# Показать все базы данных
show dbs

# Использовать базу данных
use realtime-messenger

# Показать коллекции
show collections

# Найти всех пользователей
db.users.find()

# Найти все чаты
db.chats.find()

# Найти все сообщения
db.messages.find()
```

## Решение проблем

### Ошибка с Command Line Tools (macOS 26)

Если получили ошибку:
```
Error: Your Command Line Tools (CLT) does not support macOS 26.
```

**Решение:** Используйте Docker (Вариант 1) или MongoDB Atlas (Вариант 3).  
Подробности: [MONGODB_TROUBLESHOOTING.md](./MONGODB_TROUBLESHOOTING.md)

### MongoDB не запускается

**Для Homebrew:**
```bash
# Проверьте статус
brew services list

# Перезапустите
brew services restart mongodb-community

# Проверьте логи
tail -f /usr/local/var/log/mongodb/mongo.log
```

**Для Docker:**
```bash
# Проверьте статус
docker ps

# Перезапустите
docker restart mongodb

# Просмотр логов
docker logs mongodb
```

### Ошибка подключения

1. Убедитесь, что MongoDB запущен:
   - Homebrew: `brew services list`
   - Docker: `docker ps`
2. Проверьте порт: `lsof -i :27017`
3. Проверьте URI в `.env` файле

### Очистка базы данных

```bash
mongosh
use realtime-messenger
db.dropDatabase()
```
