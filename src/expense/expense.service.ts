import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { DateRangeDto } from "./dto/date-range.dto";

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  async getExpenseById(expenseId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: {
        id: expenseId,
      },
      include: {
        category: true,
        spentBy: true,
      },
    });

    if (!expense) throw new NotFoundException("Expense not found");

    return expense;
  }

  async getPersonalExpenses(userId: string, dateRange?: DateRangeDto) {
    return await this.prisma.expense.findMany({
      where: {
        spentById: userId,
        category: {
          scope: "PERSONAL",
          userId,
        },
        createdAt: {
          gte: dateRange?.startDate,
          lte: dateRange?.endDate,
        },
      },
      include: {
        category: true,
      },
    });
  }

  async getAllExpensesOfAUser(userId: string, dateRange?: DateRangeDto) {
    return await this.prisma.expense.findMany({
      where: {
        spentById: userId,
        createdAt: {
          gte: dateRange?.startDate,
          lte: dateRange?.endDate,
        },
      },
      include: {
        category: {
          include: {
            group: true,
            friendShip: true,
          },
        },
      },
    });
  }

  async getExpensesByGroupId(groupId: string, dateRange?: DateRangeDto) {
    return await this.prisma.expense.findMany({
      where: {
        category: {
          scope: "GROUP",
          groupId,
        },
        createdAt: {
          gte: dateRange?.startDate,
          lte: dateRange?.endDate,
        },
      },
      include: {
        category: true,
        spentBy: true,
      },
    });
  }

  async getExpensesByFriendShipId(
    friendShipId: string,
    dateRange?: DateRangeDto,
  ) {
    return await this.prisma.expense.findMany({
      where: {
        category: {
          scope: "FRIENDSHIP",
          friendShipId,
        },
        createdAt: {
          gte: dateRange?.startDate,
          lte: dateRange?.endDate,
        },
      },
      include: {
        category: true,
        spentBy: true,
      },
    });
  }

  async getExpenseByCategoryId(categoryId: string, dateRange?: DateRangeDto) {
    return await this.prisma.expense.findMany({
      where: {
        categoryId,
        createdAt: {
          gte: dateRange?.startDate,
          lte: dateRange?.endDate,
        },
      },
    });
  }

  async createExpense(data: CreateExpenseDto, userId: string) {
    return await this.prisma.expense.create({
      data: {
        ...data,
        spentById: userId,
      },
    });
  }

  async updateExpense(expenseId: string, data: Partial<CreateExpenseDto>) {
    const existing = await this.prisma.expense.findUnique({
      where: {
        id: expenseId,
      },
    });

    if (!existing) throw new NotFoundException("Expense not found");

    return await this.prisma.expense.update({
      where: {
        id: expenseId,
      },
      data,
    });
  }

  async deleteExpenseById(expenseId: string) {
    const existing = await this.prisma.expense.findUnique({
      where: {
        id: expenseId,
      },
    });

    if (!existing) throw new NotFoundException("Expense not found");

    await this.prisma.expense.delete({
      where: {
        id: expenseId,
      },
    });
  }
}
