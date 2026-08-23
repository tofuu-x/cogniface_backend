/*
  Warnings:

  - Added the required column `majorId` to the `Student` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DegreeType" AS ENUM ('BACHELORS', 'MASTERS', 'PHD');

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "majorId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Major" (
    "id" TEXT NOT NULL,
    "majorCode" TEXT NOT NULL,
    "majorName" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "degreeType" "DegreeType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Major_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Major_majorCode_key" ON "Major"("majorCode");

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
