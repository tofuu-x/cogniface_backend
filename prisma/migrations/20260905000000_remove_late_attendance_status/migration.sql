-- Preserve historical attendance by treating late arrivals as present.
UPDATE "AttendanceRecord"
SET "status" = 'PRESENT'
WHERE "status" = 'LATE';

-- PostgreSQL enum values cannot be removed directly, so replace the enum.
ALTER TYPE "AttendanceStatus" RENAME TO "AttendanceStatus_old";

CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

ALTER TABLE "AttendanceRecord"
ALTER COLUMN "status" TYPE "AttendanceStatus"
USING ("status"::text::"AttendanceStatus");

DROP TYPE "AttendanceStatus_old";
