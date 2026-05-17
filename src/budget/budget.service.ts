import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CategoryService } from "../category/category.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBudgetDto } from "./dto/create-budget.dto";

@Injectable()
export class BudgetService {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly prisma: PrismaService,
  ) {}

  async getAllBudgetsOfCategory(categoryId: string) {
    await this.categoryService.validateCategoryExists(categoryId);

    return await this.prisma.budget.findMany({
      where: {
        categoryId,
      },
    });
  }

  async getBudgetById(budgetId: string) {
    return await this.prisma.budget.findUnique({
      where: {
        id: budgetId,
      },
    });
  }

  async createBudgetForCategory(data: CreateBudgetDto, categoryId: string) {
    const { resetStrategy } = data;

    const exists = await this.prisma.budget.findFirst({
      where: {
        categoryId,
        resetStrategy,
      },
    });

    if (exists)
      throw new ConflictException(
        "A budget with the same reset strategy already exists for this category",
      );

    return await this.prisma.budget.create({
      data: {
        ...data,
        categoryId,
      },
    });
  }

  async updateBudget(budgetId: string, data: Partial<CreateBudgetDto>) {
    const exists = await this.getBudgetById(budgetId);

    if (!exists) throw new NotFoundException("Budget not found");

    return await this.prisma.budget.update({
      where: {
        id: budgetId,
      },
      data,
    });
  }

  async deleteBudget(budgetId: string) {
    const exists = await this.getBudgetById(budgetId);

    if (!exists) throw new NotFoundException("Budget not found");

    await this.prisma.budget.delete({
      where: {
        id: budgetId,
      },
    });
  }
}
