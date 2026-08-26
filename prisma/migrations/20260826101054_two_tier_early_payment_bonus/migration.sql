/*
  Warnings:

  - You are about to drop the column `earlyPaymentBonusCoins` on the `FinanceSettings` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FinanceSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "tuitionFee" REAL NOT NULL DEFAULT 0,
    "companyName" TEXT NOT NULL DEFAULT 'Brian',
    "branchName" TEXT,
    "veryEarlyBonusCoins" INTEGER NOT NULL DEFAULT 0,
    "earlyBonusCoins" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FinanceSettings" ("branchName", "companyName", "id", "tuitionFee", "updatedAt") SELECT "branchName", "companyName", "id", "tuitionFee", "updatedAt" FROM "FinanceSettings";
DROP TABLE "FinanceSettings";
ALTER TABLE "new_FinanceSettings" RENAME TO "FinanceSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
