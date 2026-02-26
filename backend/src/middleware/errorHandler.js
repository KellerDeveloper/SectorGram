// Централизованный обработчик ошибок Express.
// Ожидает, что контроллеры либо:
// - возвращают ответ сами и вызывают next(err) при ошибке
// - пробрасывают исключения (async/await), которые перехватываются express.

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  console.error("Unhandled error:", err);

  if (res.headersSent) {
    return;
  }

  const status = err.status || err.statusCode || 500;

  // Если ошибка уже содержит безопасное для клиента сообщение
  const message =
    typeof err === "string"
      ? err
      : err.message || "Внутренняя ошибка сервера";

  res.status(status).json({ error: message });
}

