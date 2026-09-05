import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import { AppError } from "../utils/appError.js";
import type { AuthenticatedUser } from "../types/express.js";
import prisma from "../db/prisma.client.js";

export const authenticate = async(
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError("Authentication required", 401));
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, env.jwt_secret) as AuthenticatedUser;

    let currentAuthVersion: number;

    if (
      decoded.role === "ADMIN" ||
      decoded.role === "SUPER_ADMIN"
    ) {
      const admin = await prisma.admin.findUnique({
        where: {
          id: decoded.userId,
        },
        select: {
          authVersion: true,
        },
      });

      if (!admin) {
        return next(
          new AppError("Invalid or expired token", 401)
        );
      }

      currentAuthVersion = admin.authVersion;
    }

    else if (decoded.role === "LECTURER") {
      const lecturer =
        await prisma.lecturer.findUnique({
          where: {
            id: decoded.userId,
          },
          select: {
            authVersion: true,
          },
        });

      if (!lecturer) {
        return next(
          new AppError("Invalid or expired token", 401)
        );
      }

      currentAuthVersion = lecturer.authVersion;
    }

    else {
      const student =
        await prisma.student.findUnique({
          where: {
            id: decoded.userId,
          },
          select: {
            authVersion: true,
          },
        });

      if (!student) {
        return next(
          new AppError("Invalid or expired token", 401)
        );
      }

      currentAuthVersion = student.authVersion;
    }

    if (decoded.authVersion !== currentAuthVersion) {
      return next(
        new AppError(
          "Session expired. Please log in again.",
          401
        )
      );
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      authVersion: decoded.authVersion,
      ...(decoded.studentId && {
        studentId: decoded.studentId,
      }),
      ...(decoded.lecturerId && {
        lecturerId: decoded.lecturerId,
      }),
    };

    return next();
  } catch {
    return next(new AppError("Invalid or expired token", 401));
  }
};
