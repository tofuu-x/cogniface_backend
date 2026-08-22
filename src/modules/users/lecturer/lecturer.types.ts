import type { AccountStatus, Department } from "../../../generated/prisma/enums.js";
import type { AuthenticatedUser } from "../../../types/express.js";

export interface LecturerReader {
  userId: string;
  role: AuthenticatedUser["role"];
}

export interface LecturerPublicResponse {
  lecturerId: string;
  firstName: string;
  lastName: string;
  email: string;
  department: Department;
}

export interface LecturerPrivateResponse
  extends LecturerPublicResponse {
  id: string;
  phoneNumber: string;
  dateOfBirth: Date;
  accountStatus: AccountStatus;
  createdAt: Date;
}


export type GetLecturerResponse =
  | LecturerPublicResponse
  | LecturerPrivateResponse;

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
