import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../../middlewares/authorizeRoles.middleware.js";
import {
  createLecturer,
  getAllLecturers,
  getLecturer,
  updateLecturer,
} from "./lecturer.controller.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  createLecturer
);

router.get(
  "/:lecturerId",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN", "LECTURER", "STUDENT"),
  getLecturer
);

router.patch(
  "/:lecturerId",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  updateLecturer
);

router.get(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  getAllLecturers
);

export default router;
