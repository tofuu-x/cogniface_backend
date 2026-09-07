import prisma from "../../db/prisma.client.js";

import { AppError } from "../../utils/appError.js";

import type {
  AttendanceReader,
  BatchCorrectAttendanceRequest,
  CreateAttendanceSessionRequest,
  MarkManualAttendanceRequest,
} from "./attendance.types.js";
import {
  getAttendanceOccurrenceDate,
  toOccurrenceDate,
  validateAttendanceStartWindow,
} from "./attendanceTime.js";
import { recognizeFrameWithInference } from "../face/face.client.js";

const attendanceStatuses = new Set([
  "PRESENT",
  "ABSENT",
]);

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

const attendanceSessionSelect = {
  id: true,
  status: true,
  occurrenceDate: true,
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
} as const;


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


    const now = new Date();
    const occurrenceDateKey = getAttendanceOccurrenceDate(now);
    const occurrenceDate = toOccurrenceDate(occurrenceDateKey);

    const findOccurrence = () =>
      prisma.attendanceSession.findUnique({
        where: {
          classId_occurrenceDate: {
            classId: classRecord.id,
            occurrenceDate,
          },
        },
        select: attendanceSessionSelect,
      });

    const existingSession = await findOccurrence();

    if (existingSession) {
      if (existingSession.status === "OPEN") {
        return {
          session: existingSession,
          resumed: true,
        };
      }

      throw new AppError(
        "Attendance has already been completed for this class occurrence",
        409
      );
    }

    validateAttendanceStartWindow(classRecord, now);

    try {
      const session = await prisma.attendanceSession.create({
        data: {
          classId: classRecord.id,
          occurrenceDate,
          startedAt: now,
        },
        select: attendanceSessionSelect,
      });

      return {
        session,
        resumed: false,
      };
    } catch (error) {
      if (getPrismaErrorCode(error) !== "P2002") {
        throw error;
      }

      const concurrentSession = await findOccurrence();

      if (concurrentSession?.status === "OPEN") {
        return {
          session: concurrentSession,
          resumed: true,
        };
      }

      throw new AppError(
        "Attendance has already been completed for this class occurrence",
        409
      );
    }
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

    if (!attendanceStatuses.has(data.status)) {
      throw new AppError(
        "Attendance status must be PRESENT or ABSENT",
        400
      );
    }

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
// CORRECT ATTENDANCE AFTER SESSION CLOSURE
// ==================================================

