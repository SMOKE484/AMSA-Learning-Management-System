import express from "express";
import {
  createStudent,
  createTutor,
  listStudents,
  listTutors,
  deleteUser,
  createParent, 
  linkParentToStudent, 
  listParents, 
  getAllMarks,
  deleteMark,
  updateMark,
  getParentWithStudents 
} from "../controllers/adminController.js";
import { authenticate, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/students", createStudent);
router.post("/tutors", createTutor);
router.post("/parents", createParent); 
router.post("/students/:studentId/link-parent", linkParentToStudent);
router.get("/parents", listParents);
router.get("/parents/:parentId", getParentWithStudents); 

router.get("/students", listStudents);
router.get("/tutors", listTutors);
router.delete("/users/:userId", deleteUser);

router.get("/marks", getAllMarks); 
router.delete("/marks/:markId", deleteMark);
router.put("/marks/:markId", updateMark);



export default router;