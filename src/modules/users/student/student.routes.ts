import { Router } from "express";

import { authenticate } from "../../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../../middlewares/authorizeRoles.middleware.js";

import { createStudent,
  deleteStudent,
  setStudentAccountStatus,
  updateStudent,
  getStudent,
  getAllStudents,
  sendStudentPasswordResetEmail
 } from "./student.controller.js";

const router = Router();

//Create student
router.post(
  "/",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  createStudent
);

router.get(
  "/",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  getAllStudents
);

router.get(
  "/:studentId",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN",
    "LECTURER",
    "STUDENT"
  ),
  getStudent
);

router.patch(
  "/:studentId",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  updateStudent
);

router.patch(
  "/:studentId/status",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  setStudentAccountStatus
);

router.delete(
  "/:studentId",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  deleteStudent
);

router.post(
  "/:studentUserId/password-reset",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  sendStudentPasswordResetEmail
);



export default router;
