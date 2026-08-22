import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import env from "../config/env.js";
import { AppError } from "../utils/appError.js";
import type { AuthenticatedUser } from "../types/express.js";

export const authenticate = (
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

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    return next();
  } catch {
    return next(new AppError("Invalid or expired token", 401));
  }
};
