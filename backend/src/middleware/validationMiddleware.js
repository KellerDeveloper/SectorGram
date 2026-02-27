import { validationResult } from "express-validator";

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const list = errors.array();
    const first = list[0];

    // Сообщение самой ошибки сразу делаем человекочитаемым
    const err = new Error(first.msg);
    err.status = 400;
    err.details = list;

    return next(err);
  }

  next();
}

