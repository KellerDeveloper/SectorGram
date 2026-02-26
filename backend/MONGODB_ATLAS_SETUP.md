# Подключение к MongoDB Atlas

MongoDB Atlas - это облачная база данных MongoDB. Бесплатный тариф M0 позволяет использовать 512MB хранилища.

## Шаг 1: Регистрация и создание кластера

1. **Перейдите на сайт MongoDB Atlas:**
   https://www.mongodb.com/cloud/atlas

2. **Зарегистрируйтесь** (или войдите, если уже есть аккаунт)

3. **Создайте бесплатный кластер:**
   - Нажмите "Build a Database"
   - Выберите **FREE (M0)** тариф
   - Выберите провайдера и регион (ближайший к вам)
   - Нажмите "Create"

4. **Дождитесь создания кластера** (обычно 1-3 минуты)

## Шаг 2: Настройка доступа

### 2.1. Создайте пользователя БД

1. В меню слева нажмите **"Database Access"**
2. Нажмите **"Add New Database User"**
3. Выберите **"Password"** метод аутентификации
4. Введите:
   - **Username**: `realtime-messenger-user` (или любое имя)
   - **Password**: придумайте надежный пароль (сохраните его!)
5. В разделе **"Database User Privileges"** выберите **"Read and write to any database"**
6. Нажмите **"Add User"**

### 2.2. Настройте сетевой доступ

1. В меню слева нажмите **"Network Access"**
2. Нажмите **"Add IP Address"**
3. Для разработки выберите **"Allow Access from Anywhere"** (0.0.0.0/0)
   - ⚠️ Для продакшена лучше указать конкретные IP адреса
4. Нажмите **"Confirm"**

## Шаг 3: Получение Connection String

1. Вернитесь на главную страницу кластера
2. Нажмите **"Connect"** на карточке вашего кластера
3. Выберите **"Connect your application"**
4. Выберите:
   - **Driver**: Node.js
   - **Version**: 5.5 or later
5. Скопируйте connection string - он будет выглядеть так:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

## Шаг 4: Настройка проекта

### 4.1. Обновите connection string

Замените `<username>` и `<password>` в скопированной строке на ваши данные:

```
mongodb+srv://realtime-messenger-user:ВАШ_ПАРОЛЬ@cluster0.xxxxx.mongodb.net/realtime-messenger?retryWrites=true&w=majority
```

**Важно:**
- Замените `realtime-messenger-user` на ваш username
- Замените `ВАШ_ПАРОЛЬ` на ваш пароль
- Добавьте `/realtime-messenger` перед `?` - это имя базы данных
- Если в пароле есть специальные символы (@, #, $ и т.д.), закодируйте их в URL-формате:
  - `@` → `%40`
  - `#` → `%23`
  - `$` → `%24`
  - `%` → `%25`

### 4.2. Обновите файл .env

Откройте файл `backend/.env` и обновите `MONGODB_URI`:

```env
# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://realtime-messenger-user:ВАШ_ПАРОЛЬ@cluster0.xxxxx.mongodb.net/realtime-messenger?retryWrites=true&w=majority

# JWT Secret
JWT_SECRET=dev-secret-change-me-in-production

# Server Port
PORT=4000
```

### 4.3. Пример правильного connection string

Если ваш username: `admin`, пароль: `MyP@ssw0rd#123`, кластер: `cluster0.abc123`

То connection string будет:
```
mongodb+srv://admin:MyP%40ssw0rd%23123@cluster0.abc123.mongodb.net/realtime-messenger?retryWrites=true&w=majority
```

Обратите внимание на кодировку:
- `@` → `%40`
- `#` → `%23`

## Шаг 5: Проверка подключения

1. **Запустите сервер:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Вы должны увидеть:**
   ```
   ✅ Подключено к MongoDB: mongodb+srv://...
   Backend listening on http://localhost:4000
   ```

3. **Если видите ошибку подключения:**
   - Проверьте правильность username и password
   - Убедитесь, что IP адрес добавлен в Network Access
   - Проверьте, что кластер создан и запущен
   - Проверьте кодировку специальных символов в пароле

## Шаг 6: Просмотр данных в Atlas

1. В MongoDB Atlas нажмите **"Browse Collections"**
2. Выберите базу данных `realtime-messenger`
3. Просматривайте коллекции:
   - `users`
   - `chats`
   - `messages`

## Полезные ссылки

- MongoDB Atlas Dashboard: https://cloud.mongodb.com/
- Документация: https://docs.atlas.mongodb.com/
- URL Encoder для паролей: https://www.urlencoder.org/

## Безопасность

⚠️ **Важно для продакшена:**

1. **Не коммитьте .env файл** в git (он уже в .gitignore)
2. **Используйте переменные окружения** на сервере
3. **Ограничьте IP адреса** в Network Access только нужными
4. **Используйте сильные пароли** для пользователя БД
5. **Регулярно обновляйте пароли**

## Решение проблем

### Ошибка: "authentication failed"

- Проверьте правильность username и password
- Убедитесь, что пользователь создан в Database Access
- Проверьте кодировку специальных символов в пароле

### Ошибка: "connection timeout"

- Проверьте, что ваш IP добавлен в Network Access
- Попробуйте добавить `0.0.0.0/0` для тестирования
- Проверьте, что кластер запущен (не приостановлен)

### Ошибка: "bad auth"

- Убедитесь, что в connection string правильный username
- Проверьте, что пароль закодирован правильно (особенно @, #, $, %)

### Кластер приостановлен

Бесплатные кластеры M0 автоматически приостанавливаются после 1 часа неактивности. Просто нажмите "Resume" в Atlas dashboard.

## Миграция с локальной MongoDB

Если у вас уже есть данные в локальной MongoDB:

1. **Экспортируйте данные:**
   ```bash
   mongodump --uri="mongodb://localhost:27017/realtime-messenger" --out=./backup
   ```

2. **Импортируйте в Atlas:**
   ```bash
   mongorestore --uri="mongodb+srv://username:password@cluster.mongodb.net/realtime-messenger" ./backup/realtime-messenger
   ```

Или используйте MongoDB Compass для экспорта/импорта через GUI.
