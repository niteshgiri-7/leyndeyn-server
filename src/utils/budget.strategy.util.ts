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
  range?: { start: Date; end: Date } | null,
) => {
  const totalDays = getNoOfDays(resetStrategy);
  let daysElapsed = totalDays;

  if (range) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(
      range.start.getFullYear(),
      range.start.getMonth(),
      range.start.getDate(),
    );
    const end = new Date(
      range.end.getFullYear(),
      range.end.getMonth(),
      range.end.getDate(),
    );

    if (today >= start && today <= end) {
      const msElapsed = today.getTime() - start.getTime();
      daysElapsed = Math.max(
        1,
        Math.floor(msElapsed / (1000 * 60 * 60 * 24)) + 1,
      );
    } else if (today > end) {
      daysElapsed = totalDays;
    } else {
      daysElapsed = 1;
    }
  }

  const dailyBudget = totalBudget / totalDays;
  const dailyExpense = totalExpense / daysElapsed;

  const projectedExpense = Math.round(dailyExpense * totalDays * 100) / 100;

  const expectedExpenseThisPeriod =
    Math.round(dailyBudget * totalDays * 100) / 100;

  const status: BudgetStatus =
    projectedExpense > totalBudget
      ? "OVER_BUDGET"
      : projectedExpense < totalBudget - 0.15 * totalBudget
        ? "UNDER_BUDGET"
        : "ON_TRACK";
  return { projectedExpense, status, expectedExpenseThisPeriod };
};
