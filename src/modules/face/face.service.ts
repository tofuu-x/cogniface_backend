import prisma from "../../db/prisma.client.js";
import { AppError } from "../../utils/appError.js";
import { registerFaceWithInference } from "./face.client.js";

export const registerFaceService = async (
  studentUserId: string,
  files: Express.Multer.File[],
) => {
  if (files.length !== 20) {
    throw new AppError("Exactly 20 face images are required", 400);
  }

  const student = await prisma.student.findUnique({
    where: { id: studentUserId },
    select: { id: true, faceRegistered: true, faceEmbedding: { select: { studentId: true } } },
  });
  if (!student) throw new AppError("Student not found", 404);
  if (student.faceRegistered || student.faceEmbedding) {
    throw new AppError("Face is already registered", 409);
  }

  const inference = await registerFaceWithInference(files);
  if (inference.validImageCount < 15 || !inference.encryptedEmbedding) {
    throw new AppError("At least 15 valid face images are required", 422, inference.details);
  }

  try {
    const embedding = await prisma.$transaction(async (tx) => {
      const current = await tx.student.findUnique({
        where: { id: studentUserId },
        select: { faceRegistered: true, faceEmbedding: { select: { studentId: true } } },
      });
      if (!current || current.faceRegistered || current.faceEmbedding) {
        throw new AppError("Face is already registered", 409);
      }
      const created = await tx.faceEmbedding.create({
        data: {
          studentId: studentUserId,
          encryptedEmbedding: Buffer.from(inference.encryptedEmbedding, "utf8"),
        },
        select: { createdAt: true },
      });
      await tx.student.update({ where: { id: studentUserId }, data: { faceRegistered: true } });
      return created;
    });
    return { ...inference, registeredAt: embedding.createdAt };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      throw new AppError("Face is already registered", 409);
    }
    throw error;
  }
};

export const getMyFaceStatusService = async (studentUserId: string) => {
  const student = await prisma.student.findUnique({
    where: { id: studentUserId },
    select: { faceRegistered: true, faceEmbedding: { select: { createdAt: true } } },
  });
  if (!student) throw new AppError("Student not found", 404);
  return {
    faceRegistered: student.faceRegistered && Boolean(student.faceEmbedding),
    registeredAt: student.faceEmbedding?.createdAt ?? null,
  };
};

export const resetFaceService = async (publicStudentId: string) => {
  const student = await prisma.student.findUnique({
    where: { studentId: publicStudentId.trim().toUpperCase() },
    select: { id: true, faceEmbedding: { select: { studentId: true } } },
  });
  if (!student) throw new AppError("Student not found", 404);
  if (!student.faceEmbedding) throw new AppError("Student does not have a registered face", 404);

  await prisma.$transaction([
    prisma.faceEmbedding.delete({ where: { studentId: student.id } }),
    prisma.student.update({ where: { id: student.id }, data: { faceRegistered: false } }),
  ]);
};
