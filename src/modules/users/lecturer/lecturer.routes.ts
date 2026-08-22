import { Router } from "express";
import { authenticate } from "../../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../../middlewares/authorizeRoles.middleware.js";
import { createLecturer } from "./lecturer.controller.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("ADMIN", "SUPER_ADMIN"),
  createLecturer
)

export default router;
