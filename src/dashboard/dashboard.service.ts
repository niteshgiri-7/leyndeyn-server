import { Injectable } from "@nestjs/common";
import { BudgetResetStrategy } from "../../generated/prisma/client/enums";
import { BudgetService } from "../budget/budget.service";
import { CategoryService } from "../category/category.service";
import { ExpenseService } from "../expense/expense.service";
import { GroupService } from "../group/group.service";
import { SettlementService } from "../settlement/settlement.service";
import { getBudgetProjection } from "../utils/budget.strategy.util";
import { Budgets, Categories, CategorySummary } from "./dashboard.type";
import { DashboardFilterDto } from "./dto/dashboard-filter.dto";
import { getRangeByPeriod, generateTrendIntervals } from "../utils/date.util";

@Injectable()
export class DashboardService {
  constructor(
    private readonly groupService: GroupService,
    private readonly expenseService: ExpenseService,
    private readonly settlementService: SettlementService,
    private readonly budgetService: BudgetService,
    private readonly categoryService: CategoryService,
  ) {}

  private round(num: number) {
    return Math.round(num * 100) / 100;
  }

  async getAllCategories(userId: string) {
    const [personalCategories, groupCategories] = await Promise.all([
      this.categoryService.getPersonalCategories(userId),
      this.categoryService.getAllGroupsCategories(userId),
    ]);

    return [...personalCategories, ...groupCategories];
  }

  filterCategoriesByDate(
    categories: Categories,
    range: { start: Date; end: Date } | null,
  ): Categories {
    if (!range) return categories;
    return categories.map((category) => ({
      ...category,
      expenses: category.expenses.filter(
        (e) => e.createdAt >= range.start && e.createdAt <= range.end,
      ),
    }));
  }

  filterBudgetsByDate(
    budgets: Budgets,
    range: { start: Date; end: Date } | null,
  ): Budgets {
    if (!range) return budgets;
    return budgets.map((budget) => ({
      ...budget,
      category: {
        ...budget.category,
        expenses: budget.category.expenses.filter(
          (e) => e.createdAt >= range.start && e.createdAt <= range.end,
        ),
      },
    }));
  }

  getAllCategoriesSummary(categories: Categories): CategorySummary[] {
    const totalExpenseAcrossCategories = categories.reduce(
      (total, category) =>
        total +
        category.expenses.reduce((sum, expense) => sum + expense.amount, 0),
      0,
    );

    const categorySummary = categories.map((category) => {
      const totalExpenses = category.expenses.reduce(
        (total, expense) => total + expense.amount,
        0,
      );
      const percentage =
        totalExpenseAcrossCategories > 0
          ? (totalExpenses / totalExpenseAcrossCategories) * 100
          : 0;

      const summary: CategorySummary = {
        id: category.id,
        name: category.name,
        amount: this.round(totalExpenses),
        percentage: this.round(percentage),
        type: category.groupId
          ? category.group?._count?.members === 2
            ? "friend"
            : "group"
          : "personal",
      };

      if (category.group) {
        summary.groupName = category.group.name;
        summary.type =
          category.group._count?.members === 2 ? "friend" : "group";
      } else {
        summary.type = "personal";
      }

      return summary;
    });

    return categorySummary;
  }

  async getAllGroups(userId: string) {
    const friendGroups = await this.groupService.getAllFriendGroups(userId);
    const allGroups = await this.groupService.getAllGroupsForUser(userId);

    return { friendGroups, allGroups };
  }

  async getExpenseSummary(
    userId: string,
    dateFilters?: { startDate?: string; endDate?: string },
  ) {
    const [expensesAsPayer, expensesAsParticipant, personalExpenses] =
      await Promise.all([
        this.expenseService.getAllExpensesOfAUser(userId, dateFilters),
        this.expenseService.getAllExpensesOfAUserAsParticipant(
          userId,
          dateFilters,
        ),
        this.expenseService.getPersonalExpenses(userId, dateFilters),
      ]);

    const totalPersonalSpent = personalExpenses.reduce(
      (total, expense) => total + expense.amount,
      0,
    );

    const totalSplittedShare = expensesAsParticipant.reduce(
      (total, expense) =>
        total +
        expense.participants.reduce(
          (total, participant) => total + participant.amount,
          0,
        ),
      0,
    );

    const totalExpensesAsPayer = expensesAsPayer.reduce(
      (total, expense) => total + expense.amount,
      0,
    );

    const totalSpent =
      totalPersonalSpent + totalSplittedShare + totalExpensesAsPayer;

    return {
      totalSpent: this.round(totalSpent),
      totalPersonalSpent: this.round(totalPersonalSpent),
      totalSplittedShare: this.round(totalSplittedShare),
      totalSpentAsPayer: this.round(totalExpensesAsPayer),
    };
  }

