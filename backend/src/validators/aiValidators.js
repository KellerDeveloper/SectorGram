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
