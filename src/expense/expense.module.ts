import { Module } from "@nestjs/common";
import { CategoryModule } from "../category/category.module";
import { ExpenseController } from "./expense.controller";
import { ExpenseService } from "./expense.service";
import { SplitStrategyFactory } from "./split/split-strategy.factory";
import { EqualSplitStrategy } from "./split/equal-split.strategy";
import { PercentageSplitStrategy } from "./split/percentage-split.strategy";
import { ExactSplitStrategy } from "./split/exact-split.strategy";

@Module({
  imports: [CategoryModule],
  controllers: [ExpenseController],
  providers: [
    ExpenseService,
    SplitStrategyFactory,
    EqualSplitStrategy,
    PercentageSplitStrategy,
    ExactSplitStrategy,
  ],
  exports: [ExpenseService],
})
export class ExpenseModule {}
