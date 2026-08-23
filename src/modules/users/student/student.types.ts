import { AccountStatus } from "../../../generated/prisma/enums.js";


export interface CreateStudentRequest {
  firstName : string;
  lastName : string;
  email : string;
  phoneNumber : string;
  dateOfBirth : string;
  enrollmentYear : number;
  majorCode : string;

}

export interface UpdateStudentRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  majorCode?: string;
}

export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "LECTURER"
  | "STUDENT";

export interface StudentReader {
  userId: string;
  role: UserRole;
}

export interface StudentPublicResponse {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  enrollmentYear: number;

  major: {
    majorCode: string;
    majorName: string;
  };
}

export interface StudentPrivateResponse
  extends StudentPublicResponse {
  id: string;
  phoneNumber: string;
  dateOfBirth: Date;
  accountStatus: AccountStatus;
  faceRegistered: boolean;
  createdAt: Date;
}

export type GetStudentResponse =
  | StudentPublicResponse
  | StudentPrivateResponse;