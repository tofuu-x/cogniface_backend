import type { Request, Response } from "express";
import { AppError } from "../../utils/appError.js";
import {
  createAnnouncementService,
  deleteAnnouncementService,
  getClassAnnouncementsService,
  updateAnnouncementService,
} from "./announcement.service.js";

export const createAnnouncement = async (
  req: Request<
    { classId: string },
    {},
    { title?: unknown; body?: unknown }
  >,
  res: Response
) => {
  if (!req.user) {
    throw new AppError("Authenticated user missing", 401);
  }

  const announcement = await createAnnouncementService(
    req.user.userId,
    req.params.classId,
    req.body
  );

  return res.status(201).json({
    success: true,
    message: "Announcement created successfully",
    announcement,
  });
};

export const getClassAnnouncements = async (
  req: Request<{ classId: string }>,
  res: Response
) => {
  if (!req.user) {
    throw new AppError("Authenticated user missing", 401);
  }

  if (req.user.role !== "LECTURER" && req.user.role !== "STUDENT") {
    throw new AppError("You are not authorized to access this resource", 403);
  }

  const announcements = await getClassAnnouncementsService(
    req.params.classId,
    {
      userId: req.user.userId,
      role: req.user.role,
    }
  );

  return res.status(200).json({
    success: true,
    count: announcements.length,
    announcements,
  });
};

export const updateAnnouncement = async (
  req: Request<
    { announcementId: string },
    {},
    { title?: unknown; body?: unknown }
  >,
  res: Response
) => {
  if (!req.user) {
    throw new AppError("Authenticated user missing", 401);
  }

  const announcement = await updateAnnouncementService(
    req.user.userId,
    req.params.announcementId,
    req.body
  );

  return res.status(200).json({
    success: true,
    message: "Announcement updated successfully",
    announcement,
  });
};

export const deleteAnnouncement = async (
  req: Request<{ announcementId: string }>,
  res: Response
) => {
  if (!req.user) {
    throw new AppError("Authenticated user missing", 401);
  }

  const announcement = await deleteAnnouncementService(
    req.user.userId,
    req.params.announcementId
  );

  return res.status(200).json({
    success: true,
    message: "Announcement deleted successfully",
    announcement,
  });
};
