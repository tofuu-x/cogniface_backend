import { Router } from "express";

import {
  createAttendanceSession,
  correctClosedAttendance,
  markManualAttendance,
  closeAttendanceSession,
  getAttendanceSession,
  getMyAttendance,
  getMyAttendanceSessions,
  processRecognitionFrame,
} from "./attendance.controller.js";
import { uploadRecognitionFrame } from "../face/face.upload.js";

import {
  authenticate,
} from "../../middlewares/auth.middleware.js";

import {
  authorizeRoles,
} from "../../middlewares/authorizeRoles.middleware.js";


const router = Router();



// STUDENT


router.get(
  "/my",
  authenticate,
  authorizeRoles(
    "STUDENT"
  ),
  getMyAttendance
);



// LECTURER


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

router.post(
  "/sessions/:sessionId/frames",
  authenticate,
  authorizeRoles("LECTURER"),
  uploadRecognitionFrame,
  processRecognitionFrame,
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


// Correct attendance after session closure
router.patch(
  "/sessions/:sessionId/students/:studentId/corrections",
  authenticate,
  authorizeRoles(
    "LECTURER",
    "ADMIN",
    "SUPER_ADMIN"
  ),
  correctClosedAttendance
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
