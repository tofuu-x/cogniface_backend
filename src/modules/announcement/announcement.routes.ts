import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.middleware.js";
import {
  createAnnouncement,
  deleteAnnouncement,
  getClassAnnouncements,
  updateAnnouncement,
} from "./announcement.controller.js";

const router = Router();

router.post(
  "/classes/:classId",
  authenticate,
  authorizeRoles("LECTURER"),
  createAnnouncement
);

router.get(
  "/classes/:classId",
  authenticate,
  authorizeRoles("LECTURER", "STUDENT"),
  getClassAnnouncements
);

router.patch(
  "/:announcementId",
  authenticate,
  authorizeRoles("LECTURER"),
  updateAnnouncement
);

router.delete(
  "/:announcementId",
  authenticate,
  authorizeRoles("LECTURER"),
  deleteAnnouncement
);

export default router;
