import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../auth/decorator/current-user.decorator";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/jwt-payload.type";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { DateRangeDto } from "./dto/date-range.dto";
import { ExpenseService } from "./expense.service";

@UseGuards(AuthGuard)
@Controller("expense")
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  async createExpense(
    @CurrentUser() user: JwtPayload,
    @Body() data: CreateExpenseDto,
  ) {
    return await this.expenseService.createExpense(data, user.id);
  }

  @Get("category/:categoryId")
  async getExpensesByCategoryId(
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @Query() dateRange?: DateRangeDto,
  ) {
    return await this.expenseService.getExpenseByCategoryId(
      categoryId,
      dateRange,
    );
  }

  @Get("/personal")
  async getPersonalExpenses(
    @CurrentUser() user: JwtPayload,
    @Query() dateRange?: DateRangeDto,
  ) {
    return await this.expenseService.getPersonalExpenses(user.id, dateRange);
  }

  @Get("/group/:groupId")
  async getExpensesByGroupId(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Query() dateRange?: DateRangeDto,
  ) {
    return await this.expenseService.getExpensesByGroupId(groupId, dateRange);
  }

  @Get("/friendShip/:friendShipId")
  async getExpensesByFriendShipId(
    @Param("friendShipId", ParseUUIDPipe) friendShipId: string,
    @Query() dateRange?: DateRangeDto,
  ) {
    return await this.expenseService.getExpensesByFriendShipId(
      friendShipId,
      dateRange,
    );
  }

  @Put(":expenseId")
  async updateExpenseById(
    @Param("expenseId", ParseUUIDPipe) expenseId: string,
    @Body() data: Partial<CreateExpenseDto>,
  ) {
    return await this.expenseService.updateExpense(expenseId, data);
  }

  @Delete(":expenseId")
  async deleteExpenseById(
    @Param("expenseId", ParseUUIDPipe) expenseId: string,
  ) {
    return await this.expenseService.deleteExpenseById(expenseId);
  }

  @Get("/:expenseId")
  async getExpenseById(@Param("expenseId", ParseUUIDPipe) expenseId: string) {
    return await this.expenseService.getExpenseById(expenseId);
  }

  @Get()
  async getAllExpensesOfAUser(
    @CurrentUser() user: JwtPayload,
    @Query() dateRange?: DateRangeDto,
  ) {
    return await this.expenseService.getAllExpensesOfAUser(user.id, dateRange);
  }
}
