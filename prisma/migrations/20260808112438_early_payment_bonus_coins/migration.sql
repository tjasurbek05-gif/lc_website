-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FinanceSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "tuitionFee" REAL NOT NULL DEFAULT 0,
    "companyName" TEXT NOT NULL DEFAULT 'Brian',
    "branchName" TEXT,
    "earlyPaymentBonusCoins" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FinanceSettings" ("branchName", "companyName", "id", "tuitionFee", "updatedAt") SELECT "branchName", "companyName", "id", "tuitionFee", "updatedAt" FROM "FinanceSettings";
DROP TABLE "FinanceSettings";
ALTER TABLE "new_FinanceSettings" RENAME TO "FinanceSettings";
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "paidAt" DATETIME,
    "method" TEXT NOT NULL DEFAULT 'CASH',
    "receiptNo" INTEGER,
    "groupId" TEXT,
    "recordedById" TEXT,
    "teacherId" TEXT,
    "teacherSharePct" REAL,
    "teacherShareAmount" REAL,
    "teacherShareConfirmedAt" DATETIME,
    "bonusCoins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Payment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "createdAt", "dueDate", "groupId", "id", "method", "paidAt", "receiptNo", "recordedById", "studentId", "teacherId", "teacherShareAmount", "teacherShareConfirmedAt", "teacherSharePct", "updatedAt") SELECT "amount", "createdAt", "dueDate", "groupId", "id", "method", "paidAt", "receiptNo", "recordedById", "studentId", "teacherId", "teacherShareAmount", "teacherShareConfirmedAt", "teacherSharePct", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE INDEX "Payment_studentId_idx" ON "Payment"("studentId");
CREATE INDEX "Payment_dueDate_idx" ON "Payment"("dueDate");
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");
CREATE INDEX "Payment_teacherId_idx" ON "Payment"("teacherId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
