import prisma from "../../../db/prisma.client.js";

import crypto from "node:crypto";

import { AppError } from "../../../utils/appError.js";
import { hashPassword } from "../../../utils/auth.js";
import { AccountStatus } from "../../../generated/prisma/enums.js";

import type {
  CreateLecturerRequest,
  CreateLecturerResponse
} from "./lecturer.types.js";


const generateLecturerId = async () : Promise<string> => {
  let lecturerId : string;
  let existingLecturer;

  do {
    const randomNumber = crypto.randomInt(100000, 999999);

    lecturerId = `L${randomNumber}`;

    existingLecturer = await prisma.lecturer.findUnique({
      where: {
        lecturerId,
      }
    });
  } while (existingLecturer);

  return lecturerId;
}


const generateTemporaryPassword = (): string => {
  return crypto.randomBytes(12).toString("base64url");
};

export const createLecturerService = async (
  data: CreateLecturerRequest
) : Promise<CreateLecturerResponse> => {
  const firstName = data.firstName?.trim();
  const lastName = data.lastName?.trim();
  const email = data.email?.trim().toLowerCase();
  const phoneNumber = data.phoneNumber?.trim();
  const department = data.department;

  if (!firstName || !lastName || !email || !phoneNumber || !data.dateOfBirth || !department) {
    throw new AppError("All lecturer fields are required", 400);
  }

  // Check whether email already exists anywhere in the system
  const [
    existingAdminEmail,
    existingStudentEmail,
    existingLecturerEmail,
  ] = await Promise.all([
    prisma.admin.findUnique({
      where: {
        email,
      },
    }),

    prisma.student.findUnique({
      where: {
        email,
      },
    }),

    prisma.lecturer.findUnique({
      where: {
        email,
      },
    }),
  ]);

  if (
    existingAdminEmail ||
    existingStudentEmail ||
    existingLecturerEmail
  ) {
    throw new AppError(
      "A user with this email already exists", 409
    );
  }


  // Check whether phone number already exists anywhere in the system
  const [
    existingAdminPhone,
    existingStudentPhone,
    existingLecturerPhone,
  ] = await Promise.all([
    prisma.admin.findUnique({
      where: {
        phoneNumber,
      },
    }),

    prisma.student.findUnique({
      where: {
        phoneNumber,
      },
    }),

    prisma.lecturer.findUnique({
      where: {
        phoneNumber,
      },
    }),
  ]);

  if (
    existingAdminPhone ||
    existingStudentPhone ||
    existingLecturerPhone
  ) {
    throw new AppError(
      "A user with this phone number already exists",
      409
    );
  }

  // Validate date of birth
  const dateOfBirth = new Date(data.dateOfBirth);

  if (Number.isNaN(dateOfBirth.getTime())) {
    throw new AppError(
      "Invalid date of birth",
      400
    );
  }

  const today = new Date();

  if (dateOfBirth > today) {
    throw new AppError(
      "Date of birth cannot be in the future",
      400
    );
  }

  // Generate lecturer ID
  const lecturerId = await generateLecturerId();


  // Generate temporary password
  const temporaryPassword = generateTemporaryPassword();


  // Hash temporary password
  const hashedPassword = await hashPassword(
    temporaryPassword
  );

  // Create lecturer
  const lecturer = await prisma.lecturer.create({
    data: {
      lecturerId,

      firstName,

      lastName,

      email,

      password: hashedPassword,

      phoneNumber,

      dateOfBirth,

      department,
      accountStatus: AccountStatus.PENDING_ACTIVATION,
    },

    select: {
      id: true,

      lecturerId: true,

      firstName: true,

      lastName: true,

      email: true,

      phoneNumber: true,

      dateOfBirth: true,

      department: true,

      accountStatus: true,

      createdAt: true,
    },
  });


  return {
    ...lecturer,
  };
};
