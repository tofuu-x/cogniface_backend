import type {
  Request,
  Response,
} from "express";

import { AppError } from "../../utils/appError.js";

import {
  createAttendanceSessionService,
  correctClosedAttendanceService,
  markManualAttendanceService,
  closeAttendanceSessionService,
  getAttendanceSessionService,
  getMyAttendanceService,
  getMyAttendanceSessionsService,
} from "./attendance.service.js";

import type {
  CorrectAttendanceRequest,
  CreateAttendanceSessionRequest,
  MarkManualAttendanceRequest,
} from "./attendance.types.js";


// --------------------------------------------------
// START SESSION
// --------------------------------------------------

export const createAttendanceSession =
  async (
    req: Request<
      {},
      {},
      CreateAttendanceSessionRequest
    >,
    res: Response
  ) => {

    if (!req.user) {
      throw new AppError(
        "Authenticated user missing",
        401
      );
    }


    const result =
      await createAttendanceSessionService(
        req.user.userId,
        req.body
      );


    return res.status(result.resumed ? 200 : 201).json({
      success: true,

      message:
        result.resumed
          ? "Existing attendance session resumed successfully"
          : "Attendance session started successfully",

      session: result.session,
      resumed: result.resumed,
    });
  };


// --------------------------------------------------
// MANUAL MARK
// --------------------------------------------------

export const markManualAttendance =
  async (
    req: Request<
      {
        sessionId: string;
        studentId: string;
      },
      {},
      MarkManualAttendanceRequest
    >,
    res: Response
  ) => {

    if (!req.user) {
      throw new AppError(
        "Authenticated user missing",
        401
      );
    }


    const record =
      await markManualAttendanceService(
        req.user.userId,
        req.params.sessionId,
        req.params.studentId,
        req.body
      );


    return res.status(200).json({
      success: true,

      message:
        "Attendance updated successfully",

      record,
    });
  };


// --------------------------------------------------
// POST-CLOSURE CORRECTION
// --------------------------------------------------

export const correctClosedAttendance =
  async (
    req: Request<
      {
        sessionId: string;
        studentId: string;
      },
      {},
      CorrectAttendanceRequest
    >,
    res: Response
  ) => {
    if (!req.user) {
      throw new AppError(
        "Authenticated user missing",
        401
      );
    }

    const result = await correctClosedAttendanceService(
      {
        userId: req.user.userId,
        role: req.user.role,
      },
      req.params.sessionId,
      req.params.studentId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Closed attendance corrected successfully",
      ...result,
    });
  };


// --------------------------------------------------
// CLOSE
// --------------------------------------------------

export const closeAttendanceSession =
  async (
    req: Request<{
      sessionId: string;
    }>,
    res: Response
  ) => {

    if (!req.user) {
      throw new AppError(
        "Authenticated user missing",
        401
      );
    }


    const session =
      await closeAttendanceSessionService(
        req.user.userId,
        req.params.sessionId
      );


    return res.status(200).json({
      success: true,

      message:
        "Attendance session closed successfully",

      session,
    });
  };


// --------------------------------------------------
// GET SESSION
// --------------------------------------------------

export const getAttendanceSession =
  async (
    req: Request<{
      sessionId: string;
    }>,
    res: Response
  ) => {

    if (!req.user) {
      throw new AppError(
        "Authenticated user missing",
        401
      );
    }


    const session =
      await getAttendanceSessionService(
        req.params.sessionId,
        {
          userId:
            req.user.userId,

          role:
            req.user.role,
        }
      );


    return res.status(200).json({
      success: true,
      session,
    });
  };


// --------------------------------------------------
// STUDENT MY ATTENDANCE
// --------------------------------------------------

export const getMyAttendance =
  async (
    req: Request,
    res: Response
  ) => {

    if (!req.user) {
      throw new AppError(
        "Authenticated user missing",
        401
      );
    }


    const attendance =
      await getMyAttendanceService(
        req.user.userId
      );


    return res.status(200).json({
      success: true,

      count:
        attendance.length,

      attendance,
    });
  };


// --------------------------------------------------
// LECTURER MY SESSIONS
// --------------------------------------------------

export const getMyAttendanceSessions =
  async (
    req: Request,
    res: Response
  ) => {

    if (!req.user) {
      throw new AppError(
        "Authenticated user missing",
        401
      );
    }


    const sessions =
      await getMyAttendanceSessionsService(
        req.user.userId
      );


    return res.status(200).json({
      success: true,

      count:
        sessions.length,

      sessions,
    });
  };
