# Быстрый старт — Backend

## Требования

- **Node.js** 18+ ([скачать](https://nodejs.org/))
- **npm** (идёт с Node.js)
- **MongoDB** (локально или [Atlas](https://www.mongodb.com/cloud/atlas))

Проверка:
```bash
node --version   # v18+
npm --version    # 9+
```

> ⚠️ **npm не найден** — см. [INSTALL_NODE.md](./INSTALL_NODE.md)

---

## Запуск backend

```bash
cd backend
npm install
npm run dev
```

Сервер: `http://localhost:4000`

Перед первым запуском создайте `backend/.env` из `backend/.env.example` (MongoDB, JWT_SECRET, PORT, CORS).

---

## Структура проекта

```
sector/
├── backend/           # Node.js API + Socket.io
│   ├── src/
│   │   ├── server.js
│   │   ├── app.js
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── socket/
│   │   └── config/
│   └── package.json
├── README.md
└── QUICKSTART.md
```

---

## Тесты

```bash
cd backend
npm test
```

---

## Остановка

В терминале backend: **Ctrl+C**.
