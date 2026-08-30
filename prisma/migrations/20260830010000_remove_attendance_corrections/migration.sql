-- DropForeignKey
ALTER TABLE "AttendanceCorrection" DROP CONSTRAINT "AttendanceCorrection_attendanceRecordId_fkey";

-- DropTable
DROP TABLE "AttendanceCorrection";

-- DropEnum
DROP TYPE "AttendanceCorrectionActorRole";
