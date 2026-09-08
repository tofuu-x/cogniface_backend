import prisma from "../../db/prisma.client.js";
import env from "../../config/env.js";
import { AppError } from "../../utils/appError.js";
import {
  getNextClassOccurrence,
  isFaceRegistrationComplete,
  summarizeAttendance,
} from "./dashboard.helpers.js";
import type { StudentDashboard } from "./dashboard.types.js";

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

// Student Dashboard
export const getStudentDashboardService = async (
  studentUserId: string,
): Promise<StudentDashboard> => {
  const [student, currentTerm] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentUserId },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        enrollmentYear: true,
        faceRegistered: true,
        faceEmbedding: { select: { createdAt: true } },
        major: {
          select: {
            majorCode: true,
            majorName: true,
            degreeType: true,
          },
        },
      },
    }),
    getCurrentAcademicTerm(),
  ]);

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  const recentAttendancePromise = prisma.attendanceRecord.findMany({
    where: { studentId: student.id },
    select: {
      id: true,
      status: true,
      method: true,
      markedAt: true,
      session: {
        select: {
          occurrenceDate: true,
          class: {
            select: {
              id: true,
              classCode: true,
              course: { select: { courseCode: true, courseName: true } },
            },
          },
        },
      },
    },
    orderBy: { markedAt: "desc" },
    take: 5,
  });

  if (!currentTerm) {
    const recentAttendance = await recentAttendancePromise;
    return {
      student: {
        studentId: student.studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        enrollmentYear: student.enrollmentYear,
        major: student.major,
      },
      faceRegistration: {
        registered: isFaceRegistrationComplete(
          student.faceRegistered,
          Boolean(student.faceEmbedding),
        ),
        registeredAt: student.faceEmbedding?.createdAt ?? null,
      },
      currentTerm: null,
      timeZone: env.attendance_time_zone,
      stats: {
        currentCourses: 0,
        recordedSessions: 0,
        present: 0,
        absent: 0,
        attendancePercentage: null,
      },
      nextClass: null,
      courses: [],
      recentAttendance: recentAttendance.map((record) => ({
        id: record.id,
        occurrenceDate: record.session.occurrenceDate,
        markedAt: record.markedAt,
        status: record.status,
        method: record.method,
        classId: record.session.class.id,
        classCode: record.session.class.classCode,
        courseCode: record.session.class.course.courseCode,
        courseName: record.session.class.course.courseName,
      })),
    };
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId: student.id,
      status: "ONGOING",
      class: { academicTermId: currentTerm.id },
    },
    select: {
      class: {
        select: {
          id: true,
          classCode: true,
          room: true,
          scheduleDays: true,
          startTime: true,
          endTime: true,
          course: { select: { courseCode: true, courseName: true } },
          lecturer: { select: { firstName: true, lastName: true } },
          academicTerm: { select: { startDate: true, endDate: true } },
        },
      },
    },
    orderBy: { class: { course: { courseCode: "asc" } } },
  });
  const classIds = enrollments.map((enrollment) => enrollment.class.id);

  const [attendanceRecords, recentAttendance] = await Promise.all([
    classIds.length > 0
      ? prisma.attendanceRecord.findMany({
          where: {
            studentId: student.id,
            session: { classId: { in: classIds } },
          },
          select: {
            status: true,
            session: { select: { classId: true } },
          },
        })
      : Promise.resolve([]),
    recentAttendancePromise,
  ]);

  const attendanceByClass = new Map<string, Array<"PRESENT" | "ABSENT">>();
  for (const record of attendanceRecords) {
    const statuses = attendanceByClass.get(record.session.classId) ?? [];
    statuses.push(record.status);
    attendanceByClass.set(record.session.classId, statuses);
  }
  const overallAttendance = summarizeAttendance(
    attendanceRecords.map((record) => record.status),
  );

  const upcomingClasses = enrollments.flatMap(({ class: classRecord }) => {
    const occurrence = getNextClassOccurrence(
      {
        scheduleDays: classRecord.scheduleDays,
        startTime: classRecord.startTime,
        endTime: classRecord.endTime,
        academicTerm: classRecord.academicTerm,
      },
      env.attendance_time_zone,
    );
    return occurrence ? [{ classRecord, occurrence }] : [];
  });
  upcomingClasses.sort((left, right) => {
    const dateComparison = left.occurrence.occurrenceDate.localeCompare(
      right.occurrence.occurrenceDate,
    );
    return dateComparison || left.classRecord.startTime.getTime() - right.classRecord.startTime.getTime();
  });
  const next = upcomingClasses[0] ?? null;

  return {
    student: {
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      enrollmentYear: student.enrollmentYear,
      major: student.major,
    },
    faceRegistration: {
      registered: isFaceRegistrationComplete(
        student.faceRegistered,
        Boolean(student.faceEmbedding),
      ),
      registeredAt: student.faceEmbedding?.createdAt ?? null,
    },
    currentTerm,
    timeZone: env.attendance_time_zone,
    stats: {
      currentCourses: enrollments.length,
      recordedSessions: overallAttendance.total,
      present: overallAttendance.present,
      absent: overallAttendance.absent,
      attendancePercentage: overallAttendance.percentage,
    },
    nextClass: next
      ? {
          classId: next.classRecord.id,
          classCode: next.classRecord.classCode,
          courseCode: next.classRecord.course.courseCode,
          courseName: next.classRecord.course.courseName,
          lecturerName: `${next.classRecord.lecturer.firstName} ${next.classRecord.lecturer.lastName}`,
          room: next.classRecord.room,
          occurrenceDate: next.occurrence.occurrenceDate,
          scheduleDay: next.occurrence.scheduleDay,
          startTime: next.classRecord.startTime,
          endTime: next.classRecord.endTime,
        }
      : null,
    courses: enrollments.map(({ class: classRecord }) => ({
      classId: classRecord.id,
      classCode: classRecord.classCode,
      courseCode: classRecord.course.courseCode,
      courseName: classRecord.course.courseName,
      lecturerName: `${classRecord.lecturer.firstName} ${classRecord.lecturer.lastName}`,
      room: classRecord.room,
      scheduleDays: classRecord.scheduleDays,
      startTime: classRecord.startTime,
      endTime: classRecord.endTime,
      attendance: summarizeAttendance(attendanceByClass.get(classRecord.id) ?? []),
    })),
    recentAttendance: recentAttendance.map((record) => ({
      id: record.id,
      occurrenceDate: record.session.occurrenceDate,
      markedAt: record.markedAt,
      status: record.status,
      method: record.method,
      classId: record.session.class.id,
      classCode: record.session.class.classCode,
      courseCode: record.session.class.course.courseCode,
      courseName: record.session.class.course.courseName,
    })),
  };
};
