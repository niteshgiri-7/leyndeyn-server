import { BudgetResetStrategy } from "../../generated/prisma/client/enums";
import { BudgetStatus } from "../dashboard/dashboard.type";

export const getNoOfDays = (strategy: BudgetResetStrategy) => {
  if (strategy === "MONTHLY") return 30;
  else if (strategy === "WEEKLY") return 7;
  else return 1;
};

export const getBudgetProjection = (
  totalBudget: number,
  totalExpense: number,
  resetStrategy: BudgetResetStrategy,
) => {
  const dailyBudget = totalBudget / getNoOfDays(resetStrategy);

  const dailyExpense = totalExpense / getNoOfDays(resetStrategy);

  const projectedExpense = dailyExpense * getNoOfDays(resetStrategy);

  const expectedExpenseThisPeriod = dailyBudget * getNoOfDays(resetStrategy);

  const status: BudgetStatus =
    projectedExpense > totalBudget
      ? "OVER_BUDGET"
      : projectedExpense < totalBudget - 0.15 * totalBudget
        ? "UNDER_BUDGET"
        : "ON_TRACK";
  return { projectedExpense, status, expectedExpenseThisPeriod };
};
