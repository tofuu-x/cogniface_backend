import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.middleware.js";
import {
  getAdminDashboard,
  getLecturerDashboard,
  getStudentDashboard,
} from "./dashboard.controller.js";

const router = Router();

router.get(
  "/admin",
  authenticate,
  authorizeRoles("ADMIN","SUPER_ADMIN"),
  getAdminDashboard
)

//lecturer


router.get(
  "/lecturer",
  authenticate,
  authorizeRoles("LECTURER"),
  getLecturerDashboard
);

router.get(
  "/student",
  authenticate,
  authorizeRoles("STUDENT"),
  getStudentDashboard
);

export default router;
