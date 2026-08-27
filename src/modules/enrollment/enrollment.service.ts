import prisma from "../../db/prisma.client.js";

import { AppError } from "../../utils/appError.js";

import type {
  CreateEnrollmentRequest,
} from "./enrollment.types.js";

const MAX_COURSES_PER_TERM = 4;
const MAX_TRANSACTION_ATTEMPTS = 3;

const getToday = () => {
  const now = new Date();
  return new Date(Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ));
};

const enrollmentSelect = {
  id: true,
  status: true,
  enrolledAt: true,
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
      lecturer: {
        select: {
          lecturerId: true,
          firstName: true,
          lastName: true,
        },
      },
      scheduleDays: true,
      startTime: true,
      endTime: true,
      room: true,
    },
  },
} as const;

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

//Create Enrollment
export const createEnrollmentService = async (
  studentUserId: string,
  data: CreateEnrollmentRequest
) => {
  if (
    typeof data.classId !== "string" ||
    !data.classId.trim()
  ) {
    throw new AppError("classId is required", 400);
  }

  for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const student = await tx.student.findUnique({
            where: { id: studentUserId },
            select: { id: true, majorId: true },
          });

          if (!student) {
            throw new AppError("Student not found", 404);
          }

          const classRecord = await tx.class.findUnique({
            where: { id: data.classId },
            include: {
              course: {
                include: {
                  majors: { select: { id: true } },
                  prerequisites: {
                    include: {
                      prerequisiteCourse: {
                        select: {
                          id: true,
                          courseCode: true,
                        },
                      },
                    },
                  },
                },
              },
              academicTerm: true,
            },
          });

          if (!classRecord) {
            throw new AppError("Class not found", 404);
          }

          if (classRecord.course.status !== "ACTIVE") {
            throw new AppError(
              "This course is not available for enrollment",
              400
            );
          }

          if (
            !classRecord.course.majors.some(
              (major) => major.id === student.majorId
            )
          ) {
            throw new AppError(
              "This course is not available for your major",
              403
            );
          }

          const now = new Date();
          const today = getToday();

          if (
            today < classRecord.academicTerm.startDate ||
            today > classRecord.academicTerm.endDate
          ) {
            throw new AppError(
              "Enrollment is not available for this academic term",
              400
            );
          }

          const existingClassEnrollment =
            await tx.enrollment.findUnique({
              where: {
                studentId_classId: {
                  studentId: student.id,
                  classId: classRecord.id,
                },
              },
            });

          if (existingClassEnrollment?.status === "ONGOING") {
            throw new AppError(
              "You are already enrolled in this class",
              409
            );
          }

          const completedCourseEnrollment =
            await tx.enrollment.findFirst({
              where: {
                studentId: student.id,
                status: "COMPLETED",
                class: { courseId: classRecord.courseId },
              },
            });

          if (completedCourseEnrollment) {
            throw new AppError(
              "You have already completed this course",
              409
            );
          }

          const existingCourseEnrollment =
            await tx.enrollment.findFirst({
              where: {
                studentId: student.id,
                status: "ONGOING",
                class: { courseId: classRecord.courseId },
              },
            });

          if (existingCourseEnrollment) {
            throw new AppError(
              "You are already enrolled in this course",
              409
            );
          }

          const prerequisiteCourseIds =
            classRecord.course.prerequisites.map(
              (prerequisite) =>
                prerequisite.prerequisiteCourse.id
            );

          if (prerequisiteCourseIds.length > 0) {
            const completedPrerequisites =
              await tx.enrollment.findMany({
                where: {
                  studentId: student.id,
                  status: "COMPLETED",
                  class: {
                    courseId: { in: prerequisiteCourseIds },
                  },
                },
                select: {
                  class: { select: { courseId: true } },
                },
              });
            const completedCourseIds = new Set(
              completedPrerequisites.map(
                (enrollment) => enrollment.class.courseId
              )
            );
            const missingCodes =
              classRecord.course.prerequisites
                .filter(
                  (prerequisite) =>
                    !completedCourseIds.has(
                      prerequisite.prerequisiteCourse.id
                    )
                )
                .map(
                  (prerequisite) =>
                    prerequisite.prerequisiteCourse.courseCode
                );

            if (missingCodes.length > 0) {
              throw new AppError(
                `Missing prerequisites: ${missingCodes.join(", ")}`,
                400
              );
            }
          }

          const currentEnrollmentCount =
            await tx.enrollment.count({
              where: {
                classId: classRecord.id,
                status: "ONGOING",
              },
            });

          if (currentEnrollmentCount >= classRecord.maxCapacity) {
            throw new AppError("This class is full", 409);
          }

          const timetableConflict =
            await tx.enrollment.findFirst({
              where: {
                studentId: student.id,
                status: "ONGOING",
                class: {
                  academicTermId: classRecord.academicTermId,
                  scheduleDays: {
                    hasSome: classRecord.scheduleDays,
                  },
                  startTime: { lt: classRecord.endTime },
                  endTime: { gt: classRecord.startTime },
                },
              },
              select: {
                class: { select: { classCode: true } },
              },
            });

          if (timetableConflict) {
            throw new AppError(
              `Schedule conflict with ${timetableConflict.class.classCode}`,
              409
            );
          }

          const currentTermEnrollmentCount =
            await tx.enrollment.count({
              where: {
                studentId: student.id,
                status: "ONGOING",
                class: {
                  academicTermId: classRecord.academicTermId,
                },
              },
            });

          if (currentTermEnrollmentCount >= MAX_COURSES_PER_TERM) {
            throw new AppError(
              `Maximum course load of ${MAX_COURSES_PER_TERM} courses per academic term has been reached`,
              409
            );
          }

          if (existingClassEnrollment) {
            return tx.enrollment.update({
              where: { id: existingClassEnrollment.id },
              data: {
                status: "ONGOING",
                droppedAt: null,
                enrolledAt: now,
              },
              select: enrollmentSelect,
            });
          }

          return tx.enrollment.create({
            data: {
              studentId: student.id,
              classId: classRecord.id,
            },
            select: enrollmentSelect,
          });
        },
        { isolationLevel: "Serializable" }
      );
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      const code = getPrismaErrorCode(error);

      if (code === "P2002") {
        throw new AppError(
          "You are already enrolled in this class",
          409
        );
      }

      if (code !== "P2034" || attempt === MAX_TRANSACTION_ATTEMPTS) {
        if (code === "P2034") {
          throw new AppError(
            "Enrollment could not be completed because availability changed; please try again",
            409
          );
        }

        throw error;
      }
    }
  }

  throw new AppError(
    "Enrollment could not be completed because availability changed; please try again",
    409
  );
};




