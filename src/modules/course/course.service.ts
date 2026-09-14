import prisma from "../../db/prisma.client.js";

import { AppError } from "../../utils/appError.js";

import { CreateCourseRequest, UpdateCourseRequest } from "./course.types.js";



//Create Course
export const createCourseService = async (
  data: CreateCourseRequest
) => {
  const courseCode = data.courseCode
    .trim()
    .toUpperCase();

  const courseName = data.courseName.trim();

  const description =
    data.description?.trim();


  if (!courseCode) {
    throw new AppError(
      "Course code is required",
      400
    );
  }

  if (!courseName) {
    throw new AppError(
      "Course name is required",
      400
    );
  }

  if (
    !Number.isInteger(data.creditPoints) ||
    data.creditPoints <= 0
  ) {
    throw new AppError(
      "Credit points must be a positive integer",
      400
    );
  }
  // Check duplicate course code
  const existingCourse =
    await prisma.course.findUnique({
      where: {
        courseCode,
      },
    });

  if (existingCourse) {
    throw new AppError(
      "A course with this code already exists",
      409
    );
  }


  // Normalize major codes
  const majorCodes = [
    ...new Set(
      data.majorCodes.map(
        code => code.trim().toUpperCase()
      )
    ),
  ];

  if (majorCodes.length === 0) {
    throw new AppError(
      "At least one major is required",
      400
    );
  }

  // Find majors
  const majors = await prisma.major.findMany({
    where: {
      majorCode: {
        in: majorCodes,
      },
    },
  });


  if (majors.length !== majorCodes.length) {
    throw new AppError(
      "One or more majors were not found",
      404
    );
  }


  // Normalize prerequisite codes
  const prerequisiteCodes = [
    ...new Set(
      (data.prerequisiteCodes ?? []).map(
        code => code.trim().toUpperCase()
      )
    ),
  ];

  // Prevent course from requiring itself
  if (
    prerequisiteCodes.includes(courseCode)
  ) {
    throw new AppError(
      "A course cannot be its own prerequisite",
      400
    );
  }

  // Find prerequisite courses
  const prerequisiteCourses =
    prerequisiteCodes.length > 0
      ? await prisma.course.findMany({
          where: {
            courseCode: {
              in: prerequisiteCodes,
            },
          },
        })
      : [];


  if (
    prerequisiteCourses.length !==
    prerequisiteCodes.length
  ) {
    throw new AppError(
      "One or more prerequisite courses were not found",
      404
    );
  }

  // Create course + relationships
  const course = await prisma.course.create({
    data: {
      courseCode,
      courseName,
      description,
      creditPoints: data.creditPoints,

      majors: {
        connect: majors.map(
          major => ({
            id: major.id,
          })
        ),
      },

      prerequisites: {
        create: prerequisiteCourses.map(
          prerequisite => ({
            prerequisiteCourse: {
              connect: {
                id: prerequisite.id,
              },
            },
          })
        ),
      },
    },

    include: {
      majors: {
        select: {
          majorCode: true,
          majorName: true,
        },
      },

      prerequisites: {
        include: {
          prerequisiteCourse: {
            select: {
              courseCode: true,
              courseName: true,
            },
          },
        },
      },
    },
  });

  return course;
};

//Get one Course

