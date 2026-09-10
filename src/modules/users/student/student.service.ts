import prisma from "../../../db/prisma.client.js";

import { AppError } from "../../../utils/appError.js";

import { hashPassword } from "../../../utils/auth.js";
import {
  generateRandomNumber,
  generateTemporaryPassword,
} from "../../../utils/crypto.js";
import { sendPasswordAccessEmail } from "../../../services/password.service.js";

import type { CreateStudentRequest,
  UpdateStudentRequest,
  StudentReader,
  GetStudentResponse
 } from "./student.types.js";

//Generate student ID
const generateStudentId = async(
  enrollmentYear : number
) : Promise<string> => {
  let studentId: string;

  do {
    const randomNumber = generateRandomNumber(10000,
      100000);

    studentId = `S${enrollmentYear}${randomNumber}`;
  } while (
    await prisma.student.findUnique({
      where: {
        studentId,
      },
    })
  );

  return studentId;
}

//Create Student

export const createStudentService = async(
  data: CreateStudentRequest
) => {
  //Normalize input
  const firstName = data.firstName.trim();
  const lastName = data.lastName.trim();
  const email = data.email.trim().toLowerCase();
  const phoneNumber = data.phoneNumber.trim();
  const majorCode = data.majorCode.trim().toUpperCase();

  //Validate date of birth
  const dateOfBirth = new Date(data.dateOfBirth);

  if (Number.isNaN(dateOfBirth.getTime())){
    throw new AppError("Invalid date of birth", 400);
  }

  if (dateOfBirth > new Date()){
    throw new AppError(
      "Date of birth cannot be in the future", 400
    );
  }

  // Validate enrollment year
  // Allows next year's intake
  const currentYear = new Date().getFullYear();

  if (
    !Number.isInteger(data.enrollmentYear) ||
    data.enrollmentYear < 2000 ||
    data.enrollmentYear > currentYear + 1
  ) {
    throw new AppError(
      `Enrollment year must be between 2000 and ${currentYear + 1}`,
      400
    );
  }

  // Check that major exists
  const major = await prisma.major.findUnique({
    where: {
      majorCode,
    },
  });

  if (!major) {
    throw new AppError(
      "Major not found",
      404
    );
  }

  // Check email across all user types
  const [
    existingAdminEmail,
    existingLecturerEmail,
    existingStudentEmail,
  ] = await Promise.all([
    prisma.admin.findUnique({
      where: {
        email,
      },
    }),

    prisma.lecturer.findUnique({
      where: {
        email,
      },
    }),

    prisma.student.findUnique({
      where: {
        email,
      },
    }),
  ]);

  if (
    existingAdminEmail ||
    existingLecturerEmail ||
    existingStudentEmail
  ) {
    throw new AppError(
      "A user with this email already exists",
      409
    );
  }

  // Check phone number across all user types
  const [
    existingAdminPhone,
    existingLecturerPhone,
    existingStudentPhone,
  ] = await Promise.all([
    prisma.admin.findUnique({
      where: {
        phoneNumber,
      },
    }),

    prisma.lecturer.findUnique({
      where: {
        phoneNumber,
      },
    }),

    prisma.student.findUnique({
      where: {
        phoneNumber,
      },
    }),
  ]);

  if (
    existingAdminPhone ||
    existingLecturerPhone ||
    existingStudentPhone
  ) {
    throw new AppError(
      "A user with this phone number already exists",
      409
    );
  }


  // Generate student ID
  const studentId = await generateStudentId(
    data.enrollmentYear
  );


  // Generate temporary password
  const temporaryPassword =
    generateTemporaryPassword();


  // Hash temporary password
  const hashedPassword = await hashPassword(
    temporaryPassword
  );

  // Create student
  const student = await prisma.student.create({
    data: {
      studentId,
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phoneNumber,
      dateOfBirth,
      enrollmentYear: data.enrollmentYear,

      // majorCode was received by API.
      // Store the Major's UUID internally.
      majorId: major.id,
    },

    select: {
      id: true,
      studentId: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      dateOfBirth: true,
      enrollmentYear: true,

      major: {
        select: {
          majorCode: true,
          majorName: true,
        },
      },

      accountStatus: true,
      faceRegistered: true,
      createdAt: true,
    },
  });

  await sendPasswordAccessEmail({
    user: student,
    userType: "STUDENT"
  });

  return student;
};


