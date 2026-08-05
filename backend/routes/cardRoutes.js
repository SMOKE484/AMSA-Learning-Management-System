import express from "express";
import { enrollCard, getCardForStudent, revokeCard, listCards } from "../controllers/cardController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(authenticate);
router.use(authorize("admin"));

router.post("/enroll", enrollCard);
router.get("/student/:studentId", getCardForStudent);
router.patch("/:cardId/revoke", revokeCard);
router.get("/", listCards);

export default router;
