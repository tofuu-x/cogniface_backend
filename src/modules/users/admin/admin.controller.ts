import type {
  Request,
  Response,
} from "express";

import {
  createAdminService,
  getAdminService,
  getAllAdminsService,
  updateAdminService,
} from "./admin.service.js";

import type {
  CreateAdminRequest,
  UpdateAdminRequest,
} from "./admin.types.js";
import { sendAdminTriggeredPasswordReset } from "../../../services/password.service.js";


export const createAdmin = async (
  req: Request<
    {},
    {},
    CreateAdminRequest
  >,
  res: Response
) => {
  const admin =
    await createAdminService(
      req.body
    );

  return res.status(201).json({
    success: true,
    message:
      "Admin created successfully",
    admin,
  });
};


export const getAdmin = async (
  req: Request<{
    adminId: string;
  }>,
  res: Response
) => {
  if (!req.user) {
    throw new Error(
      "Authenticated user missing"
    );
  }

  const admin =
    await getAdminService(
      req.params.adminId,
      {
        userId: req.user.userId,
        role: req.user.role,
      }
    );

  return res.status(200).json({
    success: true,
    admin,
  });
};


export const getAllAdmins = async (
  _req: Request,
  res: Response
) => {
  const admins =
    await getAllAdminsService();

  return res.status(200).json({
    success: true,
    count: admins.length,
    admins,
  });
};


export const updateAdmin = async (
  req: Request<
    { adminId: string },
    {},
    UpdateAdminRequest
  >,
  res: Response
) => {
  if (!req.user) {
    throw new Error(
      "Authenticated user missing"
    );
  }

  const admin =
    await updateAdminService(
      req.params.adminId,
      req.body,
      {
        userId: req.user.userId,
        role: req.user.role,
      }
    );

  return res.status(200).json({
    success: true,
    message:
      "Admin updated successfully",
    admin,
  });
};

export const sendAdminPasswordResetEmail = async(req: Request, res: Response) => {
  const adminId = req.params.adminId as string;

  await sendAdminTriggeredPasswordReset(
    adminId,
    "ADMIN",
    req.user!.userId
  );

  return res.status(200).json({
    message: "Password reset email sent successfully.",
  });


}