//Update Student
export const updateStudentService = async (
  studentId: string,
  data: UpdateStudentRequest
) => {

  // Check student exists
  const student = await prisma.student.findUnique({
    where: {
      studentId,
    },
  });

  if (!student) {
    throw new AppError(
      "Student not found",
      404
    );
  }


  const email = data.email?.trim().toLowerCase();

  const phoneNumber =
    data.phoneNumber?.trim();
  
  //Check email if it is being changed
  if (
    email &&
    email !== student.email
  ) {

    const [
      existingAdmin,
      existingLecturer,
      existingStudent,
    ] = await Promise.all([
      prisma.admin.findUnique({
        where: {
          email,
        },
      }),

      prisma.lecturer.findUnique({
        where: {
          email,
        },
      }),

      prisma.student.findUnique({
        where: {
          email,
        },
      }),
    ]);

    if (
      existingAdmin ||
      existingLecturer ||
      existingStudent
    ) {
      throw new AppError(
        "A user with this email already exists",
        409
      );
    }
  }

  // Check phone if it is being changed
  if (
    phoneNumber &&
    phoneNumber !== student.phoneNumber
  ) {

    const [
      existingAdmin,
      existingLecturer,
      existingStudent,
    ] = await Promise.all([
      prisma.admin.findUnique({
        where: {
          phoneNumber,
        },
      }),

      prisma.lecturer.findUnique({
        where: {
          phoneNumber,
        },
      }),

      prisma.student.findUnique({
        where: {
          phoneNumber,
        },
      }),
    ]);
    
    if (
      existingAdmin ||
      existingLecturer ||
      existingStudent
    ) {
      throw new AppError(
        "A user with this phone number already exists",
        409
      );
    }
  }


  // Validate DOB if provided
  let dateOfBirth: Date | undefined;

  if (data.dateOfBirth) {

    dateOfBirth = new Date(
      data.dateOfBirth
    );

    if (
      Number.isNaN(
        dateOfBirth.getTime()
      )
    ) {
      throw new AppError(
        "Invalid date of birth",
        400
      );
    }

    if (dateOfBirth > new Date()) {
      throw new AppError(
        "Date of birth cannot be in the future",
        400
      );
    }
  }
  // Find new major if majorCode is being changed
  let majorId: string | undefined;

  if (data.majorCode) {

    const majorCode = data.majorCode
      .trim()
      .toUpperCase();

    const major =
      await prisma.major.findUnique({
        where: {
          majorCode,
        },
      });

    if (!major) {
      throw new AppError(
        "Major not found",
        404
      );
    }

    majorId = major.id;
  }

  // Update student
  const updatedStudent =
    await prisma.student.update({

      where: {
        studentId,
      },

      data: {
        firstName:
          data.firstName?.trim(),

        lastName:
          data.lastName?.trim(),

        email,

        phoneNumber,

        dateOfBirth,

        majorId,
      },

      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        dateOfBirth: true,
        enrollmentYear: true,

        major: {
          select: {
            majorCode: true,
            majorName: true,
          },
        },

        accountStatus: true,
        faceRegistered: true,
        createdAt: true,
        updatedAt: true,
      },
    });

  return updatedStudent;
};

//Get One Student
export const getStudentService = async (
  studentId: string,
  reader: StudentReader
): Promise<GetStudentResponse> => {

  const student =
    await prisma.student.findUnique({

      where: {
        studentId,
      },

      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        dateOfBirth: true,
        enrollmentYear: true,

        major: {
          select: {
            majorCode: true,
            majorName: true,
          },
        },

        accountStatus: true,
        faceRegistered: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!student) {
    throw new AppError(
      "Student not found",
      404
    );
  }


  // Student can only view their own profile
  if (
    reader.role === "STUDENT" &&
    student.id !== reader.userId
  ) {
    throw new AppError(
      "You are not authorized to access this resource",
      403
    );
  }


  // Lecturer receives limited student information
  if (reader.role === "LECTURER") {

    return {
      studentId: student.studentId,
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      enrollmentYear:
        student.enrollmentYear,
      major: student.major,
    };
  }
  // Admin, Super Admin, or student themselves
  return student;
};

//GET ALL STUDENTS
export const getAllStudentsService = async () => {

  const students =
    await prisma.student.findMany({

      select: {
        studentId: true,
        firstName: true,
        lastName: true,
        email: true,
        enrollmentYear: true,

        major: {
          select: {
            majorCode: true,
            majorName: true,
          },
        },

        accountStatus: true,
        faceRegistered: true,
      },

      orderBy: {
        firstName: "asc",
      },
    });

  return students;
};

export const deleteStudentService = async (
  studentId: string
) => {
  const student = await prisma.student.findUnique({
    where: {
      studentId,
    },
    select: {
      id: true,
      studentId: true,
      firstName: true,
      lastName: true,
    },
  });

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  await prisma.$transaction([
    prisma.passwordToken.deleteMany({
      where: {
        userId: student.id,
        userType: "STUDENT",
      },
    }),
    prisma.student.delete({
      where: {
        id: student.id,
      },
    }),
  ]);

  return student;
};

export const setStudentAccountStatusService = async (
  studentId: string,
  accountStatus: unknown
) => {
  if (accountStatus !== "ACTIVE" && accountStatus !== "INACTIVE") {
    throw new AppError("Account status must be ACTIVE or INACTIVE", 400);
  }

  const student = await prisma.student.findUnique({
    where: {
      studentId,
    },
    select: {
      id: true,
    },
  });

  if (!student) {
    throw new AppError("Student not found", 404);
  }

  return prisma.student.update({
    where: {
      id: student.id,
    },
    data: {
      accountStatus,
      authVersion: {
        increment: 1,
      },
    },
    select: {
      id: true,
      studentId: true,
      accountStatus: true,
    },
  });
};
