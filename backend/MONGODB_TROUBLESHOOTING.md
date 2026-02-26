# Решение проблем с установкой MongoDB

## Проблема: Command Line Tools не поддерживают macOS 26

Если вы получили ошибку:
```
Error: Your Command Line Tools (CLT) does not support macOS 26.
```

## Решение 1: Обновить Command Line Tools (рекомендуется)

1. **Откройте System Settings (Настройки системы)**
2. **Перейдите в Software Update (Обновление ПО)**
3. **Проверьте наличие обновлений для Command Line Tools**
4. **Установите обновления**

Или через терминал:
```bash
sudo rm -rf /Library/Developer/CommandLineTools
sudo xcode-select --install
```

Следуйте инструкциям в появившемся окне.

## Решение 2: Использовать Docker (самый простой способ)

Если обновление CLT не помогает, используйте Docker:

### Установите Docker Desktop
1. Скачайте с https://www.docker.com/products/docker-desktop/
2. Установите и запустите Docker Desktop

### Запустите MongoDB в Docker
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb-data:/data/db \
  mongo:latest
```

### Проверьте, что MongoDB работает
```bash
docker ps
# Должен показать контейнер mongodb
```

### Остановка MongoDB
```bash
docker stop mongodb
```

### Запуск MongoDB
```bash
docker start mongodb
```

## Решение 3: Использовать MongoDB Atlas (облачная БД)

Бесплатный вариант без установки:

1. Зарегистрируйтесь на https://www.mongodb.com/cloud/atlas
2. Создайте бесплатный кластер (M0)
3. Получите connection string
4. Обновите `.env` файл:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/realtime-messenger?retryWrites=true&w=majority
```

## Решение 4: Использовать официальный установщик

1. Перейдите на https://www.mongodb.com/try/download/community
2. Выберите macOS и скачайте установщик
3. Запустите установщик
4. Следуйте инструкциям

После установки запустите MongoDB:
```bash
brew services start mongodb-community
```

## Проверка работы MongoDB

После установки любым способом проверьте подключение:

```bash
mongosh
# или
mongo
```

Если команда работает - MongoDB установлен правильно!

## Настройка проекта

После установки MongoDB обновите `.env` файл в `backend/`:

```env
MONGODB_URI=mongodb://localhost:27017/realtime-messenger
JWT_SECRET=your-secret-key
PORT=4000
```

Затем запустите сервер:
```bash
cd backend
npm install
npm run dev
```

## Рекомендация

Для быстрого старта рекомендую **Решение 2 (Docker)** - это самый простой способ без проблем с Command Line Tools.
