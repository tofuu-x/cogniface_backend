-- CreateEnum
CREATE TYPE "PasswordTokenUserType" AS ENUM ('ADMIN', 'LECTURER', 'STUDENT');

-- CreateEnum
CREATE TYPE "PasswordTokenPurpose" AS ENUM ('WELCOME_SETUP', 'PASSWORD_RESET');

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "authVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Lecturer" ADD COLUMN     "authVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "authVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "PasswordToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userType" "PasswordTokenUserType" NOT NULL,
    "purpose" "PasswordTokenPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "requestedByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordToken_tokenHash_key" ON "PasswordToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordToken_userId_userType_idx" ON "PasswordToken"("userId", "userType");

-- CreateIndex
CREATE INDEX "PasswordToken_userId_userType_createdAt_idx" ON "PasswordToken"("userId", "userType", "createdAt");

-- CreateIndex
CREATE INDEX "PasswordToken_expiresAt_idx" ON "PasswordToken"("expiresAt");