// GET MY ENROLLMENTS


export const getMyEnrollmentsService = async (
  studentUserId: string
) => {

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


  return prisma.enrollment.findMany({

    where: {
      studentId:
        student.id,
    },

    select: {

      id: true,

      status: true,

      enrolledAt: true,

      droppedAt: true,

      class: {

        select: {

          id: true,

          classCode: true,

          course: {

            select: {
              courseCode: true,
              courseName: true,
              creditPoints: true,
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
              startDate: true,
              endDate: true,
            },

          },

          scheduleDays: true,

          startTime: true,

          endTime: true,

          room: true,

        },

      },

    },

    orderBy: {
      enrolledAt:
        "desc",
    },

  });
};


// DROP ENROLLMENT

export const dropEnrollmentService = async (
  studentUserId: string,
  enrollmentId: string
) => {

  const enrollment =
    await prisma.enrollment.findUnique({

      where: {
        id:
          enrollmentId,
      },

      include: {

        class: {
          include: {
            academicTerm: true,
          },
        },

      },

    });


  if (!enrollment) {
    throw new AppError(
      "Enrollment not found",
      404
    );
  }


  // Make sure student owns the enrollment
  if (
    enrollment.studentId !==
    studentUserId
  ) {
    throw new AppError(
      "You are not authorized to drop this enrollment",
      403
    );
  }


  if (
    enrollment.status !==
    "ONGOING"
  ) {
    throw new AppError(
      "Only ongoing enrollments can be dropped",
      400
    );
  }


  // Temporary rule:
  // Don't allow dropping once the term has ended.
  //
  // Later, if you add a real dropDeadline
  // to AcademicTerm, use that instead.

  if (
    new Date() >
    enrollment.class
      .academicTerm
      .endDate
  ) {
    throw new AppError(
      "This class can no longer be dropped",
      400
    );
  }


  const droppedEnrollment =
    await prisma.enrollment.update({

      where: {
        id:
          enrollment.id,
      },

      data: {

        status:
          "DROPPED",

        droppedAt:
          new Date(),

      },

      select: {

        id: true,

        status: true,

        droppedAt: true,

        class: {

          select: {

            classCode: true,

            course: {

              select: {
                courseCode: true,
                courseName: true,
              },

            },

          },

        },

      },

    });


  return droppedEnrollment;
};
