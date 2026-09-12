import prisma from "../../db/prisma.client.js";
import { AppError } from "../../utils/appError.js";

const announcementSelect = {
  id: true,
  title: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  class: {
    select: {
      id: true,
      classCode: true,
      course: {
        select: {
          courseCode: true,
          courseName: true,
        },
      },
    },
  },
  lecturer: {
    select: {
      lecturerId: true,
      firstName: true,
      lastName: true,
    },
  },
} as const;

const validateText = (
  value: unknown,
  fieldName: "title" | "body",
  maximumLength: number
) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`${fieldName} is required`, 400);
  }

  const trimmedValue = value.trim();

  if (trimmedValue.length > maximumLength) {
    throw new AppError(
      `${fieldName} must not exceed ${maximumLength} characters`,
      400
    );
  }

  return trimmedValue;
};

const getAssignedClass = async (
  classId: string,
  lecturerUserId: string
) => {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, lecturerId: true },
  });

  if (!classRecord) {
    throw new AppError("Class not found", 404);
  }

  if (classRecord.lecturerId !== lecturerUserId) {
    throw new AppError(
      "You are not authorized to manage announcements for this class",
      403
    );
  }

  return classRecord;
};

const getLecturerAnnouncement = async (
  announcementId: string,
  lecturerUserId: string
) => {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: {
      id: true,
      classId: true,
      class: {
        select: { lecturerId: true },
      },
    },
  });

  if (!announcement) {
    throw new AppError("Announcement not found", 404);
  }

  if (announcement.class.lecturerId !== lecturerUserId) {
    throw new AppError(
      "You are not authorized to manage this announcement",
      403
    );
  }

  return announcement;
};

export const createAnnouncementService = async (
  lecturerUserId: string,
  classId: string,
  data: { title?: unknown; body?: unknown } | undefined
) => {
  const title = validateText(data?.title, "title", 150);
  const body = validateText(data?.body, "body", 5000);

  await getAssignedClass(classId, lecturerUserId);

  return prisma.announcement.create({
    data: {
      title,
      body,
      classId,
      lecturerId: lecturerUserId,
    },
    select: announcementSelect,
  });
};

export const getClassAnnouncementsService = async (
  classId: string,
  reader: {
    userId: string;
    role: "LECTURER" | "STUDENT";
  }
) => {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true, lecturerId: true },
  });

  if (!classRecord) {
    throw new AppError("Class not found", 404);
  }

  if (reader.role === "LECTURER") {
    if (classRecord.lecturerId !== reader.userId) {
      throw new AppError(
        "You are not authorized to view announcements for this class",
        403
      );
    }
  } else {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        classId: classRecord.id,
        studentId: reader.userId,
        status: "ONGOING",
      },
      select: { id: true },
    });

    if (!enrollment) {
      throw new AppError(
        "You are not authorized to view announcements for this class",
        403
      );
    }
  }

  return prisma.announcement.findMany({
    where: { classId: classRecord.id },
    select: announcementSelect,
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
  });
};

export const updateAnnouncementService = async (
  lecturerUserId: string,
  announcementId: string,
  data: { title?: unknown; body?: unknown } | undefined
) => {
  const title = validateText(data?.title, "title", 150);
  const body = validateText(data?.body, "body", 5000);

  await getLecturerAnnouncement(announcementId, lecturerUserId);

  return prisma.announcement.update({
    where: { id: announcementId },
    data: { title, body },
    select: announcementSelect,
  });
};

export const deleteAnnouncementService = async (
  lecturerUserId: string,
  announcementId: string
) => {
  await getLecturerAnnouncement(announcementId, lecturerUserId);

  return prisma.announcement.delete({
    where: { id: announcementId },
    select: announcementSelect,
  });
};
