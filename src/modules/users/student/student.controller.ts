import type { Request, Response } from "express";

import {
  createStudentService,
  updateStudentService,
  getStudentService,
  getAllStudentsService,
} from "./student.service.js";

import type {
  CreateStudentRequest,
  UpdateStudentRequest,
} from "./student.types.js";


export const createStudent = async (
  req: Request<
    {},
    {},
    CreateStudentRequest
  >,
  res: Response
) => {

  const student =
    await createStudentService(
      req.body
    );

  return res.status(201).json({
    success: true,
    message:
      "Student created successfully",
    student,
  });
};

export const updateStudent = async (
  req: Request<
    { studentId: string },
    {},
    UpdateStudentRequest
  >,
  res: Response
) => {

  const student =
    await updateStudentService(
      req.params.studentId,
      req.body
    );

  return res.status(200).json({
    success: true,
    message:
      "Student updated successfully",
    student,
  });
};

export const getStudent = async (
  req: Request<{
    studentId: string;
  }>,
  res: Response
) => {

  if (!req.user) {
    throw new Error(
      "Authenticated user missing"
    );
  }

  const student =
    await getStudentService(
      req.params.studentId,
      {
        userId: req.user.userId,
        role: req.user.role,
      }
    );

  return res.status(200).json({
    success: true,
    student,
  });
};

export const getAllStudents = async (
  _req: Request,
  res: Response
) => {

  const students =
    await getAllStudentsService();

  return res.status(200).json({
    success: true,
    count: students.length,
    students,
  });
};

