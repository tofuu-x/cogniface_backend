import type { Request, Response } from "express";

import { createLecturerService , updateLecturerService } from "./lecturer.service.js";

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
