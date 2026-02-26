import { body, param } from "express-validator";
import { handleValidationErrors } from "../middleware/validationMiddleware.js";

export const createChatValidation = [
  body("title").isString().trim().notEmpty().withMessage("title обязателен"),
  body("memberIds")
    .optional()
    .isArray()
    .withMessage("memberIds должен быть массивом строк"),
  handleValidationErrors,
];

export const privateChatValidation = [
  body("userId")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("userId обязателен"),
  handleValidationErrors,
];

export const chatIdParamValidation = [
  param("id").isString().trim().notEmpty().withMessage("chatId обязателен"),
  handleValidationErrors,
];

export const editMessageValidation = [
  param("id").isString().trim().notEmpty().withMessage("messageId обязателен"),
  body("text")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Текст сообщения обязателен"),
  handleValidationErrors,
];

