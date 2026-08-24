import prisma from "../../db/prisma.client.js";

import { AppError } from "../../utils/appError.js";

import type {
  AttendanceReader,
  CreateAttendanceSessionRequest,
  MarkManualAttendanceRequest,
} from "./attendance.types.js";


// ==================================================
// HELPER
// Check lecturer owns the class
// ==================================================

const getLecturerClass = async (
  classId: string,
  lecturerUserId: string
) => {
  const classRecord = await prisma.class.findUnique({
    where: {
      id: classId,
    },

    select: {
      id: true,
      classCode: true,
      lecturerId: true,
      scheduleDays: true,
      startTime: true,
      endTime: true,

      course: {
        select: {
          courseCode: true,
          courseName: true,
        },
      },

      academicTerm: {
        select: {
          id: true,
          semester: true,
          year: true,
          startDate: true,
          endDate: true,
        },
      },
    },
  });

  if (!classRecord) {
    throw new AppError(
      "Class not found",
      404
    );
  }

  if (
    classRecord.lecturerId !==
    lecturerUserId
  ) {
    throw new AppError(
      "You are not authorized to manage attendance for this class",
      403
    );
  }

  return classRecord;
};


// ==================================================
// START ATTENDANCE SESSION
// ==================================================

export const createAttendanceSessionService =
  async (
    lecturerUserId: string,
    data: CreateAttendanceSessionRequest
  ) => {

    // Find class and make sure the logged-in
    // lecturer owns the class.
    const classRecord =
      await getLecturerClass(
        data.classId,
        lecturerUserId
      );


    // ----------------------------------------------
    // Check academic term is currently active
    // ----------------------------------------------

    const now = new Date();

    if (
      now <
        classRecord.academicTerm.startDate ||
      now >
        classRecord.academicTerm.endDate
    ) {
      throw new AppError(
        "Attendance cannot be started outside the class academic term",
        400
      );
    }


    // ----------------------------------------------
    // Prevent two OPEN attendance sessions
    // for the same class
    // ----------------------------------------------

    const existingOpenSession =
      await prisma.attendanceSession.findFirst({
        where: {
          classId:
            classRecord.id,

          status:
            "OPEN",
        },
      });


    if (existingOpenSession) {
      throw new AppError(
        "An attendance session is already open for this class",
        409
      );
    }


    // ----------------------------------------------
    // Create attendance session
    // ----------------------------------------------

    const session =
      await prisma.attendanceSession.create({
        data: {
          classId:
            classRecord.id,
        },

        select: {
          id: true,
          status: true,
          startedAt: true,

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

              lecturer: {
                select: {
                  lecturerId: true,
                  firstName: true,
                  lastName: true,
                },
              },

              academicTerm: {
                select: {
                  semester: true,
                  year: true,
                },
              },

              scheduleDays: true,
              startTime: true,
              endTime: true,
              room: true,
            },
          },
        },
      });


    return session;
  };


// ==================================================
// MANUALLY MARK STUDENT ATTENDANCE
// ==================================================

