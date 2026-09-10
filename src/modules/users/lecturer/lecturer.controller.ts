import type { Request, Response } from "express";

import {
  createLecturerService,
  deleteLecturerService,
  getAllLecturersService,
  getLecturerService,
  setLecturerAccountStatusService,
  updateLecturerService,
} from "./lecturer.service.js";

import type {
  CreateLecturerRequest,
  UpdateLecturerRequest
} from "./lecturer.types.js";
import { sendAdminTriggeredPasswordReset } from "../../../services/password.service.js";


export const createLecturer = async (
  req: Request<{}, {}, CreateLecturerRequest>,
  res: Response
) => {
  const lecturer = await createLecturerService(
    req.body
  );

  return res.status(201).json({
    success: true,

    message: "Lecturer created successfully",

    lecturer,
  });
};

export const getLecturer = async (
  req: Request<{ lecturerId: string }>,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const lecturer = await getLecturerService(
    req.params.lecturerId,
    {
      userId: req.user.userId,
      role: req.user.role,
    }
  );

  return res.status(200).json({
    success: true,
    lecturer,
  });
};

export const updateLecturer = async (
  req: Request<
    { lecturerId: string },
    {},
    UpdateLecturerRequest
  >,
  res: Response
) => {
  const lecturer = await updateLecturerService(
    req.params.lecturerId,
    req.body
  );

  return res.status(200).json({
    success: true,
    message: "Lecturer updated successfully",
    lecturer,
  });
};

export const getAllLecturers = async(
  _req: Request,
  res: Response
) => {
  const lecturers = await getAllLecturersService();

  return res.status(200).json({
    success: true,
    count: lecturers.length,
    lecturers,
  });
};

export const deleteLecturer = async (
  req: Request<{ lecturerId: string }>,
  res: Response
) => {
  const lecturer = await deleteLecturerService(
    req.params.lecturerId
  );

  return res.status(200).json({
    success: true,
    message: "Lecturer deleted successfully",
    lecturer,
  });
};

export const setLecturerAccountStatus = async (
  req: Request,
  res: Response
) => {
  const lecturer = await setLecturerAccountStatusService(
    req.params.lecturerId as string,
    req.body.accountStatus
  );

  return res.status(200).json({
    success: true,
    message: `Lecturer account ${lecturer.accountStatus === "ACTIVE" ? "activated" : "deactivated"} successfully`,
    lecturer,
  });
};

export const sendLecturerPasswordResetEmail = async(req : Request , res : Response) => {
  const lecturerUserId = req.params.lecturerUserId as string

  await sendAdminTriggeredPasswordReset(
    lecturerUserId,
    "LECTURER",
    req.user!.userId
  )

  return res.status(200).json({
    message: "Password reset email sent successfully.",
  });
}
