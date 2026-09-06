import type { Request, Response } from "express";
import { AppError } from "../../utils/appError.js";
import { getMyFaceStatusService, registerFaceService, resetFaceService } from "./face.service.js";

export const registerFace = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authenticated user missing", 401);
  const files = Array.isArray(req.files) ? req.files : [];
  const result = await registerFaceService(req.user.userId, files);
  return res.status(201).json({
    success: true,
    message: "Face registration completed successfully",
    validImageCount: result.validImageCount,
    rejectedImageCount: result.rejectedImageCount,
    registeredAt: result.registeredAt,
    details: result.details,
  });
};

export const getMyFaceStatus = async (req: Request, res: Response) => {
  if (!req.user) throw new AppError("Authenticated user missing", 401);
  const status = await getMyFaceStatusService(req.user.userId);
  return res.status(200).json({ success: true, ...status });
};

export const resetFace = async (req: Request<{ studentId: string }>, res: Response) => {
  await resetFaceService(req.params.studentId);
  return res.status(200).json({ success: true, message: "Face registration reset successfully" });
};
