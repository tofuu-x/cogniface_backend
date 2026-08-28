import prisma from "../../db/prisma.client.js";
import { AppError } from "../../utils/appError.js";

// HELPER : GET CURRENT ACADEMIC TERM

const getCurrentAcademicTerm = async () => {
  const now = new Date();

  return await prisma.academicTerm.findFirst({
    where: {
      startDate: {
        lte: now,
      },

      endDate: {
        gte: now,
      },
    },

    select: {
      id: true,
      semester: true,
      year: true,
      startDate: true,
      endDate: true,
    },
  });
};

// Admin Dashboard

export const getAdminDashboardService = async () => {
  const currentTerm = await getCurrentAcademicTerm();

  const [
    totalStudents,
    totalLecturers,
    totalMajors,
    totalCourses,
    ongoingClasses,
  ] = await Promise.all([
    prisma.student.count({
      where: {
        accountStatus: {
          not: "INACTIVE",
        },
      },
    }),

    prisma.lecturer.count({
      where: {
        accountStatus: {
          not: "INACTIVE",
        },
      },
    }),

    prisma.major.count(),

    prisma.course.count({
      where: {
        status: "ACTIVE",
      },
    }),

    currentTerm
      ? prisma.class.count({
          where: {
            academicTermId: currentTerm.id,
          },
        })
      : Promise.resolve(0),
  ]);

  return {
    stats: {
      totalStudents,
      totalLecturers,
      totalMajors,
      totalCourses,
      ongoingClasses,
    },

    currentTerm,
  };
};

//Lecturer Dashboard
export const getLecturerDashboardService = async (
  lecturerUserId: string
) => {
  const currentTerm = await getCurrentAcademicTerm();

  const lecturer = await prisma.lecturer.findUnique({
    where: {
      id: lecturerUserId,
    },

    select: {
      lecturerId: true,
      firstName: true,
      lastName: true,
      email: true,
      department: true,
    },
  });

  if (!lecturer) {
    throw new AppError("Lecturer not found", 404);
  }

  const currentClasses = currentTerm
    ? await prisma.class.findMany({
        where: {
          lecturerId: lecturerUserId,
          academicTermId: currentTerm.id,
        },

        select: {
          id: true,
        },
      })
    : [];

  const classIds = currentClasses.map(
    (classRecord) => classRecord.id
  );

  const totalEnrollments =
    classIds.length > 0
      ? await prisma.enrollment.count({
          where: {
            classId: {
              in: classIds,
            },

            status: "ONGOING",
          },
        })
      : 0;

  return {
    lecturer,

    stats: {
      currentClasses: currentClasses.length,
      totalEnrollments,
    },

    currentTerm,
  };
};