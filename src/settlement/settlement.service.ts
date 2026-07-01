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
        participants: true,
        spentBy: {
          omit: {
            passwordHash: true,
          },
        },
      },
    });
    return expenses;
  }

  private async getAllSettlementsByGroupId(groupId: string) {
    const settlements = await this.prisma.expenseSettlement.findMany({
      where: {
        groupId,
      },
      select: {
        amount: true,
        fromUserId: true,
        toUserId: true,
        status: true,
      },
    });
    return settlements;
  }

  private calculateBalances(
    expenses: GroupExpenses,
    settledExpenses: GroupSettlements,
  ): Map<string, number> {
    const balances = new Map<string, number>();

    for (const expense of expenses) {
      for (const participant of expense.participants) {
        //ones who are required to pay(people in debt)
        balances.set(
          participant.userId,
          (balances.get(participant.userId) ?? 0) - participant.amount,
        );
        //ones who are required to receive money(people in credit)
        //if the person who spent the money in this expense is a participant in other expenses, then
        //we need to subtract the amount they owe.
        balances.set(
          expense.spentById,
          (balances.get(expense.spentById) ?? 0) + participant.amount,
        );
      }
    }

    for (const settledExpense of settledExpenses) {
      balances.set(
        settledExpense.fromUserId,
        (balances.get(settledExpense.fromUserId) ?? 0) + settledExpense.amount,
      );
      balances.set(
        settledExpense.toUserId,
        (balances.get(settledExpense.toUserId) ?? 0) - settledExpense.amount,
      );
    }

    return balances;
  }

  private splitBalancesToDebtorAndCreditor(balances: Map<string, number>) {
    const debtors: Balance[] = [];
    const creditors: Balance[] = [];

    for (const [userId, amount] of balances) {
      if (amount < 0) {
        debtors.push({
          userId,
          amount: -amount,
        });
      } else
        creditors.push({
          userId,
          amount,
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
        from: debtor.userId,
        to: creditor.userId,
        amount: payment,
      });

      debtor.amount -= payment;
      creditor.amount -= payment;

      if (debtor.amount < 0.01) i++;
      if (creditor.amount < 0.01) j++;
    }
    return settlements;
  }

  async getPendingSettlementsByGroupId(groupId: string) {
    const expenses = await this.getAllExpensesByGroupId(groupId);
    const settledExpenses = await this.getAllSettlementsByGroupId(groupId);
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
}
