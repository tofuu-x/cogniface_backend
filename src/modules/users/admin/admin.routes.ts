import { Router } from "express";

import {
  createAdmin,
  getAdmin,
  getAllAdmins,
  updateAdmin,
} from "./admin.controller.js";

import { authenticate } from "../../../middlewares/auth.middleware.js";

import { authorizeRoles } from "../../../middlewares/authorizeRoles.middleware.js";

const router = Router();


// Create normal Admin
// SUPER_ADMIN only
router.post(
  "/",
  authenticate,
  authorizeRoles(
    "SUPER_ADMIN"
  ),
  createAdmin
);


// List all admins
// SUPER_ADMIN only
router.get(
  "/",
  authenticate,
  authorizeRoles(
    "SUPER_ADMIN"
  ),
  getAllAdmins
);


// Get one admin
// Super Admin can view anyone.
// Normal Admin can only view themselves.
router.get(
  "/:adminId",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  getAdmin
);


// Update admin
// Super Admin can update anyone.
// Normal Admin can only update themselves.
router.patch(
  "/:adminId",
  authenticate,
  authorizeRoles(
    "ADMIN",
    "SUPER_ADMIN"
  ),
  updateAdmin
);


export default router;