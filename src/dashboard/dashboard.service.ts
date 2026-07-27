import { Injectable } from "@nestjs/common";
import { BudgetResetStrategy } from "../../generated/prisma/client/enums";
import { BudgetService } from "../budget/budget.service";
import { CategoryService } from "../category/category.service";
import { ExpenseService } from "../expense/expense.service";
import { GroupService } from "../group/group.service";
import { SettlementService } from "../settlement/settlement.service";
import { getBudgetProjection } from "../utils/budget.strategy.util";
import { Budgets, Categories, CategorySummary } from "./dashboard.type";

@Injectable()
export class DashboardService {
  constructor(
    private readonly groupService: GroupService,
    private readonly expenseService: ExpenseService,
    private readonly settlementService: SettlementService,
    private readonly budgetService: BudgetService,
    private readonly categoryService: CategoryService,
  ) {}

  async getAllCategories(userId: string) {
    const [personalCategories, groupCategories] = await Promise.all([
      this.categoryService.getPersonalCategories(userId),
      this.categoryService.getAllGroupsCategories(userId),
    ]);

    return [...personalCategories, ...groupCategories];
  }

  getAllCategoriesSummary(categories: Categories): CategorySummary[] {
    const totalExpenseAcrossCategories = categories.reduce(
      (total, amount) =>
        total +
        amount.expenses.reduce((total, expense) => total + expense.amount, 0),
      0,
    );

    const categorySummary = categories.map((category) => {
      const totalBudget = category.budgets.reduce(
        (total, budget) => total + budget.amount,
        0,
      );
      const totalExpenses = category.expenses.reduce(
        (total, expense) => total + expense.amount,
        0,
      );
      const percentage =
        totalBudget > 0 ? totalExpenses / totalExpenseAcrossCategories : 0;
      return {
        id: category.id,
        name: category.name,
        amount: totalExpenses,
        percentage,
      };
    });

    return categorySummary;
  }

  async getAllGroups(userId: string) {
    const friendGroups = await this.groupService.getAllFriendGroups(userId);
    const allGroups = await this.groupService.getAllGroupsForUser(userId);

    return { friendGroups, allGroups };
  }

  async getExpenseSummary(userId: string) {
    const [expensesAsPayer, expensesAsParticipant, personalExpenses] =
      await Promise.all([
        this.expenseService.getAllExpensesOfAUser(userId),
        this.expenseService.getAllExpensesOfAUserAsParticipant(userId),
        this.expenseService.getPersonalExpenses(userId),
      ]);

    const totalPersonalSpent = personalExpenses.reduce(
      (total, expense) => total + expense.amount,
      0,
    );
    const totalSplittedShare = expensesAsParticipant.reduce(
      (total, expense) => total + expense.amount,
      0,
    );
    const totalExpensesAsPayer = expensesAsPayer.reduce(
      (total, expense) => total + expense.amount,
      0,
    );

    const totalSpent =
      totalPersonalSpent + totalSplittedShare + totalExpensesAsPayer;

    return {
      totalSpent,
      totalPersonalSpent,
      totalSplittedShare,
    };
  }

  generateBudgetOverview(
    budgets: Budgets,
    strategy: BudgetResetStrategy = "MONTHLY",
  ) {
    const totalBudget = budgets.reduce(
      (total, budget) => total + budget.amount,
      0,
    );
    const totalExpense = budgets.reduce(
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

    const budgetOverviews = budgets.map((budget) => {
      const totalBudget = budget.amount;
      const totalExpense = budget.category.expenses.reduce(
        (total, expense) => total + expense.amount,
        0,
      );
      const remainingBudget = totalBudget - totalExpense;
      const categoryName = budget.category.name;
      const categoryId = budget.category.id;
      const groupId = budget.category?.groupId;
      const groupName = budget.category?.group?.name;
      const percentageUsed =
        totalBudget > 0 ? (totalExpense / totalBudget) * 100 : 0;

      return {
        groupId,
        groupName,
        categoryId,
        categoryName,
        totalBudget,
        totalExpense,
        remainingBudget,
        percentageUsed,
        ...getBudgetProjection(totalBudget, totalExpense, budget.resetStrategy),
      };
    });

    return {
      totalBudget,
      totalExpense,
      totalRemainingBudget,
      budgetProjection,
      budgetOverviews,
    };
  }

  async getPersonalBudgetOverview(userId: string) {
    const budgets =
      await this.budgetService.getBudgetsForPersonalCategories(userId);
    return this.generateBudgetOverview(budgets);
  }

  async getGroupsBudgetOverview(userId: string) {
    const budgets = await this.budgetService.getBudgetsForAllTheGroups(userId);
    return this.generateBudgetOverview(budgets);
  }

  async getDashboardData(userId: string) {
    const [expenseSummary, allCategories, balances] = await Promise.all([
      this.getExpenseSummary(userId),
      this.getAllCategories(userId),
      this.settlementService.getUserBalances(userId),
    ]);

    const categorySummary = this.getAllCategoriesSummary(allCategories);

    const [personalBudgetOverview, groupsBudgetOverview] = await Promise.all([
      this.getPersonalBudgetOverview(userId),
      this.getGroupsBudgetOverview(userId),
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
