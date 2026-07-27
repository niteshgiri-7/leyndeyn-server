import { Module } from "@nestjs/common";
import { BudgetController } from "./budget.controller";
import { BudgetService } from "./budget.service";
import { CategoryModule } from "../category/category.module";

@Module({
  imports: [CategoryModule],
  controllers: [BudgetController],
  providers: [BudgetService],
  exports: [BudgetService],
})
export class BudgetModule {}
