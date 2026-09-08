import type { AttendanceStatus, DayOfWeek } from "../../generated/prisma/enums.js";
import type {
  AttendanceSummary,
  DashboardSchedule,
  NextClassOccurrence,
} from "./dashboard.types.js";

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

const timeToMinutes = (date: Date) =>
  date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;

const getZonedNow = (now: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minuteOfDay:
      Number(values.hour) * 60 + Number(values.minute) + Number(values.second) / 60,
  };
};

export const summarizeAttendance = (
  statuses: readonly AttendanceStatus[],
): AttendanceSummary => {
  const present = statuses.filter((status) => status === "PRESENT").length;
  const absent = statuses.filter((status) => status === "ABSENT").length;
  const total = present + absent;

  return {
    total,
    present,
    absent,
    percentage: total === 0 ? null : Math.round((present / total) * 100),
  };
};

export const isFaceRegistrationComplete = (
  faceRegistered: boolean,
  hasEmbedding: boolean,
) => faceRegistered && hasEmbedding;

export const getNextClassOccurrence = (
  schedule: DashboardSchedule,
  timeZone: string,
  now = new Date(),
): NextClassOccurrence | null => {
  const zonedNow = getZonedNow(now, timeZone);
  const startDate = dateKey(schedule.academicTerm.startDate);
  const endDate = dateKey(schedule.academicTerm.endDate);
  const searchStart = zonedNow.date < startDate ? startDate : zonedNow.date;
  const searchStartDate = new Date(`${searchStart}T00:00:00.000Z`);
  const startMinute = timeToMinutes(schedule.startTime);

  for (let offset = 0; offset < 14; offset += 1) {
    const candidate = new Date(searchStartDate);
    candidate.setUTCDate(candidate.getUTCDate() + offset);
    const candidateDate = dateKey(candidate);
    if (candidateDate > endDate) return null;

    const scheduleDay = candidate
      .toLocaleDateString("en-AU", { weekday: "long", timeZone: "UTC" })
      .toUpperCase() as DayOfWeek;
    if (!schedule.scheduleDays.includes(scheduleDay)) continue;
    if (candidateDate === zonedNow.date && startMinute <= zonedNow.minuteOfDay) continue;

    return { occurrenceDate: candidateDate, scheduleDay };
  }

  return null;
};
