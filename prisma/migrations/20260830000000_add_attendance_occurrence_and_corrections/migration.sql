-- CreateEnum
CREATE TYPE "AttendanceCorrectionActorRole" AS ENUM ('LECTURER', 'ADMIN', 'SUPER_ADMIN');

-- AlterTable
ALTER TABLE "AttendanceSession" ADD COLUMN "occurrenceDate" DATE;

-- Backfill existing sessions using their recorded start date.
UPDATE "AttendanceSession"
SET "occurrenceDate" = "startedAt"::date;

ALTER TABLE "AttendanceSession" ALTER COLUMN "occurrenceDate" SET NOT NULL;

-- CreateTable
CREATE TABLE "AttendanceCorrection" (
    "id" TEXT NOT NULL,
    "attendanceRecordId" TEXT NOT NULL,
    "previousStatus" "AttendanceStatus" NOT NULL,
    "newStatus" "AttendanceStatus" NOT NULL,
    "correctedByUserId" TEXT NOT NULL,
    "correctedByRole" "AttendanceCorrectionActorRole" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceCorrection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSession_classId_occurrenceDate_key" ON "AttendanceSession"("classId", "occurrenceDate");

-- CreateIndex
CREATE INDEX "AttendanceCorrection_attendanceRecordId_idx" ON "AttendanceCorrection"("attendanceRecordId");

-- AddForeignKey
ALTER TABLE "AttendanceCorrection" ADD CONSTRAINT "AttendanceCorrection_attendanceRecordId_fkey" FOREIGN KEY ("attendanceRecordId") REFERENCES "AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
