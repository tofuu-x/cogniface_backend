import { Router } from "express";

import {
  createAttendanceSession,
  markManualAttendance,
  closeAttendanceSession,
  getAttendanceSession,
  getMyAttendance,
  getMyAttendanceSessions,
} from "./attendance.controller.js";

import {
  authenticate,
} from "../../middlewares/auth.middleware.js";

import {
  authorizeRoles,
} from "../../middlewares/authorizeRoles.middleware.js";


const router = Router();


// --------------------------------------------------
// STUDENT
// --------------------------------------------------

router.get(
  "/my",
  authenticate,
  authorizeRoles(
    "STUDENT"
  ),
  getMyAttendance
);


// --------------------------------------------------
// LECTURER
// --------------------------------------------------

// Lecturer attendance-session history
router.get(
  "/sessions/my",
  authenticate,
  authorizeRoles(
    "LECTURER"
  ),
  getMyAttendanceSessions
);


// Start attendance session
router.post(
  "/sessions",
  authenticate,
  authorizeRoles(
    "LECTURER"
  ),
  createAttendanceSession
);


// Manual attendance
router.patch(
  "/sessions/:sessionId/students/:studentId",
  authenticate,
  authorizeRoles(
    "LECTURER"
  ),
  markManualAttendance
);


// Close session
router.patch(
  "/sessions/:sessionId/close",
  authenticate,
  authorizeRoles(
    "LECTURER"
  ),
  closeAttendanceSession
);


// Admin/Super Admin/Lecturer can inspect session
router.get(
  "/sessions/:sessionId",
  authenticate,
  authorizeRoles(
    "LECTURER",
    "ADMIN",
    "SUPER_ADMIN"
  ),
  getAttendanceSession
);


export default router;