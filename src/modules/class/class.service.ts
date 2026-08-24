import prisma from "../../db/prisma.client.js";

import { AppError } from "../../utils/appError.js";

import type {
  CreateClassRequest,
  UpdateClassRequest,
} from "./class.types.js";


// -----------------------------
// TIME HELPER
// -----------------------------

const parseTime = (
  time: string
): Date => {
  const timeRegex =
    /^([01]\d|2[0-3]):([0-5]\d)$/;

  if (!timeRegex.test(time)) {
    throw new AppError(
      "Time must be in HH:mm format",
      400
    );
  }

  const [hours, minutes] =
    time.split(":").map(Number);

  const date = new Date(0);

  date.setUTCHours(
    hours,
    minutes,
    0,
    0
  );

  return date;
};


// -----------------------------
// CREATE CLASS
// -----------------------------

export const createClassService = async (
  data: CreateClassRequest
) => {
  const classCode =
    data.classCode
      .trim()
      .toUpperCase();

  const courseCode =
    data.courseCode
      .trim()
      .toUpperCase();

  const lecturerId =
    data.lecturerId
      .trim()
      .toUpperCase();

  const room =
    data.room.trim();


  if (!classCode) {
    throw new AppError(
      "Class code is required",
      400
    );
  }

  if (!room) {
    throw new AppError(
      "Room is required",
      400
    );
  }


  // Validate academic year
  const currentYear =
    new Date().getFullYear();

  if (
    !Number.isInteger(data.year) ||
    data.year < currentYear ||
    data.year > currentYear + 1
  ) {
    throw new AppError(
      `Academic year must be between ${currentYear} and ${currentYear + 1}`,
      400
    );
  }


  // Validate capacity
  if (
    !Number.isInteger(data.maxCapacity) ||
    data.maxCapacity <= 0
  ) {
    throw new AppError(
      "Maximum capacity must be a positive integer",
      400
    );
  }


  // Validate schedule days
  if (
    !data.scheduleDays ||
    data.scheduleDays.length === 0
  ) {
    throw new AppError(
      "At least one schedule day is required",
      400
    );
  }

  const scheduleDays = [
    ...new Set(data.scheduleDays),
  ];


  // Validate time
  const startTime =
    parseTime(data.startTime);

  const endTime =
    parseTime(data.endTime);

  if (startTime >= endTime) {
    throw new AppError(
      "End time must be after start time",
      400
    );
  }


  // Find Course
  const course =
    await prisma.course.findUnique({
      where: {
        courseCode,
      },
    });

  if (!course) {
    throw new AppError(
      "Course not found",
      404
    );
  }

  if (course.status === "ARCHIVED") {
    throw new AppError(
      "Cannot create a class for an archived course",
      400
    );
  }


  // Find Lecturer
  const lecturer =
    await prisma.lecturer.findUnique({
      where: {
        lecturerId,
      },
    });

  if (!lecturer) {
    throw new AppError(
      "Lecturer not found",
      404
    );
  }


  // Find Academic Term
  const academicTerm =
    await prisma.academicTerm.findUnique({
      where: {
        semester_year: {
          semester: data.semester,
          year: data.year,
        },
      },
    });

  if (!academicTerm) {
    throw new AppError(
      "Academic term not found",
      404
    );
  }


  // Duplicate class code check
  // Same classCode is allowed in a different term.
  const existingClass =
    await prisma.class.findUnique({
      where: {
        classCode_academicTermId: {
          classCode,
          academicTermId:
            academicTerm.id,
        },
      },
    });

  if (existingClass) {
    throw new AppError(
      "A class with this code already exists in this academic term",
      409
    );
  }


  // Lecturer schedule conflict
  const conflictingClass =
    await prisma.class.findFirst({
      where: {
        lecturerId:
          lecturer.id,

        academicTermId:
          academicTerm.id,

        scheduleDays: {
          hasSome:
            scheduleDays,
        },

        startTime: {
          lt: endTime,
        },

        endTime: {
          gt: startTime,
        },
      },
    });

  if (conflictingClass) {
    throw new AppError(
      "Lecturer has another class during this time",
      409
    );
  }


  // Create
  const classRecord =
    await prisma.class.create({
      data: {
        classCode,

        courseId:
          course.id,

        lecturerId:
          lecturer.id,

        academicTermId:
          academicTerm.id,

        scheduleDays,

        startTime,
        endTime,

        room,

        maxCapacity:
          data.maxCapacity,
      },

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
            startDate: true,
            endDate: true,
          },
        },

        scheduleDays: true,
        startTime: true,
        endTime: true,

        room: true,
        maxCapacity: true,
      },
    });

  return classRecord;
};


