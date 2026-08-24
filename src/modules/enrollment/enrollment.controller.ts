import type {
  Request,
  Response,
} from "express";

import { AppError } from "../../utils/appError.js";

import {
  createEnrollmentService,
  getMyEnrollmentsService,
  dropEnrollmentService,
} from "./enrollment.service.js";

import type {
  CreateEnrollmentRequest,
} from "./enrollment.types.js";


// CREATE

export const createEnrollment = async (
  req: Request<
    {},
    {},
    CreateEnrollmentRequest
  >,
  res: Response
) => {

  if (!req.user) {
    throw new AppError(
      "Authenticated user missing",
      401
    );
  }


  const enrollment =
    await createEnrollmentService(
      req.user.userId,
      req.body
    );


  return res.status(201).json({

    success: true,

    message:
      "Enrollment successful",

    enrollment,

  });
};


// GET MY ENROLLMENTS

export const getMyEnrollments = async (
  req: Request,
  res: Response
) => {

  if (!req.user) {
    throw new AppError(
      "Authenticated user missing",
      401
    );
  }


  const enrollments =
    await getMyEnrollmentsService(
      req.user.userId
    );


  return res.status(200).json({

    success: true,

    count:
      enrollments.length,

    enrollments,

  });
};


// DROP

export const dropEnrollment = async (
  req: Request<{
    enrollmentId: string;
  }>,
  res: Response
) => {

  if (!req.user) {
    throw new AppError(
      "Authenticated user missing",
      401
    );
  }


  const enrollment =
    await dropEnrollmentService(
      req.user.userId,
      req.params.enrollmentId
    );


  return res.status(200).json({

    success: true,

    message:
      "Enrollment dropped successfully",

    enrollment,

  });
};