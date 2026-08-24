import type {
  DayOfWeek,
  Semester,
} from "../../generated/prisma/enums.js";

export interface CreateClassRequest {
  classCode: string;
  courseCode: string;
  lecturerId: string;

  semester: Semester;
  year: number;

  scheduleDays: DayOfWeek[];

  startTime: string;
  endTime: string;

  room: string;
  maxCapacity: number;
}

export interface UpdateClassRequest {
  lecturerId?: string;

  scheduleDays?: DayOfWeek[];

  startTime?: string;
  endTime?: string;

  room?: string;
  maxCapacity?: number;
}