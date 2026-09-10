import prisma from "../../../db/prisma.client.js";

import { AppError } from "../../../utils/appError.js";

import { hashPassword } from "../../../utils/auth.js";

import { AdminRole } from "../../../generated/prisma/enums.js";
import { generateTemporaryPassword } from "../../../utils/crypto.js";

import type {
  CreateAdminRequest,
  UpdateAdminRequest,
  AdminReader,
  AdminResponse,
} from "./admin.types.js";
import { sendPasswordAccessEmail } from "../../../services/password.service.js";

// CREATE ADMIN
// SUPER_ADMIN only

export const createAdminService = async (
  data: CreateAdminRequest
): Promise<AdminResponse> => {
  const firstName = data.firstName.trim();
  const lastName = data.lastName.trim();
  const email = data.email.trim().toLowerCase();
  const phoneNumber = data.phoneNumber.trim();

  // Validate DOB
  const dateOfBirth = new Date(data.dateOfBirth);

  if (Number.isNaN(dateOfBirth.getTime())) {
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

  // Check email across every user table
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

  // Check phone across every user table
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

  // Generate temporary password
  const temporaryPassword =
    generateTemporaryPassword();

  // Hash it
  const hashedPassword = await hashPassword(
    temporaryPassword
  );

  // Always create a normal ADMIN
  const admin = await prisma.admin.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phoneNumber,
      dateOfBirth,

      role: AdminRole.ADMIN,
    },

    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      dateOfBirth: true,
      role: true,
      accountStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await sendPasswordAccessEmail({
  user: admin,
  userType: "ADMIN",
  });

  return admin;
};


// GET ONE ADMIN

export const getAdminService = async (
  adminId: string,
  reader: AdminReader
): Promise<AdminResponse> => {
  const admin = await prisma.admin.findUnique({
    where: {
      id: adminId,
    },

    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
      dateOfBirth: true,
      role: true,
      accountStatus: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!admin) {
    throw new AppError(
      "Admin not found",
      404
    );
  }

  // Normal admin can only view themselves
  if (
    reader.role === "ADMIN" &&
    admin.id !== reader.userId
  ) {
    throw new AppError(
      "You are not authorized to access this resource",
      403
    );
  }

  return admin;
};


// GET ALL ADMINS
// SUPER_ADMIN only

export const getAllAdminsService = async () => {
  return prisma.admin.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      accountStatus: true,
      createdAt: true,
    },

    orderBy: {
      firstName: "asc",
    },
  });
};


// UPDATE ADMIN

export const updateAdminService = async (
  adminId: string,
  data: UpdateAdminRequest,
  reader: AdminReader
): Promise<AdminResponse> => {
  const admin = await prisma.admin.findUnique({
    where: {
      id: adminId,
    },
  });

  if (!admin) {
    throw new AppError(
      "Admin not found",
      404
    );
  }

  // Normal admin can only update themselves
  if (
    reader.role === "ADMIN" &&
    admin.id !== reader.userId
  ) {
    throw new AppError(
      "You are not authorized to update this admin",
      403
    );
  }

  const email = data.email
    ?.trim()
    .toLowerCase();

  const phoneNumber =
    data.phoneNumber?.trim();

  // Check email if changing it
  if (
    email &&
    email !== admin.email
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

  // Check phone if changing it
  if (
    phoneNumber &&
    phoneNumber !== admin.phoneNumber
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

  // DOB
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

  const updatedAdmin =
    await prisma.admin.update({
      where: {
        id: adminId,
      },

      data: {
        firstName:
          data.firstName?.trim(),

        lastName:
          data.lastName?.trim(),

        email,

        phoneNumber,

        dateOfBirth,
      },

      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        dateOfBirth: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

  return updatedAdmin;
};

export const deleteAdminService = async (
  adminId: string
) => {
  const admin = await prisma.admin.findUnique({
    where: {
      id: adminId,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });

  if (!admin) {
    throw new AppError("Admin not found", 404);
  }

  await prisma.$transaction([
    prisma.passwordToken.deleteMany({
      where: {
        userId: admin.id,
        userType: "ADMIN",
      },
    }),
    prisma.admin.delete({
      where: {
        id: admin.id,
      },
    }),
  ]);

  return admin;
};

export const setAdminAccountStatusService = async (
  adminId: string,
  accountStatus: unknown
) => {
  if (accountStatus !== "ACTIVE" && accountStatus !== "INACTIVE") {
    throw new AppError("Account status must be ACTIVE or INACTIVE", 400);
  }

  const admin = await prisma.admin.findUnique({
    where: {
      id: adminId,
    },
    select: {
      id: true,
    },
  });

  if (!admin) {
    throw new AppError("Admin not found", 404);
  }

  return prisma.admin.update({
    where: {
      id: admin.id,
    },
    data: {
      accountStatus,
      authVersion: {
        increment: 1,
      },
    },
    select: {
      id: true,
      accountStatus: true,
    },
  });
};
