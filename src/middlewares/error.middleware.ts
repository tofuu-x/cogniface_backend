import type { Request, Response , NextFunction } from "express";
import { AppError } from "../utils/appError.js";

const getPrismaErrorCode = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return null;
};

export const errorMiddleware = (
  err : Error,
  req : Request,
  res : Response,
  next : NextFunction
) => {
  if (err instanceof AppError){
    return res.status(err.statusCode).json({
      success : false,
      message : err.message,
      ...(err.details === undefined ? {} : { details: err.details }),
    });
  }

  const prismaErrorCode = getPrismaErrorCode(err);

  if (prismaErrorCode === "P2003") {
    return res.status(409).json({
      success: false,
      message: "This record cannot be deleted because it is still referenced by other data",
    });
  }

  if (prismaErrorCode === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A record with the same unique value already exists",
    });
  }

  if (prismaErrorCode === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Record not found",
    });
  }

  console.error(err);

  return res.status(500).json({
    success : false,
    message: "Internal server error"
  });
};
