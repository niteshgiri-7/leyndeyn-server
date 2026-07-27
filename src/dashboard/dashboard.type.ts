import { BudgetService } from "../budget/budget.service";
import { CategoryService } from "../category/category.service";

export type Categories = Awaited<
  ReturnType<CategoryService["getPersonalCategories"]>
>;

export interface CategorySummary {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  groupName?: string;
}

export type BudgetStatus = "ON_TRACK" | "OVER_BUDGET" | "UNDER_BUDGET";

export type Budgets = Awaited<
  ReturnType<BudgetService["getBudgetsForPersonalCategories"]>
>;
