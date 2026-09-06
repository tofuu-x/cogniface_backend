CREATE TABLE "FaceEmbedding" (
    "studentId" TEXT NOT NULL,
    "encryptedEmbedding" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceEmbedding_pkey" PRIMARY KEY ("studentId")
);

ALTER TABLE "FaceEmbedding"
ADD CONSTRAINT "FaceEmbedding_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
