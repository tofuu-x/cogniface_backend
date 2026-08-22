import type { Request, Response } from "express";

import { createLecturerService } from "./lecturer.service.js";

import type {
  CreateLecturerRequest,
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
