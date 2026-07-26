import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SplitStrategy } from "../../generated/prisma/client/enums";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateExpenseDto,
  ExpenseParticipantDto,
} from "./dto/create-expense.dto";
import { SplitStrategyFactory } from "./split/split-strategy.factory";
import { IParticipant } from "./split/split.types";
import { UpdateExpenseDto } from "./dto/update-expense.dto";
import { ExpenseFilterQueryDto } from "./dto/expense-filter-query.dto";

@Injectable()
export class ExpenseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly splitStrategyFactory: SplitStrategyFactory,
  ) {}

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

  private buildExpenseWhere(
    filters?: ExpenseFilterQueryDto,
    baseWhere: Record<string, unknown> = {},
    allowSpentByFilter = false,
  ) {
    const where: Record<string, unknown> = { ...baseWhere };

    if (filters?.description) {
      where.description = {
        contains: filters.description,
        mode: "insensitive",
      };
    }

    if (filters?.categoryId && where.categoryId == null) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.minAmount != null || filters?.maxAmount != null) {
      where.amount = {
        ...(filters?.minAmount != null ? { gte: filters.minAmount } : {}),
        ...(filters?.maxAmount != null ? { lte: filters.maxAmount } : {}),
      };
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {
        ...(filters?.startDate ? { gte: filters.startDate } : {}),
        ...(filters?.endDate ? { lte: filters.endDate } : {}),
      };
    }

    if (
      allowSpentByFilter &&
      filters?.spentById?.length &&
      where.spentById == null
    ) {
      where.spentById = {
        in: filters.spentById,
      };
    }

    return where;
  }

  async getPersonalExpenses(userId: string, filters?: ExpenseFilterQueryDto) {
    return await this.prisma.expense.findMany({
      where: this.buildExpenseWhere(filters, {
        spentById: userId,
        groupId: null,
      }),
      include: {
        category: true,
      },
    });
  }

  async getAllExpensesOfAUser(userId: string, filters?: ExpenseFilterQueryDto) {
    return await this.prisma.expense.findMany({
      where: this.buildExpenseWhere(filters, { spentById: userId }),
      include: {
        category: true,
        group: true,
      },
    });
  }

  async getExpensesByGroupId(
    groupId: string,
    currentUserId: string,
    filters?: ExpenseFilterQueryDto,
  ) {
    const expenses = await this.prisma.expense.findMany({
      where: this.buildExpenseWhere(filters, { groupId }, true),
      include: {
        category: true,
        spentBy: true,
        participants: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (!expenses || !expenses.length) return [];

    const decoratedExpenses = expenses.map((expense) => {
      const isCurrentUserPayer = expense.spentById === currentUserId;

      const myParticipant = expense.participants.find(
        (participant) => participant.userId === currentUserId,
      );

      const netAmount = isCurrentUserPayer
        ? // if currentUser is payer then he should receive the sum of all other participant amounts
          expense.participants
            .filter((p) => p.userId !== currentUserId)
            .reduce((sum, p) => sum + p.amount, 0)
        : // if the currentUser is not the payer and is participant of the expense then he owes the amount.
          myParticipant
          ? -myParticipant.amount
          : // if the currentUser is not the payer and is not participant of the expense then he owes nothing.
            0;

      return {
        paidBy: {
          avatarUrl: expense.spentBy.avatarUrl,
          username: expense.spentBy.username,
        },
        paidAmount: expense.amount,
        cause: expense.description,
        netAmount,
        spentAt: expense.createdAt,
        category: expense.category.name,
      };
    });
    return decoratedExpenses;
  }

  async getExpenseByCategoryId(
    categoryId: string,
    filters?: ExpenseFilterQueryDto,
  ) {
    return await this.prisma.expense.findMany({
      where: this.buildExpenseWhere(filters, { categoryId }),
    });
  }

  async createExpense(
    data: CreateExpenseDto,
    spentById: string,
    groupId?: string,
  ) {
    return await this.prisma.$transaction(async (prisma) => {
      const chosenSplitStrategy = data.splitStrategy ?? SplitStrategy.NONE;

      if (!data?.splitStrategy)
        throw new BadRequestException(
          "Split strategy is required for non personal expenses",
        );

      if (!data?.participants || !data?.participants?.length)
        throw new BadRequestException(
          "Participants are required for non-personal expenses",
        );

      if (groupId) {
        const category = await prisma.category.findUnique({
          where: { id: data.categoryId },
          select: { groupId: true },
        });

        if (category?.groupId !== groupId)
          throw new BadRequestException(
            "Category does not belong to the specified group",
          );
      }

      const expense = await prisma.expense.create({
        data: {
          amount: data.amount,
          description: data.description,
          categoryId: data.categoryId,
          spentById,
          splitStrategy: chosenSplitStrategy,
          ...(groupId && { groupId }),
        },
      });

      const participants = this.resolveParticipantsForExpense({
        participants: data.participants,
        splitStrategy: chosenSplitStrategy,
      });

      const splitStrategy =
        this.splitStrategyFactory.getStrategy(chosenSplitStrategy);

      const calculatedSplits = splitStrategy.calculate({
        amount: data.amount,
        participants,
      });

      return await prisma.expenseParticipant.createManyAndReturn({
        data: calculatedSplits.map((s) => ({
          expenseId: expense.id,
          userId: s.userId,
          amount: s.amount,
        })),
      });
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

  resolveParticipantsForExpense(data: {
    participants: ExpenseParticipantDto[];
    splitStrategy: SplitStrategy;
  }): IParticipant[] {
    if (!data?.participants) return [];
    const participants = data?.participants?.map((p) => {
      if (data?.splitStrategy === SplitStrategy.EXACT && p?.exactAmount == null)
        throw new BadRequestException(
          "Exact amount is required for exact split strategy",
        );

      return {
        userId: p.participantId,
        exactAmount: p.exactAmount,
        percentage: p.percentage,
      };
    });

    return participants;
  }

  async updateExpenseById(
    expenseId: string,
    data: UpdateExpenseDto,
    currentUserId: string,
  ) {
    return await this.prisma.$transaction(async (prisma) => {
      const existingExpense = await prisma.expense.findUnique({
        where: {
          id: expenseId,
        },
      });

      if (!existingExpense) throw new NotFoundException("Expense not found");

      if (existingExpense.spentById !== currentUserId)
        throw new ForbiddenException("Only the payer can update the expense");

      const updatedExpense = await prisma.expense.update({
        where: {
          id: expenseId,
        },
        data: {
          amount: data?.amount,
          description: data?.description,
          categoryId: data?.categoryId,
          splitStrategy: data?.splitStrategy,
        },
      });

      if (!data?.participants || !data?.participants?.length)
        return updatedExpense;

      const chosenSplitStrategy = data.splitStrategy ?? SplitStrategy.NONE;

      const participants = this.resolveParticipantsForExpense({
        participants: data.participants,
        splitStrategy: chosenSplitStrategy,
      });

      const splitStrategy =
        this.splitStrategyFactory.getStrategy(chosenSplitStrategy);

      const calculatedSplits = splitStrategy.calculate({
        amount: updatedExpense?.amount,
        participants,
      });

      return await prisma.expenseParticipant.updateMany({
        where: {
          expenseId,
        },
        data: calculatedSplits?.map((split) => ({
          userId: split.userId,
          expenseId,
          amount: split.amount,
        })),
      });
    });
  }
}
