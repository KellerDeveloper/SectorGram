import { body } from "express-validator";
import { handleValidationErrors } from "../middleware/validationMiddleware.js";

export const registerPushTokenValidation = [
  body("expoPushToken")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("expoPushToken обязателен"),
  handleValidationErrors,
];

