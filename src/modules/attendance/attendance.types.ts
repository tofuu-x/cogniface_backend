import type { AttendanceStatus } from "../../generated/prisma/enums.js";

export interface CreateAttendanceSessionRequest {
  classId: string;
}

export interface MarkManualAttendanceRequest {
  status: AttendanceStatus;
}

export interface CorrectAttendanceRequest {
  status: AttendanceStatus;
  reason: string;
}

export interface AttendanceReader {
  userId: string;
  role: "SUPER_ADMIN" | "ADMIN" | "LECTURER" | "STUDENT";
}
