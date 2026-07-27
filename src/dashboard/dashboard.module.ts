import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { GroupModule } from "../group/group.module";
import { ExpenseModule } from "../expense/expense.module";
import { SettlementModule } from "../settlement/settlement.module";
import { BudgetModule } from "../budget/budget.module";
import { CategoryModule } from "../category/category.module";

@Module({
  imports: [
    GroupModule,
    ExpenseModule,
    SettlementModule,
    BudgetModule,
    CategoryModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
