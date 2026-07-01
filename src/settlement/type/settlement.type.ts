import { SettlementService } from "../settlement.service";

export type GroupExpenses = Awaited<
  ReturnType<SettlementService["getAllExpensesByGroupId"]>
>;

export type GroupSettlements = Awaited<
  ReturnType<SettlementService["getSettledExpenses"]>
>;

export type Balance = {
  userId: string;
  amount: number;
};

export type Settlement = {
  from: string;
  to: string;
  amount: number;
};
