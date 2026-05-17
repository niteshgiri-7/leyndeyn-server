import { Test, TestingModule } from "@nestjs/testing";
import { BudgetController } from "./budget.controller";
import { BudgetService } from "./budget.service";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import { ManageBudgetGuard } from "./guard/manage-budget.guard";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { BudgetResetStrategy } from "../../generated/prisma/client/enums";
import type { Budget } from "../../generated/prisma/client/browser";

type BudgetServiceMock = {
  getAllBudgetsOfCategory: jest.Mock<Promise<Budget[]>, [string]>;
  createBudgetForCategory: jest.Mock<
    Promise<Budget>,
    [CreateBudgetDto, string]
  >;
  getBudgetById: jest.Mock<Promise<Budget | null>, [string]>;
  updateBudget: jest.Mock<Promise<Budget>, [string, Partial<CreateBudgetDto>]>;
  deleteBudget: jest.Mock<Promise<void>, [string]>;
};

const typedMock = <ReturnType, Args extends unknown[]>() =>
  jest.fn<ReturnType, Args>();

const makeMockBudget = (overrides: Partial<Budget> = {}): Budget => ({
  id: "budget-1",
  name: "Monthly budget",
  amount: 500,
  resetStrategy: BudgetResetStrategy.MONTHLY,
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
  categoryId: "category-1",
  ...overrides,
});

const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

describe("BudgetController", () => {
  let controller: BudgetController;
  let budgetService: BudgetServiceMock;

  beforeEach(async () => {
    budgetService = {
      getAllBudgetsOfCategory: typedMock<Promise<Budget[]>, [string]>(),
      createBudgetForCategory: typedMock<
        Promise<Budget>,
        [CreateBudgetDto, string]
      >(),
      getBudgetById: typedMock<Promise<Budget | null>, [string]>(),
      updateBudget: typedMock<
        Promise<Budget>,
        [string, Partial<CreateBudgetDto>]
      >(),
      deleteBudget: typedMock<Promise<void>, [string]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetController],
      providers: [{ provide: BudgetService, useValue: budgetService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockGuard)
      .overrideGuard(ManageBudgetGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<BudgetController>(BudgetController);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("gets all budgets for a category", async () => {
    const budgets = [makeMockBudget()];
    budgetService.getAllBudgetsOfCategory.mockResolvedValue(budgets);

    const result = await controller.getAllBudgetsOfCategory("category-1");

    expect(result).toEqual(budgets);
    expect(budgetService.getAllBudgetsOfCategory).toHaveBeenCalledWith(
      "category-1",
    );
  });

  it("creates a budget for a category", async () => {
    const dto: CreateBudgetDto = {
      name: "Monthly budget",
      amount: 500,
      resetStrategy: BudgetResetStrategy.MONTHLY,
    };
    const created = makeMockBudget();
    budgetService.createBudgetForCategory.mockResolvedValue(created);

    const result = await controller.createBudgetForCategory("category-1", dto);

    expect(result).toEqual(created);
    expect(budgetService.createBudgetForCategory).toHaveBeenCalledWith(
      dto,
      "category-1",
    );
  });

  it("gets a budget by id", async () => {
    const budget = makeMockBudget();
    budgetService.getBudgetById.mockResolvedValue(budget);

    const result = await controller.getBudgetById("budget-1");

    expect(result).toEqual(budget);
    expect(budgetService.getBudgetById).toHaveBeenCalledWith("budget-1");
  });

  it("updates a budget", async () => {
    const updateDto: Partial<CreateBudgetDto> = { amount: 750 };
    const updated = makeMockBudget({ amount: 750 });
    budgetService.updateBudget.mockResolvedValue(updated);

    const result = await controller.updateBudget("budget-1", updateDto);

    expect(result).toEqual(updated);
    expect(budgetService.updateBudget).toHaveBeenCalledWith(
      "budget-1",
      updateDto,
    );
  });

  it("deletes a budget", async () => {
    budgetService.deleteBudget.mockResolvedValue(undefined);

    await controller.deleteBudget("budget-1");

    expect(budgetService.deleteBudget).toHaveBeenCalledWith("budget-1");
  });
});
