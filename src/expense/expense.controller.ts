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
import { ManageExpenseGuard } from "./guard/manage-expense.guard";
import { CheckAccess } from "./decorator/check-access.decorator";
import { UpdateExpenseDto } from "./dto/update-expense.dto";

@UseGuards(AuthGuard, ManageExpenseGuard)
@Controller("expense")
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  //Personal expenses

  @Post("personal")
  async createPersonalExpense(
    @CurrentUser() user: JwtPayload,
    @Body() data: CreateExpenseDto,
  ) {
    return await this.expenseService.createExpense(data, user.id);
  }

  @Get("personal")
  async getPersonalExpenses(
    @CurrentUser() user: JwtPayload,
    @Query() dateRange?: DateRangeDto,
  ) {
    return await this.expenseService.getPersonalExpenses(user.id, dateRange);
  }

  @CheckAccess("expense")
  @Put("personal/:expenseId")
  async updatePersonalExpense(
    @Param("expenseId", ParseUUIDPipe) expenseId: string,
    @Body() data: UpdateExpenseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.expenseService.updateExpenseById(
      expenseId,
      data,
      user.id,
    );
  }

  //Group

  @CheckAccess("group")
  @Post("/group/:groupId")
  async createGroupExpense(
    @CurrentUser() user: JwtPayload,
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() data: CreateExpenseDto,
  ) {
    return await this.expenseService.createExpense(data, user.id, groupId);
  }

  @CheckAccess("group")
  @Put(":expenseId/group/:groupId")
  async updateGroupExpense(
    @Param("expenseId", ParseUUIDPipe) expenseId: string,
    @Param("groupId", ParseUUIDPipe) _groupId: string,
    @Body() data: UpdateExpenseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.expenseService.updateExpenseById(
      expenseId,
      data,
      user.id,
    );
  }

  @CheckAccess("group")
  @Get("/group/:groupId")
  async getExpensesByGroupId(
    @CurrentUser() user: JwtPayload,
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Query() dateRange?: DateRangeDto,
  ) {
    return await this.expenseService.getExpensesByGroupId(
      groupId,
      user.id,
      dateRange,
    );
  }

  @CheckAccess("group")
  @Get("/group/:groupId/category/:categoryId")
  async getExpensesOfCategoryInGroup(
    @Param("groupId", ParseUUIDPipe) _groupId: string,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @Query() dateRange?: DateRangeDto,
  ) {
    return await this.expenseService.getExpenseByCategoryId(
      categoryId,
      dateRange,
    );
  }

  //generic

  @CheckAccess("expense")
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
