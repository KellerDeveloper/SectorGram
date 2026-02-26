# Быстрое подключение к MongoDB Atlas

## За 5 минут

### 1. Создайте аккаунт и кластер (2 мин)

1. Перейдите: https://www.mongodb.com/cloud/atlas
2. Зарегистрируйтесь
3. Создайте бесплатный кластер (M0)
4. Дождитесь создания (1-2 минуты)

### 2. Настройте доступ (1 мин)

**Database Access:**
- Username: `admin` (или любое имя)
- Password: придумайте пароль (сохраните!)
- Privileges: Read and write to any database

**Network Access:**
- Добавьте IP: `0.0.0.0/0` (для разработки)

### 3. Получите Connection String (1 мин)

1. Нажмите "Connect" на кластере
2. Выберите "Connect your application"
3. Скопируйте строку подключения

### 4. Обновите .env (1 мин)

Откройте `backend/.env` и замените:

```env
MONGODB_URI=mongodb+srv://admin:ВАШ_ПАРОЛЬ@cluster0.xxxxx.mongodb.net/realtime-messenger?retryWrites=true&w=majority
```

**Важно:**
- Замените `admin` на ваш username
- Замените `ВАШ_ПАРОЛЬ` на ваш пароль
- Замените `cluster0.xxxxx` на ваш кластер
- Если в пароле есть `@`, `#`, `$`, `%` - закодируйте их:
  - `@` → `%40`
  - `#` → `%23`
  - `$` → `%24`
  - `%` → `%25`

### 5. Запустите сервер

```bash
cd backend
npm run dev
```

Должно показать:
```
✅ Подключено к MongoDB: mongodb+srv://...
```

## Готово! 🎉

Теперь ваша БД в облаке и доступна откуда угодно!

## Примеры connection string

**Простой пароль:**
```
MONGODB_URI=mongodb+srv://admin:mypassword123@cluster0.abc123.mongodb.net/realtime-messenger?retryWrites=true&w=majority
```

**Пароль со специальными символами:**
Если пароль: `MyP@ss#123`
То connection string:
```
MONGODB_URI=mongodb+srv://admin:MyP%40ss%23123@cluster0.abc123.mongodb.net/realtime-messenger?retryWrites=true&w=majority
```

## Просмотр данных

В MongoDB Atlas:
1. Нажмите "Browse Collections"
2. Выберите базу `realtime-messenger`
3. Просматривайте коллекции

## Проблемы?

См. подробную инструкцию: [MONGODB_ATLAS_SETUP.md](./MONGODB_ATLAS_SETUP.md)
