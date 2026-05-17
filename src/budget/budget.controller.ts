import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { BudgetService } from "./budget.service";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import { ManageBudgetGuard } from "./guard/manage-budget.guard";
import { ALLOW_NON_ADMIN } from "../group/decorator/allow-non-admin";

@UseGuards(AuthGuard, ManageBudgetGuard)
@Controller("category/:categoryId/budget")
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @ALLOW_NON_ADMIN()
  @Get("all")
  async getAllBudgetsOfCategory(
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
  ) {
    return await this.budgetService.getAllBudgetsOfCategory(categoryId);
  }

  @Post()
  async createBudgetForCategory(
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @Body() data: CreateBudgetDto,
  ) {
    return await this.budgetService.createBudgetForCategory(data, categoryId);
  }

  @ALLOW_NON_ADMIN()
  @Get(":budgetId")
  async getBudgetById(@Param("budgetId", ParseUUIDPipe) budgetId: string) {
    return await this.budgetService.getBudgetById(budgetId);
  }

  @Put(":budgetId")
  async updateBudget(
    @Param("budgetId", ParseUUIDPipe) budgetId: string,
    @Body() data: Partial<CreateBudgetDto>,
  ) {
    return await this.budgetService.updateBudget(budgetId, data);
  }

  @Delete(":budgetId")
  async deleteBudget(@Param("budgetId", ParseUUIDPipe) budgetId: string) {
    return await this.budgetService.deleteBudget(budgetId);
  }
}