  generateBudgetOverview(
    budgets: Budgets,
    range: { start: Date; end: Date } | null,
    strategy: BudgetResetStrategy = "MONTHLY",
  ) {
    const filteredBudgets = this.filterBudgetsByDate(budgets, range);

    const totalBudget = filteredBudgets.reduce(
      (total, budget) => total + budget.amount,
      0,
    );
    const totalExpense = filteredBudgets.reduce(
      (total, budget) =>
        total +
        budget.category.expenses.reduce(
          (total, expense) => total + expense.amount,
          0,
        ),
      0,
    );
    const totalRemainingBudget = totalBudget - totalExpense;

    const budgetProjection = getBudgetProjection(
      totalBudget,
      totalExpense,
      strategy,
    );

    const overallTrendIntervals = range
      ? generateTrendIntervals(range.start, range.end, strategy)
      : [];
    let overallCumulativeTarget = 0;
    let overallCumulativeActual = 0;
    const overallTargetPerInterval =
      overallTrendIntervals.length > 0
        ? totalBudget / overallTrendIntervals.length
        : 0;

    const overallTrendPoints = overallTrendIntervals.map((interval) => {
      overallCumulativeTarget += overallTargetPerInterval;

      let actualInInterval = 0;
      budgets.forEach((b) => {
        const expensesInInterval = b.category.expenses.filter(
          (e) => e.createdAt >= interval.start && e.createdAt <= interval.end,
        );
        actualInInterval += expensesInInterval.reduce(
          (sum, e) => sum + e.amount,
          0,
        );
      });
      overallCumulativeActual += actualInInterval;

      return {
        label: interval.label,
        targetCumulative: this.round(overallCumulativeTarget),
        actualCumulative: this.round(overallCumulativeActual),
      };
    });

    const budgetOverviews = filteredBudgets.map((budget) => {
      const budgetAmount = budget.amount;
      const budgetExpense = budget.category.expenses.reduce(
        (total, expense) => total + expense.amount,
        0,
      );
      const remainingBudget = budgetAmount - budgetExpense;
      const categoryName = budget.category.name;
      const categoryId = budget.category.id;
      const groupId = budget.category?.groupId;
      const groupName = budget.category?.group?.name;
      const percentageUsed =
        budgetAmount > 0 ? (budgetExpense / budgetAmount) * 100 : 0;

      const trendIntervals = range
        ? generateTrendIntervals(range.start, range.end, budget.resetStrategy)
        : [];
      let cumulativeTarget = 0;
      let cumulativeActual = 0;
      const targetPerInterval =
        trendIntervals.length > 0 ? budgetAmount / trendIntervals.length : 0;

      const trendPoints = trendIntervals.map((interval) => {
        cumulativeTarget += targetPerInterval;

        const originalBudget = budgets.find((b) => b.id === budget.id);
        const expensesInInterval = originalBudget
          ? originalBudget.category.expenses.filter(
              (e) =>
                e.createdAt >= interval.start && e.createdAt <= interval.end,
            )
          : [];
        const actualInInterval = expensesInInterval.reduce(
          (sum, e) => sum + e.amount,
          0,
        );
        cumulativeActual += actualInInterval;

        return {
          label: interval.label,
          targetCumulative: this.round(cumulativeTarget),
          actualCumulative: this.round(cumulativeActual),
        };
      });

      return {
        groupId,
        groupName,
        categoryId,
        categoryName,
        totalBudget: this.round(budgetAmount),
        totalExpense: this.round(budgetExpense),
        remainingBudget: this.round(remainingBudget),
        percentageUsed: this.round(percentageUsed),
        ...getBudgetProjection(
          budgetAmount,
          budgetExpense,
          budget.resetStrategy,
        ),
        trendPoints,
      };
    });

    return {
      totalBudget: this.round(totalBudget),
      totalExpense: this.round(totalExpense),
      totalRemainingBudget: this.round(totalRemainingBudget),
      budgetProjection,
      trendPoints: overallTrendPoints,
      budgetOverviews,
    };
  }

  async getPersonalBudgetOverview(
    userId: string,
    range: { start: Date; end: Date } | null,
  ) {
    const budgets =
      await this.budgetService.getBudgetsForPersonalCategories(userId);
    return this.generateBudgetOverview(budgets, range);
  }

  async getGroupsBudgetOverview(
    userId: string,
    range: { start: Date; end: Date } | null,
  ) {
    const budgets = await this.budgetService.getBudgetsForAllTheGroups(userId);
    return this.generateBudgetOverview(budgets, range);
  }

  async getDashboardData(userId: string, query?: DashboardFilterDto) {
    const range = getRangeByPeriod(
      query?.period,
      query?.startDate,
      query?.endDate,
      query?.timeZone,
    );
    const dateFilters = range
      ? {
          startDate: range.start.toISOString(),
          endDate: range.end.toISOString(),
        }
      : undefined;

    const [expenseSummary, allCategories, rawBalances] = await Promise.all([
      this.getExpenseSummary(userId, dateFilters),
      this.getAllCategories(userId),
      this.settlementService.getUserBalances(userId),
    ]);

    const balances = {
      ...rawBalances,
      netBalance: this.round(rawBalances.netBalance),
      totalOwedToYou: this.round(rawBalances.totalOwedToYou),
      totalYouOwe: this.round(rawBalances.totalYouOwe),
    };

    const filteredCategories = this.filterCategoriesByDate(
      allCategories,
      range,
    );
    const categorySummary = this.getAllCategoriesSummary(filteredCategories);

    const [personalBudgetOverview, groupsBudgetOverview] = await Promise.all([
      this.getPersonalBudgetOverview(userId, range),
      this.getGroupsBudgetOverview(userId, range),
    ]);

    const budgetOverview = {
      personalBudgetOverview,
      groupsBudgetOverview,
    };

    return {
      summary: {
        expenseSummary,
        categorySummary,
      },
      budgetOverview,
      balances,
    };
  }
}
