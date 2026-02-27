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
  handleValidationErrors,
];

export const eventIdParamValidation = [
  param("id").isString().trim().notEmpty().withMessage("eventId обязателен"),
  handleValidationErrors,
];

