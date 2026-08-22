import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError.js";

type Role = "SUPER_ADMIN" | "ADMIN" | "LECTURER" | "STUDENT";

export const authorizeRoles = (...allowedRoles : Role[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user){
    throw new AppError("Authentication required",401);
  }

  if (!allowedRoles.includes(req.user.role)){
    throw new AppError("You are not authorized to access this resource",403);
  }

  next();
}