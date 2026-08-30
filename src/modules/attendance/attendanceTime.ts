import env from "../../config/env.js";
import { AppError } from "../../utils/appError.js";

interface ScheduledClass {
  scheduleDays: string[];
  startTime: Date;
  endTime: Date;
  academicTerm: {
    startDate: Date;
    endDate: Date;
  };
}

const getZonedParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: env.attendance_time_zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    occurrenceDate: `${values.year}-${values.month}-${values.day}`,
    scheduleDay: values.weekday.toUpperCase(),
    minuteOfDay:
      Number(values.hour) * 60 +
      Number(values.minute) +
      Number(values.second) / 60,
  };
};

const dateKey = (date: Date) => date.toISOString().slice(0, 10);

const timeToMinutes = (date: Date) =>
  date.getUTCHours() * 60 +
  date.getUTCMinutes() +
  date.getUTCSeconds() / 60;

export const toOccurrenceDate = (dateKeyValue: string) =>
  new Date(`${dateKeyValue}T00:00:00.000Z`);

export const getAttendanceOccurrenceDate = (now = new Date()) =>
  getZonedParts(now).occurrenceDate;

export const validateAttendanceStartWindow = (
  classRecord: ScheduledClass,
  now = new Date()
) => {
  const local = getZonedParts(now);

  if (
    local.occurrenceDate < dateKey(classRecord.academicTerm.startDate) ||
    local.occurrenceDate > dateKey(classRecord.academicTerm.endDate)
  ) {
    throw new AppError(
      "Attendance cannot be started outside the class academic term",
      400
    );
  }

  if (!classRecord.scheduleDays.includes(local.scheduleDay)) {
    throw new AppError(
      "Attendance can only be started on a scheduled class day",
      400
    );
  }

  const earliestStart =
    timeToMinutes(classRecord.startTime) -
    env.attendance_start_early_minutes;
  const latestStart =
    timeToMinutes(classRecord.endTime) +
    env.attendance_end_grace_minutes;

  if (
    local.minuteOfDay < earliestStart ||
    local.minuteOfDay > latestStart
  ) {
    throw new AppError(
      `Attendance can only be started from ${env.attendance_start_early_minutes} minutes before class until ${env.attendance_end_grace_minutes} minutes after class`,
      400
    );
  }

  return local.occurrenceDate;
};
