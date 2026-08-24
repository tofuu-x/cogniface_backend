import prisma from "../../db/prisma.client.js";

import { AppError } from "../../utils/appError.js";

import type {
  CreateEnrollmentRequest,
} from "./enrollment.types.js";

//Create Enrollment
export const createEnrollmentService = async (
  studentUserId: string,
  data: CreateEnrollmentRequest
) => {

  //1. Find logged in student

  const student = await prisma.student.findUnique({
    where: {
      id: studentUserId,
    },

    select: {
      id: true,
      studentId: true,
      majorId: true,
    },
  });


  if (!student) {
    throw new AppError(
      "Student not found",
      404
    );
  }


  // 2. Find class

  const classRecord = await prisma.class.findUnique({
    where: {
      id: data.classId,
    },

    include: {

      course: {
        include: {

          majors: {
            select: {
              id: true,
              majorCode: true,
            },
          },

          prerequisites: {
            include: {

              prerequisiteCourse: {
                select: {
                  id: true,
                  courseCode: true,
                  courseName: true,
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
    throw new AppError(
      "Class not found",
      404
    );
  }


  //3. Course must be active

  if (classRecord.course.status !== "ACTIVE") {
    throw new AppError(
      "This course is not available for enrollment",
      400
    );
  }


  //4. Class must belong to student's major

  const courseBelongsToMajor =
    classRecord.course.majors.some(
      (major) =>
        major.id === student.majorId
    );


  if (!courseBelongsToMajor) {
    throw new AppError(
      "This course is not available for your major",
      403
    );
  }


  //5. Academic term must be current

  const today = new Date();

  if (
    today < classRecord.academicTerm.startDate ||
    today > classRecord.academicTerm.endDate
  ) {
    throw new AppError(
      "Enrollment is not available for this academic term",
      400
    );
  }


  // 6. Check exact class enrollment

  const existingClassEnrollment =
    await prisma.enrollment.findUnique({

      where: {
        studentId_classId: {
          studentId:
            student.id,

          classId:
            classRecord.id,
        },
      },

    });


  if (
    existingClassEnrollment?.status === "ONGOING"
  ) {
    throw new AppError(
      "You are already enrolled in this class",
      409
    );
  }

  // 7. Prevent enrolling in another section of same course

  const existingCourseEnrollment =
    await prisma.enrollment.findFirst({

      where: {

        studentId:
          student.id,

        status:
          "ONGOING",

        class: {

          courseId:
            classRecord.courseId,

          academicTermId:
            classRecord.academicTermId,

        },

      },

    });


  if (existingCourseEnrollment) {
    throw new AppError(
      "You are already enrolled in another class of this course",
      409
    );
  }


  // 8. check prerequisites

  const prerequisites =
    classRecord.course.prerequisites;


  if (prerequisites.length > 0) {

    const prerequisiteCourseIds =
      prerequisites.map(
        (prerequisite) =>
          prerequisite.prerequisiteCourse.id
      );


    const completedPrerequisites =
      await prisma.enrollment.findMany({

        where: {

          studentId:
            student.id,

          status:
            "COMPLETED",

          class: {

            courseId: {
              in:
                prerequisiteCourseIds,
            },

          },

        },

        select: {

          class: {
            select: {
              courseId: true,
            },
          },

        },

      });


    const completedCourseIds =
      new Set(
        completedPrerequisites.map(
          (enrollment) =>
            enrollment.class.courseId
        )
      );


    const missingPrerequisites =
      prerequisites.filter(
        (prerequisite) =>
          !completedCourseIds.has(
            prerequisite
              .prerequisiteCourse
              .id
          )
      );


    if (missingPrerequisites.length > 0) {

      const missingCodes =
        missingPrerequisites.map(
          (prerequisite) =>
            prerequisite
              .prerequisiteCourse
              .courseCode
        );


      throw new AppError(
        `Missing prerequisites: ${missingCodes.join(", ")}`,
        400
      );
    }
  }


  
  // 9. Check class capacity
  

  const currentEnrollmentCount =
    await prisma.enrollment.count({

      where: {

        classId:
          classRecord.id,

        status:
          "ONGOING",

      },

    });


  if (
    currentEnrollmentCount >=
    classRecord.maxCapacity
  ) {
    throw new AppError(
      "This class is full",
      409
    );
  }


  // 10. Check timetable conflict
  

  const timetableConflict =
    await prisma.enrollment.findFirst({

      where: {

        studentId:
          student.id,

        status:
          "ONGOING",

        class: {

          academicTermId:
            classRecord.academicTermId,

          scheduleDays: {
            hasSome:
              classRecord.scheduleDays,
          },

          startTime: {
            lt:
              classRecord.endTime,
          },

          endTime: {
            gt:
              classRecord.startTime,
          },

        },

      },

      include: {

        class: {
          select: {
            classCode: true,
          },
        },

      },

    });


  if (timetableConflict) {
    throw new AppError(
      `Schedule conflict with ${timetableConflict.class.classCode}`,
      409
    );
  }


  
  // 11. Create / restore enrollment
  

  let enrollment;


  if (existingClassEnrollment) {

    // Student previously dropped this exact class.
    // Reuse the existing record because of:
    //
    // @@unique([studentId, classId])

    enrollment =
      await prisma.enrollment.update({

        where: {
          id:
            existingClassEnrollment.id,
        },

        data: {
          status:
            "ONGOING",

          droppedAt:
            null,

          enrolledAt:
            new Date(),
        },

        select: {
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
        },
      });

  } else {

    enrollment =
      await prisma.enrollment.create({

        data: {

          studentId:
            student.id,

          classId:
            classRecord.id,

        },

        select: {
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
        },
      });
  }


  return enrollment;
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