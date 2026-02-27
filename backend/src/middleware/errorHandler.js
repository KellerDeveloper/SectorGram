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

  // Базовое сообщение для клиента
  let message =
    typeof err === "string"
      ? err
      : err.message || "Внутренняя ошибка сервера";

  let validationErrors = null;

  // Детали валидации от express-validator (см. handleValidationErrors)
  if (Array.isArray(err.details) && err.details.length > 0) {
    validationErrors = err.details.map((e) => ({
      // path для новых версий express-validator, param — для старых
      field: e.path || e.param,
      message: e.msg,
      value: e.value,
      location: e.location,
    }));

    // Если общее сообщение слишком общее, берем текст первой конкретной ошибки
    if (message === "Ошибка валидации" && validationErrors[0]?.message) {
      message = validationErrors[0].message;
    }
  }

  const payload = {
    error: message,
  };

  if (validationErrors) {
    payload.validationErrors = validationErrors;
  }

  res.status(status).json(payload);
}

