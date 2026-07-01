import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateExpenseSettlementDto } from "./dto/create-expense-settlement.dto";
import {
  Balance,
  BalanceEntry,
  GroupExpenses,
  GroupSettlements,
  Settlement,
} from "./type/settlement.type";
import { SettlementStatus } from "../../generated/prisma/client/enums";

@Injectable()
export class SettlementService {
  constructor(private readonly prisma: PrismaService) {}
  private async getAllExpensesByGroupId(groupId: string) {
    const expenses = await this.prisma.expense.findMany({
      where: {
        groupId,
      },
      include: {
        participants: {
          select: {
            user: true,
            amount: true,
          },
        },
        spentBy: {
          omit: {
            passwordHash: true,
          },
        },
      },
    });
    return expenses;
  }

  private async getSettledExpenses(groupId: string) {
    const settlements = await this.prisma.expenseSettlement.findMany({
      where: {
        groupId,
      },
      include: {
        fromUser: true,
        toUser: true,
      },
    });
    return settlements;
  }

  private calculateBalances(
    expenses: GroupExpenses,
    settledExpenses: GroupSettlements,
  ): Map<string, BalanceEntry> {
    const balances = new Map<string, BalanceEntry>();

    for (const expense of expenses) {
      for (const participant of expense.participants) {
        //ones who are required to pay(people in debt)
        balances.set(participant.user.id, {
          amount:
            (balances.get(participant.user.id)?.amount ?? 0) -
            participant.amount,
          userId: participant.user.id,
          avatarUrl: participant.user.avatarUrl,
        });
        //ones who are required to receive money(people in credit)
        //if the person who spent the money in this expense is a participant in other expenses, then
        //we need to subtract the amount they owe.
        balances.set(expense.spentById, {
          amount:
            (balances.get(expense.spentById)?.amount ?? 0) + participant.amount,
          avatarUrl: expense.spentBy.avatarUrl,
          userId: expense.spentById,
        });
      }
    }

    for (const settledExpense of settledExpenses) {
      balances.set(
        settledExpense.fromUserId,
        // (balances.get(settledExpense.fromUserId) ?? 0) + settledExpense.amount,
        {
          amount:
            (balances.get(settledExpense.fromUserId)?.amount ?? 0) +
            settledExpense.amount,
          avatarUrl: settledExpense.fromUser.avatarUrl,
          userId: settledExpense.fromUserId,
        },
      );
      balances.set(settledExpense.toUserId, {
        amount:
          (balances.get(settledExpense.toUserId)?.amount ?? 0) -
          settledExpense.amount,
        avatarUrl: settledExpense.toUser.avatarUrl,
        userId: settledExpense.toUserId,
      });
    }

    return balances;
  }

  private splitBalancesToDebtorAndCreditor(
    balances: Map<string, BalanceEntry>,
  ) {
    const debtors: Balance[] = [];
    const creditors: Balance[] = [];

    for (const [userId, balanceEntry] of balances) {
      if (balanceEntry.amount < 0) {
        debtors.push({
          user: {
            avatarUrl: null,
            userId,
            username: "",
          },
          amount: -balanceEntry.amount,
        });
      } else
        creditors.push({
          user: {
            avatarUrl: null,
            userId,
            username: "",
          },
          amount: balanceEntry.amount,
        });
    }

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    return { debtors, creditors };
  }

  private simplifyDebts(debtors: Balance[], creditors: Balance[]) {
    const settlements: Settlement[] = [];

    let i = 0,
      j = 0;

    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];

      const payment = Math.min(debtor.amount, creditor.amount);

      settlements.push({
        from: {
          avatarUrl: debtor.user.avatarUrl,
          userId: debtor.user.userId,
          username: debtor.user.username,
        },
        to: {
          avatarUrl: creditor.user.avatarUrl,
          userId: creditor.user.userId,
          username: creditor.user.username,
        },
        amount: payment,
      });

      debtor.amount -= payment;
      creditor.amount -= payment;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }
    return settlements;
  }

  async getSettlementsByGroupId(groupId: string) {
    const expenses = await this.getAllExpensesByGroupId(groupId);
    const settledExpenses = await this.getSettledExpenses(groupId);
    const balances = this.calculateBalances(expenses, settledExpenses);

    const { creditors, debtors } =
      this.splitBalancesToDebtorAndCreditor(balances);

    return this.simplifyDebts(debtors, creditors);
  }

  async settleExpense(groupId: string, data: CreateExpenseSettlementDto) {
    return await this.prisma.expenseSettlement.create({
      data: {
        amount: data.amount,
        description: data.description,
        status: data.status,
        groupId,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
      },
    });
  }

  async updateSettlementStatus(
    userId: string,
    groupId: string,
    settlementId: string,
    status: SettlementStatus,
  ) {
    const settlement = await this.prisma.expenseSettlement.findUnique({
      where: {
        id: settlementId,
        groupId,
      },
    });

    if (!settlement) throw new NotFoundException("Settlement not found");

    if (settlement.toUserId !== userId)
      throw new ForbiddenException(
        "You are not authorized to update this settlement",
      );

    if (settlement.status === SettlementStatus.SETTLED)
      throw new BadRequestException("Can't update already settled settlement");

    const updatedSettlement = await this.prisma.expenseSettlement.update({
      where: {
        id: settlementId,
        groupId,
      },
      data: {
        status,
      },
    });

    return updatedSettlement;
  }

  async getRecentSettlementTransactions(
    groupId: string,
    status?: SettlementStatus,
    numberOfTransactions: number = 10,
  ) {
    const settlements = await this.prisma.expenseSettlement.findMany({
      where: {
        groupId,
        status,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: numberOfTransactions,
      include: {
        fromUser: {
          select: {
            avatarUrl: true,
            username: true,
          },
        },
        toUser: {
          select: {
            avatarUrl: true,
            username: true,
          },
        },
      },
    });
    return settlements;
  }
}
