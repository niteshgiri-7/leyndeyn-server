-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "groupId" TEXT;

-- Backfill existing group expenses from category.groupId
UPDATE "Expense"
SET "groupId" = "Category"."groupId"
FROM "Category"
WHERE "Expense"."categoryId" = "Category"."id"
  AND "Category"."groupId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;
