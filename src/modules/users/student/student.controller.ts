import type { Request, Response } from "express";

import {
  createStudentService,
  deleteStudentService,
  setStudentAccountStatusService,
  updateStudentService,
  getStudentService,
  getAllStudentsService,
} from "./student.service.js";

import type {
  CreateStudentRequest,
  UpdateStudentRequest,
} from "./student.types.js";
import { sendAdminTriggeredPasswordReset } from "../../../services/password.service.js";


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

export const deleteStudent = async (
  req: Request<{ studentId: string }>,
  res: Response
) => {
  const student = await deleteStudentService(
    req.params.studentId
  );

  return res.status(200).json({
    success: true,
    message: "Student deleted successfully",
    student,
  });
};

export const setStudentAccountStatus = async (
  req: Request,
  res: Response
) => {
  const student = await setStudentAccountStatusService(
    req.params.studentId as string,
    req.body.accountStatus
  );

  return res.status(200).json({
    success: true,
    message: `Student account ${student.accountStatus === "ACTIVE" ? "activated" : "deactivated"} successfully`,
    student,
  });
};

export const sendStudentPasswordResetEmail = async (
  req: Request,
  res: Response
) => {
  const studentUserId = req.params.studentUserId as string;

  await sendAdminTriggeredPasswordReset(
    studentUserId,
    "STUDENT",
    req.user!.userId
  );

  return res.status(200).json({
    message: "Password reset email send successfully"
  })
}
