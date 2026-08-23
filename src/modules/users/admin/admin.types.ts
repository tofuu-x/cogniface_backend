import type {
  AccountStatus,
  AdminRole,
} from "../../../generated/prisma/enums.js";

export interface CreateAdminRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
}

export interface UpdateAdminRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
}

export interface AdminReader {
  userId: string;
  role: "SUPER_ADMIN" | "ADMIN" | "LECTURER" | "STUDENT";
}

export interface AdminResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: Date;
  role: AdminRole;
  accountStatus: AccountStatus;
  createdAt: Date;
  updatedAt?: Date;
}