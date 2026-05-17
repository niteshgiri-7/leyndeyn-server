/*
  Warnings:

  - Added the required column `spentById` to the `Expense` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "spentById" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_spentById_fkey" FOREIGN KEY ("spentById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
