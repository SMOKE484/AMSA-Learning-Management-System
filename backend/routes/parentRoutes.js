import express from "express";
import {
  getMyProfile,
  getMyChildren,
  getMyChildrenMarks,
} from "../controllers/parentController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";
import { cache } from "../middleware/cacheMiddleware.js";

const router = express.Router();

// All parent routes require authentication and "parent" role
router.use(authenticate);
router.use(authorize("parent"));

router.get("/me", cache(300), getMyProfile);
router.get("/me/children", cache(300), getMyChildren);
router.get("/me/marks", cache(300), getMyChildrenMarks); // The endpoint you want

export default router;