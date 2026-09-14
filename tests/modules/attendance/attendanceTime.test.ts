import assert from "node:assert/strict";
import { test } from "node:test";

import { AppError } from "../../../src/utils/appError.js";
import {
  toOccurrenceDate,
  validateAttendanceStartWindow,
} from "../../../src/modules/attendance/attendanceTime.js";

const scheduledClass = {
  scheduleDays: ["MONDAY"],
  startTime: new Date("1970-01-01T09:00:00.000Z"),
  endTime: new Date("1970-01-01T10:00:00.000Z"),
  academicTerm: {
    startDate: new Date("2026-06-01T00:00:00.000Z"),
    endDate: new Date("2026-06-30T00:00:00.000Z"),
  },
};

test("converts an attendance date key to UTC midnight", () => {
  assert.equal(
    toOccurrenceDate("2026-06-15").toISOString(),
    "2026-06-15T00:00:00.000Z",
  );
});

test("allows attendance during a scheduled class", () => {
  // 2026-06-15 09:30 in Australia/Sydney (UTC+10).
  const now = new Date("2026-06-14T23:30:00.000Z");

  assert.equal(
    validateAttendanceStartWindow(scheduledClass, now),
    "2026-06-15",
  );
});

test("rejects attendance on a day when the class is not scheduled", () => {
  // 2026-06-16 09:30 in Australia/Sydney (Tuesday).
  const now = new Date("2026-06-15T23:30:00.000Z");

  assert.throws(
    () => validateAttendanceStartWindow(scheduledClass, now),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.message === "Attendance can only be started on a scheduled class day",
  );
});

test("rejects attendance outside the academic term", () => {
  // 2026-07-06 09:30 in Australia/Sydney (Monday).
  const now = new Date("2026-07-05T23:30:00.000Z");

  assert.throws(
    () => validateAttendanceStartWindow(scheduledClass, now),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.message ===
        "Attendance cannot be started outside the class academic term",
  );
});

test("rejects attendance outside the allowed class time", () => {
  // 2026-06-15 12:00 in Australia/Sydney, after this class has ended.
  const now = new Date("2026-06-15T02:00:00.000Z");

  assert.throws(
    () => validateAttendanceStartWindow(scheduledClass, now),
    (error) =>
      error instanceof AppError &&
      error.statusCode === 400 &&
      error.message.startsWith("Attendance can only be started from"),
  );
});
