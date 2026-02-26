import { query } from "express-validator";
import { handleValidationErrors } from "../middleware/validationMiddleware.js";

export const userSearchValidation = [
  query("q")
    .isString()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Строка поиска должна содержать минимум 2 символа"),
  handleValidationErrors,
];

