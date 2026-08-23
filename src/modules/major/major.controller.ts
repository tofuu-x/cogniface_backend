import type { Request, Response } from "express";

import type { CreateMajorRequest, UpdateMajorRequest } from "./major.types.js";

import { createMajorService, getMajorService, getAllMajorsService, updateMajorService } from "./major.service.js";

export const createMajor = async (
  req: Request<
    {},
    {},
    CreateMajorRequest
  >,
  res: Response
) => {
  const major = await createMajorService(
    req.body
  );

  return res.status(201).json({
    success: true,
    message: "Major created successfully",
    major,
  });
};

export const getMajor = async (
  req: Request<{
    majorCode: string;
  }>,
  res: Response
) => {
  const major = await getMajorService(
    req.params.majorCode
  );

  return res.status(200).json({
    success: true,
    major,
  });
};

export const getAllMajors = async (
  _req: Request,
  res: Response
) => {
  const majors =
    await getAllMajorsService();

  return res.status(200).json({
    success: true,
    count: majors.length,
    majors,
  });
};

export const updateMajor = async (
  req: Request<
    { majorCode: string },
    {},
    UpdateMajorRequest
  >,
  res: Response
) => {
  const major = await updateMajorService(
    req.params.majorCode,
    req.body
  );

  return res.status(200).json({
    success: true,
    message: "Major updated successfully",
    major,
  });
};