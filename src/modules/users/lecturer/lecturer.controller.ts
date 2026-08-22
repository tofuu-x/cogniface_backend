import type { Request, Response } from "express";

import {
  createLecturerService,
  getAllLecturersService,
  getLecturerService,
  updateLecturerService,
} from "./lecturer.service.js";

import type {
  CreateLecturerRequest,
  UpdateLecturerRequest
} from "./lecturer.types.js";


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
