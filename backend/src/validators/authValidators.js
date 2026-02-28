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
  body("id_token")
    .optional()
    .isString()
    .notEmpty()
    .withMessage("id_token должен быть непустой строкой"),
  body("idToken")
    .optional()
    .isString()
    .notEmpty()
    .withMessage("idToken должен быть непустой строкой"),
  body().custom((value, { req }) => {
    const token = req.body?.id_token || req.body?.idToken;
    if (!token) {
      throw new Error("В теле запроса нужен id_token или idToken (JWT от Google)");
    }
    return true;
  }),
  handleValidationErrors,
];