export const getCourseService = async (
  courseCode: string
) => {
  const course = await prisma.course.findUnique({
    where: {
      courseCode: courseCode
        .trim()
        .toUpperCase(),
    },

    select: {
      courseCode: true,
      courseName: true,
      description: true,
      creditPoints: true,
      status: true,

      majors: {
        select: {
          majorCode: true,
          majorName: true,
        },
      },

      prerequisites: {
        select: {
          prerequisiteCourse: {
            select: {
              courseCode: true,
              courseName: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    throw new AppError(
      "Course not found",
      404
    );
  }

  return course;
};

// Get all courses
export const getAllCoursesService = async () => {
  return prisma.course.findMany({
    select: {
      courseCode: true,
      courseName: true,
      creditPoints: true,
      status: true,

      majors: {
        select: {
          majorCode: true,
        },
      },
    },

    orderBy: {
      courseCode: "asc",
    },
  });
};

//Update Course

export const updateCourseService = async (
  courseCode: string,
  data: UpdateCourseRequest
) => {
  const normalizedCourseCode =
    courseCode.trim().toUpperCase();

  // Check course exists
  const course = await prisma.course.findUnique({
    where: {
      courseCode: normalizedCourseCode,
    },
  });

  if (!course) {
    throw new AppError(
      "Course not found",
      404
    );
  }

  // Validate credit points if provided
  if (
    data.creditPoints !== undefined &&
    (
      !Number.isInteger(data.creditPoints) ||
      data.creditPoints <= 0
    )
  ) {
    throw new AppError(
      "Credit points must be a positive integer",
      400
    );
  }

  //Major

  let majorConnections:
    | { set: { id: string }[] }
    | undefined;

  if (data.majorCodes !== undefined) {
    const majorCodes = [
      ...new Set(
        data.majorCodes.map((code) =>
          code.trim().toUpperCase()
        )
      ),
    ];

    if (majorCodes.length === 0) {
      throw new AppError(
        "At least one major is required",
        400
      );
    }

    const majors = await prisma.major.findMany({
      where: {
        majorCode: {
          in: majorCodes,
        },
      },

      select: {
        id: true,
        majorCode: true,
      },
    });

    if (majors.length !== majorCodes.length) {
      throw new AppError(
        "One or more majors were not found",
        404
      );
    }

    majorConnections = {
      set: majors.map((major) => ({
        id: major.id,
      })),
    };
  }

  //prerequisite

  let prerequisiteCourses:
    | {
        id: string;
        courseCode: string;
      }[]
    | undefined;

  if (data.prerequisiteCodes !== undefined) {
    const prerequisiteCodes = [
      ...new Set(
        data.prerequisiteCodes.map((code) =>
          code.trim().toUpperCase()
        )
      ),
    ];

    // Prevent course depending on itself
    if (
      prerequisiteCodes.includes(
        normalizedCourseCode
      )
    ) {
      throw new AppError(
        "A course cannot be its own prerequisite",
        400
      );
    }

    prerequisiteCourses =
      prerequisiteCodes.length > 0
        ? await prisma.course.findMany({
            where: {
              courseCode: {
                in: prerequisiteCodes,
              },
            },

            select: {
              id: true,
              courseCode: true,
            },
          })
        : [];

    if (
      prerequisiteCourses.length !==
      prerequisiteCodes.length
    ) {
      throw new AppError(
        "One or more prerequisite courses were not found",
        404
      );
    }
  }

  // If prerequisiteCodes was provided,
  // replace the existing prerequisite relationships
  if (prerequisiteCourses !== undefined) {
    await prisma.coursePrerequisite.deleteMany({
      where: {
        courseId: course.id,
      },
    });

    if (prerequisiteCourses.length > 0) {
      await prisma.coursePrerequisite.createMany({
        data: prerequisiteCourses.map(
          (prerequisite) => ({
            courseId: course.id,
            prerequisiteCourseId:
              prerequisite.id,
          })
        ),
      });
    }
  }

  //Update Course

  const updatedCourse =
    await prisma.course.update({
      where: {
        id: course.id,
      },

      data: {
        courseName:
          data.courseName?.trim(),

        description:
          data.description?.trim(),

        creditPoints:
          data.creditPoints,

        majors:
          majorConnections,
      },

      include: {
        majors: {
          select: {
            majorCode: true,
            majorName: true,
          },
        },

        prerequisites: {
          include: {
            prerequisiteCourse: {
              select: {
                courseCode: true,
                courseName: true,
              },
            },
          },
        },
      },
    });

  return updatedCourse;
};

//Delete Course
export const deleteCourseService = async (
  courseCode: string
) => {
  const normalizedCourseCode =
    courseCode.trim().toUpperCase();

  const course = await prisma.course.findUnique({
    where: {
      courseCode: normalizedCourseCode,
    },
    include: {
      _count: {
        select: {
          classes: true,
        },
      },
    },
  });

  if (!course) {
    throw new AppError(
      "Course not found",
      404
    );
  }

  if (course._count.classes > 0) {
    throw new AppError(
      "Cannot delete this course because classes are associated with it. Archive the course instead",
      409,
      {
        classCount: course._count.classes,
      }
    );
  }

  await prisma.course.delete({
    where: {
      id: course.id,
    },
  });

  return {
    courseCode: course.courseCode,
    courseName: course.courseName,
  };
};

//Archive Course

export const archiveCourseService = async (
  courseCode: string
) => {
  const course =
    await prisma.course.findUnique({
      where: {
        courseCode:
          courseCode
            .trim()
            .toUpperCase(),
      },
    });

  if (!course) {
    throw new AppError(
      "Course not found",
      404
    );
  }

  return prisma.course.update({
    where: {
      id: course.id,
    },

    data: {
      status: "ARCHIVED",
    },

    select: {
      courseCode: true,
      courseName: true,
      status: true,
    },
  });
};

// Unarchive Course
export const unarchiveCourseService = async (
  courseCode: string
) => {
  const course =
    await prisma.course.findUnique({
      where: {
        courseCode:
          courseCode
            .trim()
            .toUpperCase(),
      },
    });

  if (!course) {
    throw new AppError(
      "Course not found",
      404
    );
  }

  return prisma.course.update({
    where: {
      id: course.id,
    },

    data: {
      status: "ACTIVE",
    },

    select: {
      courseCode: true,
      courseName: true,
      status: true,
    },
  });
};
