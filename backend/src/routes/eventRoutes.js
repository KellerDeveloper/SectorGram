import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  create,
  getAll,
  getOne,
  join,
  leave,
  cancel,
  update,
  downloadIcs,
} from "../controllers/eventController.js";
import {
  createEventValidation,
  eventIdParamValidation,
  updateEventValidation,
} from "../validators/eventValidators.js";

const router = express.Router();

// Публичный маршрут для скачивания .ics без авторизации
router.get("/:id/ics", eventIdParamValidation, downloadIcs);

router.use(authMiddleware);

router.get("/", getAll);
router.post("/", createEventValidation, create);
router.get("/:id", eventIdParamValidation, getOne);
router.post("/:id/join", eventIdParamValidation, join);
router.post("/:id/leave", eventIdParamValidation, leave);
router.post("/:id/cancel", eventIdParamValidation, cancel);
router.put("/:id", updateEventValidation, update);

export default router;

