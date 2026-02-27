import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  create,
  getAll,
  getOne,
  join,
  leave,
} from "../controllers/eventController.js";
import {
  createEventValidation,
  eventIdParamValidation,
} from "../validators/eventValidators.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getAll);
router.post("/", createEventValidation, create);
router.get("/:id", eventIdParamValidation, getOne);
router.post("/:id/join", eventIdParamValidation, join);
router.post("/:id/leave", eventIdParamValidation, leave);

export default router;

