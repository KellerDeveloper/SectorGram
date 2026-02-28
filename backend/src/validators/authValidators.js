import { body } from "express-validator";
import { handleValidationErrors } from "../middleware/validationMiddleware.js";

export const registerValidation = [
  body("email").isEmail().withMessage("Некорректный email"),
  body("password")
    .isString()
    .isLength({ min: 6 })
    .withMessage("Пароль должен быть не короче 6 символов"),
  body("name").isString().trim().notEmpty().withMessage("Имя обязательно"),
  handleValidationErrors,
];

export const loginValidation = [
  body("email").isEmail().withMessage("Некорректный email"),
  body("password")
    .isString()
    .notEmpty()
    .withMessage("Пароль обязателен"),
  handleValidationErrors,
];

export const googleAuthValidation = [
  body("idToken").isString().notEmpty().withMessage("idToken от Google обязателен"),
  handleValidationErrors,
];

