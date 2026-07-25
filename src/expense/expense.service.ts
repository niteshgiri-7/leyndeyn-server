import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SplitStrategy } from "../../generated/prisma/client/enums";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateExpenseDto,
  ExpenseParticipantDto,
} from "./dto/create-expense.dto";
import { DateRangeDto } from "./dto/date-range.dto";
import { SplitStrategyFactory } from "./split/split-strategy.factory";
import { IParticipant } from "./split/split.types";
import { UpdateExpenseDto } from "./dto/update-expense.dto";

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

  async getPersonalExpenses(userId: string, dateRange?: DateRangeDto) {
    return await this.prisma.expense.findMany({
      where: {
        spentById: userId,
        groupId: null,
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
        category: true,
        group: true,
      },
    });
  }

  async getExpensesByGroupId(
    groupId: string,
    currentUserId: string,
    dateRange?: DateRangeDto,
  ) {
    const expenses = await this.prisma.expense.findMany({
      where: {
        groupId,
        createdAt: {
          gte: dateRange?.startDate,
          lte: dateRange?.endDate,
        },
      },
      include: {
        category: true,
        spentBy: true,
        participants: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!expenses || !expenses.length) return [];

    const decoratedExpenses = expenses.map((expense) => {
      const myParticipants = expense.participants.find(
        (p) => p.userId === currentUserId,
      );
      return {
        paidBy: expense.spentBy.username,
        paidAmount: expense.amount,
        cause: expense.description,
        category: expense.category.name,
        oweAmount: myParticipants?.amount,
        spentAt: expense.createdAt,
      };
    });

    return decoratedExpenses;
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

      return await prisma.expenseParticipant.createMany({
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

  async updateExpenseById(expenseId: string, data: UpdateExpenseDto) {
    return await this.prisma.$transaction(async (prisma) => {
      const existingExpense = await prisma.expense.findUnique({
        where: {
          id: expenseId,
        },
      });

      if (!existingExpense) throw new NotFoundException("Expense not found");

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
