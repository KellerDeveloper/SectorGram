import { body, param } from "express-validator";
import { handleValidationErrors } from "../middleware/validationMiddleware.js";

export const createEventValidation = [
  body("title").isString().trim().notEmpty().withMessage("title обязателен"),
  body("place").isString().trim().notEmpty().withMessage("place обязателен"),
  body("startsAt")
    .isISO8601()
    .withMessage("startsAt должен быть валидной датой в ISO-формате"),
  body("endsAt")
    .optional()
    .isISO8601()
    .withMessage("endsAt должен быть валидной датой в ISO-формате"),
  body("description").optional().isString().trim(),
  body("coverImage").optional().isString().trim(),
  body("location")
    .optional()
    .isObject()
    .withMessage("location должен быть объектом"),
  body("location.latitude")
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage("location.latitude должен быть числом от -90 до 90"),
  body("location.longitude")
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage("location.longitude должен быть числом от -180 до 180"),
  handleValidationErrors,
];

export const eventIdParamValidation = [
  param("id").isString().trim().notEmpty().withMessage("eventId обязателен"),
  handleValidationErrors,
];

