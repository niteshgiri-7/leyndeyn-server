import { Module } from "@nestjs/common";
import { CategoryModule } from "../category/category.module";
import { ExpenseController } from "./expense.controller";
import { ExpenseService } from "./expense.service";

@Module({
  imports: [CategoryModule],
  controllers: [ExpenseController],
  providers: [ExpenseService],
})
export class ExpenseModule {}
