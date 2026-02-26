import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
  create,
  getFeed,
  getByUser,
  markViewed,
  remove,
} from "../controllers/storyController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getFeed);
router.post("/", create);
router.get("/user/:userId", getByUser);
router.post("/:id/view", markViewed);
router.delete("/:id", remove);

export default router;
