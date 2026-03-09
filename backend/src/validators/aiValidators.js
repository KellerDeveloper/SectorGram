import { body } from "express-validator";
import { handleValidationErrors } from "../middleware/validationMiddleware.js";

/** POST /ai/suggest-event-description */
export const suggestEventDescriptionValidation = [
  body("title")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 300 })
    .withMessage("title не более 300 символов"),
  body("place")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage("place не более 500 символов"),
  body("draft")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("draft не более 2000 символов"),
  handleValidationErrors,
];

/** POST /ai/suggest-meeting-idea */
export const suggestMeetingIdeaValidation = [
  body("city")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage("city не более 100 символов"),
  body("exclude")
    .optional()
    .isArray({ max: 10 })
    .withMessage("exclude должен быть массивом строк")
    .custom((arr) =>
      arr.every((v) => typeof v === "string" && v.trim().length <= 200)
    )
    .withMessage("каждый элемент exclude — строка до 200 символов"),
  handleValidationErrors,
];

/** POST /ai/improve-text */
export const improveTextValidation = [
  body("text")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("text обязателен")
    .isLength({ max: 4000 })
    .withMessage("text не более 4000 символов"),
  handleValidationErrors,
];
