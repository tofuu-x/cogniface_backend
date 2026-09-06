import env from "../../config/env.js";
import { AppError } from "../../utils/appError.js";
import type {
  FaceRecognitionInferenceResponse,
  FaceRegistrationInferenceResponse,
  RecognitionRosterStudent,
} from "./face.types.js";

const inferenceUrl = (path: string) =>
  `${env.face_service_url.replace(/\/+$/, "")}${path}`;

const parseResponse = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const detail = payload?.detail;
    const message = typeof detail === "string"
      ? detail
      : detail && typeof detail === "object" && "message" in detail
        ? String((detail as { message: unknown }).message)
        : "Facial recognition service could not process the request";
    const publicStatus = response.status >= 400 && response.status < 500
      ? response.status
      : 502;
    throw new AppError(message, publicStatus, detail && typeof detail === "object" ? detail : undefined);
  }
  return payload as T;
};

const callInference = async <T>(path: string, form: FormData): Promise<T> => {
  if (!env.face_service_token) {
    throw new AppError("Facial recognition service is not configured", 503);
  }
  try {
    const response = await fetch(inferenceUrl(path), {
      method: "POST",
      headers: { "X-Internal-Service-Token": env.face_service_token },
      body: form,
      signal: AbortSignal.timeout(env.face_service_timeout_ms),
    });
    return await parseResponse<T>(response);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Facial recognition service is unavailable", 503);
  }
};

export const registerFaceWithInference = async (files: Express.Multer.File[]) => {
  const form = new FormData();
  for (const [index, file] of files.entries()) {
    form.append("images", new Blob([new Uint8Array(file.buffer)], { type: "image/jpeg" }), `face-${index + 1}.jpg`);
  }
  return callInference<FaceRegistrationInferenceResponse>("/internal/face/register", form);
};

export const recognizeFrameWithInference = async (
  file: Express.Multer.File,
  students: RecognitionRosterStudent[],
) => {
  const form = new FormData();
  form.append("frame", new Blob([new Uint8Array(file.buffer)], { type: "image/jpeg" }), "frame.jpg");
  form.append("roster", JSON.stringify({ students }));
  return callInference<FaceRecognitionInferenceResponse>("/internal/face/recognize", form);
};
