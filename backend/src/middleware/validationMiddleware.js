import { validationResult } from "express-validator";

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const error = new Error("Ошибка валидации");
  error.status = 400;
  error.details = errors.array();
  return next(error);
}

