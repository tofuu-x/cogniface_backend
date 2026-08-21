import type { Request, Response , NextFunction } from "express";
import { AppError } from "../utils/appError.js";

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
    });
  }

  console.error(err);

  return res.status(500).json({
    success : false,
    message: "Internal server error"
  });
};