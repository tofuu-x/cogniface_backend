import assert from "node:assert/strict";
import { test } from "node:test";

import type { DashboardSchedule } from "../../../src/modules/dashboard/dashboard.types.js";
import {
  getNextClassOccurrence,
  isFaceRegistrationComplete,
  summarizeAttendance,
} from "../../../src/modules/dashboard/dashboard.helpers.js";

const schedule = {
  scheduleDays: ["MONDAY", "WEDNESDAY"],
  startTime: new Date("1970-01-01T09:00:00.000Z"),
  endTime: new Date("1970-01-01T10:00:00.000Z"),
  academicTerm: {
    startDate: new Date("2026-06-01T00:00:00.000Z"),
    endDate: new Date("2026-06-30T00:00:00.000Z"),
  },
} satisfies DashboardSchedule;

test("summarizes an empty attendance list", () => {
  assert.deepEqual(summarizeAttendance([]), {
    total: 0,
    present: 0,
    absent: 0,
    percentage: null,
  });
});

test("counts attendance statuses and rounds the percentage", () => {
  assert.deepEqual(summarizeAttendance(["PRESENT", "PRESENT", "ABSENT"]), {
    total: 3,
    present: 2,
    absent: 1,
    percentage: 67,
  });
});

test("reports face registration complete only when both flags are true", () => {
  assert.equal(isFaceRegistrationComplete(true, true), true);
  assert.equal(isFaceRegistrationComplete(true, false), false);
  assert.equal(isFaceRegistrationComplete(false, true), false);
  assert.equal(isFaceRegistrationComplete(false, false), false);
});

test("returns today's class when it has not started yet", () => {
  // 2026-06-15 08:30 in Australia/Sydney (Monday).
  const now = new Date("2026-06-14T22:30:00.000Z");

  assert.deepEqual(getNextClassOccurrence(schedule, "Australia/Sydney", now), {
    occurrenceDate: "2026-06-15",
    scheduleDay: "MONDAY",
  });
});

test("skips today's class after its start time", () => {
  // 2026-06-15 09:30 in Australia/Sydney (Monday).
  const now = new Date("2026-06-14T23:30:00.000Z");

  assert.deepEqual(getNextClassOccurrence(schedule, "Australia/Sydney", now), {
    occurrenceDate: "2026-06-17",
    scheduleDay: "WEDNESDAY",
  });
});

test("starts searching from the academic term start date", () => {
  const beforeTerm = new Date("2026-05-20T00:00:00.000Z");

  assert.deepEqual(
    getNextClassOccurrence(schedule, "Australia/Sydney", beforeTerm),
    {
      occurrenceDate: "2026-06-01",
      scheduleDay: "MONDAY",
    },
  );
});

test("returns null when the academic term has ended", () => {
  const afterTerm = new Date("2026-07-01T00:00:00.000Z");

  assert.equal(
    getNextClassOccurrence(schedule, "Australia/Sydney", afterTerm),
    null,
  );
});
