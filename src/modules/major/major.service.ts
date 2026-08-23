import prisma from "../../db/prisma.client.js";

import { AppError } from "../../utils/appError.js";

import type { CreateMajorRequest, MajorResponse, UpdateMajorRequest } from "./major.types.js";


//Create Major
export const createMajorService = async (
  data : CreateMajorRequest
) : Promise<MajorResponse> => {
  const majorCode = data.majorCode.trim().toUpperCase();

  const majorName = data.majorName.trim();

  if (!majorCode) {
    throw new AppError(
      "Major code is required", 400
    );
  }

  if (!majorName){
    throw new AppError(
      "Major name is required", 400
    );
  }

  const existingMajor = await prisma.major.findUnique({
    where: {
      majorCode,
    },
  });

  if (existingMajor){
    throw new AppError(
      "A major with this code already exists", 409
    );
  }

  //Create the major
  const major = await prisma.major.create({
    data: {
      majorCode,
      majorName,
      department: data.department,
      degreeType: data.degreeType,
    },

    select: {
      id: true,
      majorCode: true,
      majorName: true,
      department: true,
      degreeType: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return major;
};


//Get one major
// GET ONE MAJOR

export const getMajorService = async (
  majorCode: string
): Promise<any> => {
  const normalizedMajorCode =
    majorCode.trim().toUpperCase();

  const major = await prisma.major.findUnique({
    where: {
      majorCode: normalizedMajorCode,
    },

    select: {
      majorCode: true,
      majorName: true,
      department: true,
      degreeType: true,
    },
  });

  if (!major) {
    throw new AppError(
      "Major not found",
      404
    );
  }

  return major;
};

//Get all majors
export const getAllMajorsService = async () => {
  const majors = await prisma.major.findMany({
    select: {
      majorCode: true,
      majorName: true,
      department: true,
      degreeType: true,
    },

    orderBy: {
      majorName: "asc",
    },
  });

  return majors;
};

//Update Majors
export const updateMajorService = async (
  majorCode: string,
  data: UpdateMajorRequest
): Promise<MajorResponse> => {
  const normalizedMajorCode =
    majorCode.trim().toUpperCase();

  const existingMajor =
    await prisma.major.findUnique({
      where: {
        majorCode: normalizedMajorCode,
      },
    });

  if (!existingMajor) {
    throw new AppError(
      "Major not found",
      404
    );
  }

  const major = await prisma.major.update({
    where: {
      majorCode: normalizedMajorCode,
    },

    data: {
      majorName: data.majorName?.trim(),
      department: data.department,
      degreeType: data.degreeType,
    },

    select: {
      id: true,
      majorCode: true,
      majorName: true,
      department: true,
      degreeType: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return major;
};