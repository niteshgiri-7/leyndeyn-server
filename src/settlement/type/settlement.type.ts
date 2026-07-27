import { SettlementService } from "../settlement.service";

export type GroupExpenses = Awaited<
  ReturnType<SettlementService["getAllExpensesByGroupId"]>
>;

export type GroupSettlements = Awaited<
  ReturnType<SettlementService["getSettledExpenses"]>
>;

export type Balance = {
  user: IUser;
  amount: number;
};

export type BalanceEntry = {
  userId: string;
  avatarUrl: string | null;
  amount: number;
};

export interface IUser {
  avatarUrl: string | null;
  username: string;
  userId: string;
}

export type Settlement = {
  from: IUser;
  to: IUser;
  amount: number;
};

export type DashboardSettlementItem = {
  id: string;
  name: string;
  type: "friend" | "group";
  amount: number;
  settlementType: "YOU_OWE" | "OWES_YOU" | "GROUP_TRANSFER";
  groupName: string;
  fromUser: string;
  toUser: string;
};
