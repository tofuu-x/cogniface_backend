import { Router } from "express";
import { createMajor, getAllMajors,getMajor, updateMajor } from "./major.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorizeRoles } from "../../middlewares/authorizeRoles.middleware.js";

const router = Router();

router.post(
  "/",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  createMajor
);


router.get(
  "/",
  authenticate,
  getAllMajors
);


router.get(
  "/:majorCode",
  authenticate,
  getMajor
);


router.patch(
  "/:majorCode",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  updateMajor
);

export default router;

