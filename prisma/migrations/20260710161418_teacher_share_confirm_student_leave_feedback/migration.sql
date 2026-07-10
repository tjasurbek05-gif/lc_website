-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "teacherShareConfirmedAt" DATETIME;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "leftAt" DATETIME;

-- CreateTable
CREATE TABLE "TeacherFeedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "groupId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherFeedback_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherFeedback_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TeacherFeedback_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TeacherFeedback_teacherId_idx" ON "TeacherFeedback"("teacherId");

-- CreateIndex
CREATE INDEX "TeacherFeedback_studentId_idx" ON "TeacherFeedback"("studentId");
