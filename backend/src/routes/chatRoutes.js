import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  getChats,
  createChat,
  createOrGetPrivateChat,
  getMessages,
  editMessage,
} from "../controllers/chatController.js";
import {
  createChatValidation,
  privateChatValidation,
  chatIdParamValidation,
  editMessageValidation,
} from "../validators/chatValidators.js";

const router = express.Router();

router.use(authMiddleware);

// GET /chats
router.get("/", getChats);

// POST /chats
router.post("/", createChatValidation, createChat);

// POST /chats/private
router.post("/private", privateChatValidation, createOrGetPrivateChat);

// GET /chats/:id/messages
router.get("/:id/messages", chatIdParamValidation, getMessages);

// PUT /messages/:id
router.put("/messages/:id", editMessageValidation, editMessage);

export default router;


