import { Router } from "express";

import {
  createClass,
  getClass,
  getAllClasses,
  getMyCurrentClasses,
  getMyClassHistory,
  getAvailableClasses,
  updateClass,
  deleteClass,
  getClassStudents
} from "./class.controller.js";

import {
  authenticate,
} from "../../middlewares/auth.middleware.js";

import {
  authorizeRoles,
} from "../../middlewares/authorizeRoles.middleware.js";


const router = Router();


// ADMIN / SUPER ADMIN
// Create class
router.post(
  "/",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  createClass
);


// ADMIN / SUPER ADMIN
// All historical + current classes
router.get(
  "/",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  getAllClasses
);


// LECTURER
// Current classes only
router.get(
  "/my",
  authenticate,
  authorizeRoles(
    "LECTURER"
  ),
  getMyCurrentClasses
);


// LECTURER
// Previous classes
router.get(
  "/my/history",
  authenticate,
  authorizeRoles(
    "LECTURER"
  ),
  getMyClassHistory
);


// STUDENT
// Current classes available for enrollment
router.get(
  "/available",
  authenticate,
  authorizeRoles(
    "STUDENT"
  ),
  getAvailableClasses
);


// Get one class
router.get(
  "/:id",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN",
    "LECTURER",
    "STUDENT"
  ),
  getClass
);


// ADMIN / SUPER ADMIN
router.patch(
  "/:id",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  updateClass
);


// ADMIN / SUPER ADMIN
router.delete(
  "/:id",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  deleteClass
);

router.get(
  "/:classId/students",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN",
    "LECTURER"
  ),
  getClassStudents
);


export default router;