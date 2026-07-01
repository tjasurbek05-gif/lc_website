/*
  Warnings:

  - You are about to drop the column `weekday` on the `ClassSchedule` table. All the data in the column will be lost.
  - Added the required column `pattern` to the `ClassSchedule` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ClassSchedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 90,
    "roomId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassSchedule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassSchedule_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ClassSchedule" ("createdAt", "durationMin", "groupId", "id", "roomId", "startTime") SELECT "createdAt", "durationMin", "groupId", "id", "roomId", "startTime" FROM "ClassSchedule";
DROP TABLE "ClassSchedule";
ALTER TABLE "new_ClassSchedule" RENAME TO "ClassSchedule";
CREATE INDEX "ClassSchedule_groupId_idx" ON "ClassSchedule"("groupId");
CREATE INDEX "ClassSchedule_roomId_idx" ON "ClassSchedule"("roomId");
CREATE TABLE "new_Lesson" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "title" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "roomId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "type" TEXT NOT NULL DEFAULT 'LESSON',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lesson_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Lesson_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Lesson" ("createdAt", "endAt", "groupId", "id", "roomId", "startAt", "status", "title", "updatedAt") SELECT "createdAt", "endAt", "groupId", "id", "roomId", "startAt", "status", "title", "updatedAt" FROM "Lesson";
DROP TABLE "Lesson";
ALTER TABLE "new_Lesson" RENAME TO "Lesson";
CREATE INDEX "Lesson_groupId_startAt_idx" ON "Lesson"("groupId", "startAt");
CREATE INDEX "Lesson_startAt_idx" ON "Lesson"("startAt");
CREATE UNIQUE INDEX "Lesson_groupId_startAt_key" ON "Lesson"("groupId", "startAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
