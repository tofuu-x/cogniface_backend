import { Router } from "express";

import {
  createEnrollment,
  getMyEnrollments,
  dropEnrollment,
} from "./enrollment.controller.js";

import {
  authenticate,
} from "../../middlewares/auth.middleware.js";

import {
  authorizeRoles,
} from "../../middlewares/authorizeRoles.middleware.js";


const router = Router();


// Student enrolls into a class
router.post(
  "/",
  authenticate,
  authorizeRoles(
    "STUDENT"
  ),
  createEnrollment
);


// Student sees their own enrollment history
router.get(
  "/my",
  authenticate,
  authorizeRoles(
    "STUDENT"
  ),
  getMyEnrollments
);


// Student drops an enrollment
router.patch(
  "/:enrollmentId/drop",
  authenticate,
  authorizeRoles(
    "STUDENT"
  ),
  dropEnrollment
);


export default router;