export const batchCorrectClosedAttendanceService =
  async (
    reader: AttendanceReader,
    sessionId: string,
    data: BatchCorrectAttendanceRequest
  ) => {
    const correctedByRole = reader.role;

    if (correctedByRole === "STUDENT") {
      throw new AppError(
        "You are not authorized to correct attendance",
        403
      );
    }

    if (!data || !Array.isArray(data.corrections) || data.corrections.length === 0) {
      throw new AppError(
        "At least one attendance correction is required",
        400
      );
    }

    const corrections = data.corrections.map((correction) => {
      if (
        !correction ||
        typeof correction.studentId !== "string" ||
        correction.studentId.trim().length === 0
      ) {
        throw new AppError(
          "Each correction must include a student ID",
          400
        );
      }

      if (
        !attendanceStatuses.has(correction.expectedStatus) ||
        !attendanceStatuses.has(correction.status)
      ) {
        throw new AppError(
          "Attendance statuses must be PRESENT or ABSENT",
          400
        );
      }

      if (correction.expectedStatus === correction.status) {
        throw new AppError(
          "A corrected status must differ from its expected status",
          400,
          { studentId: correction.studentId }
        );
      }

      return {
        studentId: correction.studentId.trim().toUpperCase(),
        expectedStatus: correction.expectedStatus,
        status: correction.status,
      };
    });

    const uniqueStudentIds = new Set(
      corrections.map((correction) => correction.studentId)
    );

    if (uniqueStudentIds.size !== corrections.length) {
      throw new AppError(
        "Each student may only appear once in a correction batch",
        400
      );
    }

    const session = await prisma.attendanceSession.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        id: true,
        status: true,
        class: {
          select: {
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

    if (
      correctedByRole === "LECTURER" &&
      session.class.lecturerId !== reader.userId
    ) {
      throw new AppError(
        "You are not authorized to correct this attendance session",
        403
      );
    }

    if (session.status !== "CLOSED") {
      throw new AppError(
        "Use the regular attendance endpoint while the session is open",
        400
      );
    }

    return prisma.$transaction(async (tx) => {
      const currentRecords = await tx.attendanceRecord.findMany({
        where: {
          sessionId: session.id,
          student: {
            studentId: {
              in: [...uniqueStudentIds],
            },
          },
        },
        select: {
          id: true,
          status: true,
          student: {
            select: {
              studentId: true,
            },
          },
        },
      });

      const recordsByStudentId = new Map(
        currentRecords.map((record) => [record.student.studentId, record])
      );

      for (const correction of corrections) {
        const currentRecord = recordsByStudentId.get(correction.studentId);

        if (!currentRecord) {
          throw new AppError(
            "Attendance record not found for a submitted student and session",
            404,
            { studentId: correction.studentId }
          );
        }

        if (currentRecord.status !== correction.expectedStatus) {
          throw new AppError(
            "Attendance changed since it was loaded; reload and try again",
            409,
            {
              studentId: correction.studentId,
              expectedStatus: correction.expectedStatus,
              actualStatus: currentRecord.status,
            }
          );
        }
      }

      const correctedAt = new Date();
      for (const correction of corrections) {
        const currentRecord = recordsByStudentId.get(correction.studentId)!;
        const updateResult = await tx.attendanceRecord.updateMany({
          where: {
            id: currentRecord.id,
            status: correction.expectedStatus,
          },
          data: {
            status: correction.status,
            method: "MANUAL",
            markedAt: correctedAt,
          },
        });

        if (updateResult.count !== 1) {
          throw new AppError(
            "Attendance changed while corrections were being saved; reload and try again",
            409,
            { studentId: correction.studentId }
          );
        }
      }

      const updatedRecords = await tx.attendanceRecord.findMany({
        where: {
          id: {
            in: currentRecords.map((record) => record.id),
          },
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

      const updatedRecordsByStudentId = new Map(
        updatedRecords.map((record) => [record.student.studentId, record])
      );

      return corrections.map(
        (correction) => updatedRecordsByStudentId.get(correction.studentId)!
      );
    });
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
        occurrenceDate: true,
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
          occurrenceDate: true,
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
            occurrenceDate: true,
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
        occurrenceDate: true,
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


// ==================================================
// AUTOMATED FACIAL-RECOGNITION FRAME
// ==================================================

export const processRecognitionFrameService = async (
  lecturerUserId: string,
  sessionId: string,
  frame: Express.Multer.File,
) => {
  const session = await prisma.attendanceSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      status: true,
      class: {
        select: {
          id: true,
          lecturerId: true,
          enrollments: {
            where: { status: "ONGOING" },
            select: {
              student: {
                select: {
                  id: true,
                  studentId: true,
                  firstName: true,
                  lastName: true,
                  faceRegistered: true,
                  faceEmbedding: { select: { encryptedEmbedding: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!session) throw new AppError("Attendance session not found", 404);
  if (session.class.lecturerId !== lecturerUserId) {
    throw new AppError("You are not authorized to manage this attendance session", 403);
  }
  if (session.status !== "OPEN") throw new AppError("This attendance session is closed", 400);

  const studentsByInternalId = new Map(
    session.class.enrollments.map(({ student }) => [student.id, student]),
  );
  const roster = session.class.enrollments
    .map(({ student }) => student)
    .filter((student) => student.faceRegistered && student.faceEmbedding)
    .map((student) => ({
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      encryptedEmbedding: Buffer.from(student.faceEmbedding!.encryptedEmbedding).toString("utf8"),
    }));

  const inference = await recognizeFrameWithInference(frame, roster);
  const matchedIds = [...new Set(
    inference.matches
      .map((match) => match.studentId)
      .filter((id) => studentsByInternalId.has(id)),
  )];

  const newlyMarkedIds = await prisma.$transaction(async (tx) => {
    const currentSession = await tx.attendanceSession.findUnique({
      where: { id: sessionId },
      select: { status: true, class: { select: { id: true, lecturerId: true } } },
    });
    if (!currentSession || currentSession.status !== "OPEN") {
      throw new AppError("This attendance session is closed", 409);
    }
    if (currentSession.class.lecturerId !== lecturerUserId) {
      throw new AppError("You are not authorized to manage this attendance session", 403);
    }

    const validEnrollments = await tx.enrollment.findMany({
      where: {
        classId: currentSession.class.id,
        studentId: { in: matchedIds },
        status: "ONGOING",
      },
      select: { studentId: true },
    });
    const validIds = validEnrollments.map((item) => item.studentId);
    const existing = await tx.attendanceRecord.findMany({
      where: { sessionId, studentId: { in: validIds } },
      select: { studentId: true },
    });
    const existingIds = new Set(existing.map((item) => item.studentId));
    const missingIds = validIds.filter((id) => !existingIds.has(id));
    if (missingIds.length) {
      const created = await tx.attendanceRecord.createManyAndReturn({
        data: missingIds.map((studentId) => ({
          sessionId,
          studentId,
          status: "PRESENT" as const,
          method: "FACIAL_RECOGNITION" as const,
        })),
        skipDuplicates: true,
        select: { studentId: true },
      });
      return created.map((record) => record.studentId);
    }
    return [];
  });

  const newlyMarked = newlyMarkedIds.length
    ? await prisma.attendanceRecord.findMany({
        where: { sessionId, studentId: { in: newlyMarkedIds } },
        select: {
          id: true,
          status: true,
          method: true,
          markedAt: true,
          student: { select: { studentId: true, firstName: true, lastName: true } },
        },
      })
    : [];

  return {
    frame: inference.frame,
    facesDetected: inference.facesDetected,
    processingTimeMs: inference.processingTimeMs,
    matches: inference.matches.flatMap((match) => {
      const student = studentsByInternalId.get(match.studentId);
      return student ? [{
        studentId: student.studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        distance: match.distance,
        box: match.box,
      }] : [];
    }),
    newlyMarked,
  };
};
