import type {
  AttendanceMethod,
  AttendanceStatus,
  DayOfWeek,
  DegreeType,
  Semester,
} from "../../generated/prisma/enums.js";

export interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  percentage: number | null;
}

export interface DashboardSchedule {
  scheduleDays: readonly DayOfWeek[];
  startTime: Date;
  endTime: Date;
  academicTerm: {
    startDate: Date;
    endDate: Date;
  };
}

export interface NextClassOccurrence {
  occurrenceDate: string;
  scheduleDay: DayOfWeek;
}

export interface StudentDashboard {
  student: {
    studentId: string;
    firstName: string;
    lastName: string;
    enrollmentYear: number;
    major: {
      majorCode: string;
      majorName: string;
      degreeType: DegreeType;
    };
  };
  faceRegistration: {
    registered: boolean;
    registeredAt: Date | null;
  };
  currentTerm: {
    id: string;
    semester: Semester;
    year: number;
    startDate: Date;
    endDate: Date;
  } | null;
  timeZone: string;
  stats: {
    currentCourses: number;
    recordedSessions: number;
    present: number;
    absent: number;
    attendancePercentage: number | null;
  };
  nextClass: {
    classId: string;
    classCode: string;
    courseCode: string;
    courseName: string;
    lecturerName: string;
    room: string;
    occurrenceDate: string;
    scheduleDay: DayOfWeek;
    startTime: Date;
    endTime: Date;
  } | null;
  courses: Array<{
    classId: string;
    classCode: string;
    courseCode: string;
    courseName: string;
    lecturerName: string;
    room: string;
    scheduleDays: DayOfWeek[];
    startTime: Date;
    endTime: Date;
    attendance: AttendanceSummary;
  }>;
  recentAttendance: Array<{
    id: string;
    occurrenceDate: Date;
    markedAt: Date;
    status: AttendanceStatus;
    method: AttendanceMethod;
    classId: string;
    classCode: string;
    courseCode: string;
    courseName: string;
  }>;
}