// -----------------------------
// GET ONE CLASS
// -----------------------------

export const getClassService = async (
  id: string
) => {
  const classRecord =
    await prisma.class.findUnique({
      where: {
        id,
      },

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
        maxCapacity: true,
      },
    });

  if (!classRecord) {
    throw new AppError(
      "Class not found",
      404
    );
  }

  return classRecord;
};


// -----------------------------
// ADMIN: GET ALL CLASSES
// -----------------------------

export const getAllClassesService =
  async () => {
    return prisma.class.findMany({
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
        maxCapacity: true,
      },

      orderBy: {
        classCode: "asc",
      },
    });
  };


// -----------------------------
// LECTURER: CURRENT CLASSES
// -----------------------------

export const getMyCurrentClassesService =
  async (
    lecturerUserId: string
  ) => {
    const today =
      new Date();

    const currentTerm =
      await prisma.academicTerm.findFirst({
        where: {
          startDate: {
            lte: today,
          },

          endDate: {
            gte: today,
          },
        },
      });

    if (!currentTerm) {
      return [];
    }

    return prisma.class.findMany({
      where: {
        lecturerId:
          lecturerUserId,

        academicTermId:
          currentTerm.id,
      },

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

        scheduleDays: true,
        startTime: true,
        endTime: true,
        room: true,
      },

      orderBy: {
        classCode: "asc",
      },
    });
  };


// -----------------------------
// LECTURER: CLASS HISTORY
// -----------------------------

export const getMyClassHistoryService =
  async (
    lecturerUserId: string
  ) => {
    const today =
      new Date();

    return prisma.class.findMany({
      where: {
        lecturerId:
          lecturerUserId,

        academicTerm: {
          endDate: {
            lt: today,
          },
        },
      },

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

        scheduleDays: true,
        startTime: true,
        endTime: true,
        room: true,
      },

      orderBy: {
        academicTerm: {
          endDate: "desc",
        },
      },
    });
  };


// -----------------------------
// STUDENT: AVAILABLE CLASSES
// -----------------------------

export const getAvailableClassesService =
  async () => {
    const today =
      new Date();

    const currentTerm =
      await prisma.academicTerm.findFirst({
        where: {
          startDate: {
            lte: today,
          },

          endDate: {
            gte: today,
          },
        },
      });

    if (!currentTerm) {
      return [];
    }

    return prisma.class.findMany({
      where: {
        academicTermId:
          currentTerm.id,

        course: {
          status: "ACTIVE",
        },
      },

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
          },
        },

        scheduleDays: true,
        startTime: true,
        endTime: true,

        room: true,
        maxCapacity: true,
      },

      orderBy: {
        classCode: "asc",
      },
    });
  };


// -----------------------------
// UPDATE CLASS
// -----------------------------

