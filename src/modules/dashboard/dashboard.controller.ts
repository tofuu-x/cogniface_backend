import type { Request, Response } from "express";

import { AppError } from "../../utils/appError.js";

import { getAdminDashboardService, getLecturerDashboardService } from "./dashboard.service.js";

//Admin Dashboard
export const getAdminDashboard = async (
  req: Request,
  res : Response
) => {
  const dashboard = await getAdminDashboardService();

  res.status(200).json({
    success: true,
    dashboard,
  });
};

// Lecturer Dashboard

export const getLecturerDashboard = async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    throw new AppError("Authentication required", 401);
  }

  const dashboard = await getLecturerDashboardService(
    req.user.userId
  );

  res.status(200).json({
    success: true,
    dashboard,
  });
};