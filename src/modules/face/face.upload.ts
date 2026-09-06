import type { RequestHandler } from "express";
import multer from "multer";
import { AppError } from "../../utils/appError.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1_000_000, files: 20, fields: 0 },
  fileFilter: (_req, file, callback) => {
    if (!["image/jpeg", "image/jpg"].includes(file.mimetype)) {
      callback(new AppError("Only JPEG images are accepted", 415));
      return;
    }
    callback(null, true);
  },
});

const handleUpload = (middleware: RequestHandler): RequestHandler =>
  (req, res, next) => middleware(req, res, (error?: unknown) => {
    if (!error) return next();
    if (error instanceof AppError) return next(error);
    if (error instanceof multer.MulterError) {
      return next(new AppError(
        error.code === "LIMIT_FILE_SIZE" ? "Each image must be no larger than 1 MB" : error.message,
        400,
      ));
    }
    return next(error);
  });

export const uploadRegistrationImages = handleUpload(upload.array("images", 20));
export const uploadRecognitionFrame = handleUpload(upload.single("frame"));
