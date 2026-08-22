import type { AccountStatus, Department } from "../../../generated/prisma/enums.js";

export interface CreateLecturerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  department: Department;
}

export interface CreateLecturerResponse {
  id: string;
  lecturerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date;
  department: Department;
  accountStatus: AccountStatus;
  createdAt: Date;
}

export interface UpdateLecturerRequest {
  firstName? : string;
  lastName? : string;
  email? : string;
  phoneNumber? : string;
  dateOfBirth? : string;
  department? : Department
}