export const updateClassService = async (
  id: string,
  data: UpdateClassRequest
) => {
  const classRecord =
    await prisma.class.findUnique({
      where: {
        id,
      },
    });

  if (!classRecord) {
    throw new AppError(
      "Class not found",
      404
    );
  }


  // Find lecturer if changing
  let lecturerId:
    | string
    | undefined;

  if (data.lecturerId) {
    const lecturer =
      await prisma.lecturer.findUnique({
        where: {
          lecturerId:
            data.lecturerId
              .trim()
              .toUpperCase(),
        },
      });

    if (!lecturer) {
      throw new AppError(
        "Lecturer not found",
        404
      );
    }

    lecturerId =
      lecturer.id;
  }


  // Calculate final times
  const startTime =
    data.startTime
      ? parseTime(
          data.startTime
        )
      : classRecord.startTime;

  const endTime =
    data.endTime
      ? parseTime(
          data.endTime
        )
      : classRecord.endTime;

  if (startTime >= endTime) {
    throw new AppError(
      "End time must be after start time",
      400
    );
  }


  // Final schedule days
  const scheduleDays =
    data.scheduleDays
      ? [
          ...new Set(
            data.scheduleDays
          ),
        ]
      : classRecord.scheduleDays;

  if (
    scheduleDays.length === 0
  ) {
    throw new AppError(
      "At least one schedule day is required",
      400
    );
  }


  // Validate capacity
  if (
    data.maxCapacity !== undefined &&
    (
      !Number.isInteger(
        data.maxCapacity
      ) ||
      data.maxCapacity <= 0
    )
  ) {
    throw new AppError(
      "Maximum capacity must be a positive integer",
      400
    );
  }


  const finalLecturerId =
    lecturerId ??
    classRecord.lecturerId;


  // Schedule conflict
  // Exclude the class being edited.
  const conflictingClass =
    await prisma.class.findFirst({
      where: {
        id: {
          not:
            classRecord.id,
        },

        lecturerId:
          finalLecturerId,

        academicTermId:
          classRecord.academicTermId,

        scheduleDays: {
          hasSome:
            scheduleDays,
        },

        startTime: {
          lt:
            endTime,
        },

        endTime: {
          gt:
            startTime,
        },
      },
    });

  if (conflictingClass) {
    throw new AppError(
      "Lecturer has another class during this time",
      409
    );
  }


  return prisma.class.update({
    where: {
      id,
    },

    data: {
      lecturerId,

      scheduleDays:
        data.scheduleDays
          ? scheduleDays
          : undefined,

      startTime:
        data.startTime
          ? startTime
          : undefined,

      endTime:
        data.endTime
          ? endTime
          : undefined,

      room:
        data.room?.trim(),

      maxCapacity:
        data.maxCapacity,
    },

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
      maxCapacity: true,
    },
  });
};


// -----------------------------
// DELETE CLASS
// -----------------------------

export const deleteClassService =
  async (
    id: string
  ) => {
    const classRecord =
      await prisma.class.findUnique({
        where: {
          id,
        },

        select: {
          id: true,
          classCode: true,

          course: {
            select: {
              courseCode: true,
            },
          },

          academicTerm: {
            select: {
              semester: true,
              year: true,
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

    await prisma.class.delete({
      where: {
        id,
      },
    });

    return classRecord;
  };

  //get students in  a class

  export const getClassStudentsService = async (
  classId: string,
  reader: {
    userId: string;
    role: "SUPER_ADMIN" | "ADMIN" | "LECTURER" | "STUDENT";
  }
) => {
  const classRecord = await prisma.class.findUnique({
    where: {
      id: classId,
    },

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
  });

  if (!classRecord) {
    throw new AppError(
      "Class not found",
      404
    );
  }

  // Lecturer can only view students from their own class.
  // classRecord.lecturerId is the lecturer's internal UUID,
  // which matches req.user.userId.
  if (
    reader.role === "LECTURER" &&
    classRecord.lecturerId !== reader.userId
  ) {
    throw new AppError(
      "You are not authorized to view students in this class",
      403
    );
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      classId: classRecord.id,
      status: "ONGOING",
    },

    select: {
      student: {
        select: {
          studentId: true,
          firstName: true,
          lastName: true,
          email: true,

          major: {
            select: {
              majorCode: true,
              majorName: true,
            },
          },
        },
      },
    },

    orderBy: {
      student: {
        firstName: "asc",
      },
    },
  });

  const students = enrollments.map(
    (enrollment) => enrollment.student
  );

  return {
    class: {
      id: classRecord.id,
      classCode: classRecord.classCode,

      courseCode:
        classRecord.course.courseCode,

      courseName:
        classRecord.course.courseName,

      semester:
        classRecord.academicTerm.semester,

      year:
        classRecord.academicTerm.year,
    },

    students,
  };
};