import { Router } from "express";

import {
  createCourse,
  getCourse,
  getAllCourses,
  updateCourse,
  deleteCourse,
  archiveCourse,
  unarchiveCourse,
} from "./course.controller.js";

import {
  authenticate,
} from "../../middlewares/auth.middleware.js";

import {
  authorizeRoles,
} from "../../middlewares/authorizeRoles.middleware.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  createCourse
);

router.get(
  "/",
  authenticate,
  getAllCourses
);

router.get(
  "/:courseCode",
  authenticate,
  getCourse
);


router.patch(
  "/:courseCode",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  updateCourse
);


router.patch(
  "/:courseCode/archive",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  archiveCourse
);

router.patch(
  "/:courseCode/unarchive",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  unarchiveCourse
);

router.delete(
  "/:courseCode",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  deleteCourse
);

export default router;