export const markManualAttendanceService =
  async (
    lecturerUserId: string,
    sessionId: string,
    studentId: string,
    data: MarkManualAttendanceRequest
  ) => {

    // ----------------------------------------------
    // Find attendance session
    // ----------------------------------------------

    const session =
      await prisma.attendanceSession.findUnique({
        where: {
          id:
            sessionId,
        },

        select: {
          id: true,
          status: true,

          class: {
            select: {
              id: true,
              lecturerId: true,
            },
          },
        },
      });


    if (!session) {
      throw new AppError(
        "Attendance session not found",
        404
      );
    }


    // ----------------------------------------------
    // Lecturer must own the class
    // ----------------------------------------------

    if (
      session.class.lecturerId !==
      lecturerUserId
    ) {
      throw new AppError(
        "You are not authorized to manage this attendance session",
        403
      );
    }


    // ----------------------------------------------
    // Session must still be OPEN
    // ----------------------------------------------

    if (
      session.status !==
      "OPEN"
    ) {
      throw new AppError(
        "This attendance session is closed",
        400
      );
    }


    // ----------------------------------------------
    // Find student using public studentId
    // Example: S20260001
    // ----------------------------------------------

    const student =
      await prisma.student.findUnique({
        where: {
          studentId:
            studentId
              .trim()
              .toUpperCase(),
        },

        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
        },
      });


    if (!student) {
      throw new AppError(
        "Student not found",
        404
      );
    }


    // ----------------------------------------------
    // Student must be currently enrolled
    // in this class
    // ----------------------------------------------

    const enrollment =
      await prisma.enrollment.findFirst({
        where: {
          studentId:
            student.id,

          classId:
            session.class.id,

          status:
            "ONGOING",
        },
      });


    if (!enrollment) {
      throw new AppError(
        "Student is not enrolled in this class",
        400
      );
    }


    // ----------------------------------------------
    // Create attendance if it doesn't exist.
    //
    // If it already exists, update it.
    //
    // This lets the lecturer correct attendance
    // while the session is still OPEN.
    // ----------------------------------------------

    const record =
      await prisma.attendanceRecord.upsert({

        where: {
          sessionId_studentId: {
            sessionId:
              session.id,

            studentId:
              student.id,
          },
        },

        create: {
          sessionId:
            session.id,

          studentId:
            student.id,

          status:
            data.status,

          method:
            "MANUAL",

          markedAt:
            new Date(),
        },

        update: {
          status:
            data.status,

          method:
            "MANUAL",

          markedAt:
            new Date(),
        },

        select: {
          id: true,
          status: true,
          method: true,
          markedAt: true,

          student: {
            select: {
              studentId: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });


    return record;
  };


// ==================================================
// FACIAL RECOGNITION ATTENDANCE
// ==================================================
//
// The facial-recognition system identifies a student.
//
// Example:
//
// sessionId = attendance session UUID
// studentId = "S20260001"
//
// The backend still verifies:
// - session exists
// - session is OPEN
// - student exists
// - student belongs to the class
//
// ==================================================

export const markFacialRecognitionAttendanceService =
  async (
    sessionId: string,
    studentId: string
  ) => {

    // ----------------------------------------------
    // Find attendance session
    // ----------------------------------------------

    const session =
      await prisma.attendanceSession.findUnique({
        where: {
          id:
            sessionId,
        },

        select: {
          id: true,
          status: true,

          class: {
            select: {
              id: true,
            },
          },
        },
      });


    if (!session) {
      throw new AppError(
        "Attendance session not found",
        404
      );
    }


    // ----------------------------------------------
    // Facial recognition can only mark attendance
    // while the session is OPEN
    // ----------------------------------------------

    if (
      session.status !==
      "OPEN"
    ) {
      throw new AppError(
        "Attendance session is closed",
        400
      );
    }


    // ----------------------------------------------
    // Find recognized student
    // ----------------------------------------------

    const student =
      await prisma.student.findUnique({
        where: {
          studentId:
            studentId
              .trim()
              .toUpperCase(),
        },

        select: {
          id: true,
          studentId: true,
          firstName: true,
          lastName: true,
        },
      });


    if (!student) {
      throw new AppError(
        "Student not found",
        404
      );
    }


    // ----------------------------------------------
    // Recognition cannot mark someone who
    // isn't actually enrolled in the class
    // ----------------------------------------------

    const enrollment =
      await prisma.enrollment.findFirst({
        where: {
          studentId:
            student.id,

          classId:
            session.class.id,

          status:
            "ONGOING",
        },
      });


    if (!enrollment) {
      throw new AppError(
        "Student is not enrolled in this class",
        400
      );
    }


    // ----------------------------------------------
    // Check whether student already has attendance
    // for this session
    // ----------------------------------------------

    const existingRecord =
      await prisma.attendanceRecord.findUnique({
        where: {
          sessionId_studentId: {
            sessionId:
              session.id,

            studentId:
              student.id,
          },
        },
      });


    // ----------------------------------------------
    // Manual corrections take priority.
    //
    // Example:
    //
    // Face recognition → PRESENT
    //
    // Lecturer manually changes → ABSENT
    //
    // Camera sees student again
    //
    // We DON'T overwrite the lecturer's correction.
    // ----------------------------------------------

    if (
      existingRecord &&
      existingRecord.method ===
        "MANUAL"
    ) {
      return existingRecord;
    }


    // ----------------------------------------------
    // Create or update facial-recognition attendance
    // ----------------------------------------------

    return prisma.attendanceRecord.upsert({

      where: {
        sessionId_studentId: {
          sessionId:
            session.id,

          studentId:
            student.id,
        },
      },

      create: {
        sessionId:
          session.id,

        studentId:
          student.id,

        status:
          "PRESENT",

        method:
          "FACIAL_RECOGNITION",

        markedAt:
          new Date(),
      },

      update: {
        status:
          "PRESENT",

        method:
          "FACIAL_RECOGNITION",

        markedAt:
          new Date(),
      },

      select: {
        id: true,
        status: true,
        method: true,
        markedAt: true,

        student: {
          select: {
            studentId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  };


// ==================================================
// CLOSE ATTENDANCE SESSION
// ==================================================

export const closeAttendanceSessionService =
  async (
    lecturerUserId: string,
    sessionId: string
  ) => {

    // ----------------------------------------------
    // Find session
    // ----------------------------------------------

    const session =
      await prisma.attendanceSession.findUnique({
        where: {
          id:
            sessionId,
        },

        select: {
          id: true,
          status: true,

          class: {
            select: {
              id: true,
              lecturerId: true,
            },
          },
        },
      });


    if (!session) {
      throw new AppError(
        "Attendance session not found",
        404
      );
    }


    // ----------------------------------------------
    // Only lecturer who owns class can close it
    // ----------------------------------------------

    if (
      session.class.lecturerId !==
      lecturerUserId
    ) {
      throw new AppError(
        "You are not authorized to close this attendance session",
        403
      );
    }


    // ----------------------------------------------
    // Session cannot be closed twice
    // ----------------------------------------------

    if (
      session.status ===
      "CLOSED"
    ) {
      throw new AppError(
        "Attendance session is already closed",
        400
      );
    }


    // ----------------------------------------------
    // Get all students currently enrolled
    // in this class
    // ----------------------------------------------

    const enrollments =
      await prisma.enrollment.findMany({
        where: {
          classId:
            session.class.id,

          status:
            "ONGOING",
        },

        select: {
          studentId: true,
        },
      });


    // ----------------------------------------------
    // Find students who already have
    // attendance records
    // ----------------------------------------------

    const existingRecords =
      await prisma.attendanceRecord.findMany({
        where: {
          sessionId:
            session.id,
        },

        select: {
          studentId: true,
        },
      });


    const alreadyMarked =
      new Set(
        existingRecords.map(
          (record) =>
            record.studentId
        )
      );


    // ----------------------------------------------
    // Anyone enrolled but not marked
    // becomes ABSENT
    // ----------------------------------------------

    const absentStudents =
      enrollments.filter(
        (enrollment) =>
          !alreadyMarked.has(
            enrollment.studentId
          )
      );


    const now =
      new Date();


    // ----------------------------------------------
    // Transaction
    //
    // Either:
    // - absences are created AND session closes
    //
    // or:
    // - neither operation completes
    // ----------------------------------------------

    await prisma.$transaction(
      async (tx) => {

        // ------------------------------------------
        // Automatically mark unmarked students
        // as ABSENT
        // ------------------------------------------

        if (
          absentStudents.length > 0
        ) {
          await tx.attendanceRecord.createMany({
            data:
              absentStudents.map(
                (enrollment) => ({
                  sessionId:
                    session.id,

                  studentId:
                    enrollment.studentId,

                  status:
                    "ABSENT",

                  method:
                    "SYSTEM",

                  markedAt:
                    now,
                })
              ),
          });
        }


        // ------------------------------------------
        // Close session
        // ------------------------------------------

        await tx.attendanceSession.update({
          where: {
            id:
              session.id,
          },

          data: {
            status:
              "CLOSED",

            endedAt:
              now,
          },
        });
      }
    );


    // ----------------------------------------------
    // Return final attendance
    // ----------------------------------------------

    return prisma.attendanceSession.findUnique({
      where: {
        id:
          session.id,
      },

      select: {
        id: true,
        status: true,
        startedAt: true,
        endedAt: true,

        records: {
          select: {
            status: true,
            method: true,
            markedAt: true,

            student: {
              select: {
                studentId: true,
                firstName: true,
                lastName: true,
              },
            },
          },

          orderBy: {
            student: {
              firstName:
                "asc",
            },
          },
        },
      },
    });
  };


// ==================================================
// GET ATTENDANCE SESSION
// ==================================================

export const getAttendanceSessionService =
  async (
    sessionId: string,
    reader: AttendanceReader
  ) => {

    const session =
      await prisma.attendanceSession.findUnique({
        where: {
          id:
            sessionId,
        },

        select: {
          id: true,
          status: true,
          startedAt: true,
          endedAt: true,

          class: {
            select: {
              id: true,
              classCode: true,
              lecturerId: true,

              course: {
                select: {
                  courseCode: true,
                  courseName: true,
                },
              },

              academicTerm: {
                select: {
                  semester: true,
                  year: true,
                },
              },
            },
          },

          records: {
            select: {
              id: true,
              status: true,
              method: true,
              markedAt: true,

              student: {
                select: {
                  studentId: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },

            orderBy: {
              student: {
                firstName:
                  "asc",
              },
            },
          },
        },
      });


    if (!session) {
      throw new AppError(
        "Attendance session not found",
        404
      );
    }


    // ----------------------------------------------
    // Lecturer can only view attendance
    // sessions belonging to their classes.
    //
    // ADMIN and SUPER_ADMIN can view any.
    // ----------------------------------------------

    if (
      reader.role === "LECTURER" &&
      session.class.lecturerId !==
        reader.userId
    ) {
      throw new AppError(
        "You are not authorized to view this attendance session",
        403
      );
    }


    return session;
  };


// ==================================================
// STUDENT: GET MY ATTENDANCE HISTORY
// ==================================================

export const getMyAttendanceService =
  async (
    studentUserId: string
  ) => {

    // ----------------------------------------------
    // Make sure authenticated student exists
    // ----------------------------------------------

    const student =
      await prisma.student.findUnique({
        where: {
          id:
            studentUserId,
        },

        select: {
          id: true,
        },
      });


    if (!student) {
      throw new AppError(
        "Student not found",
        404
      );
    }


    // ----------------------------------------------
    // Get student's attendance records
    // ----------------------------------------------

    return prisma.attendanceRecord.findMany({

      where: {
        studentId:
          student.id,
      },

      select: {
        id: true,
        status: true,
        method: true,
        markedAt: true,

        session: {
          select: {
            id: true,
            startedAt: true,
            endedAt: true,

            class: {
              select: {
                classCode: true,

                course: {
                  select: {
                    courseCode: true,
                    courseName: true,
                  },
                },

                academicTerm: {
                  select: {
                    semester: true,
                    year: true,
                  },
                },
              },
            },
          },
        },
      },

      orderBy: {
        markedAt:
          "desc",
      },
    });
  };


// ==================================================
// LECTURER: GET MY ATTENDANCE SESSIONS
// ==================================================

export const getMyAttendanceSessionsService =
  async (
    lecturerUserId: string
  ) => {

    return prisma.attendanceSession.findMany({

      where: {
        class: {
          lecturerId:
            lecturerUserId,
        },
      },

      select: {
        id: true,
        status: true,
        startedAt: true,
        endedAt: true,

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

            academicTerm: {
              select: {
                semester: true,
                year: true,
              },
            },
          },
        },

        _count: {
          select: {
            records: true,
          },
        },
      },

      orderBy: {
        startedAt:
          "desc",
      },
    });
  };