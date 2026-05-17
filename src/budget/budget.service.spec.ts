import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { BudgetService } from "./budget.service";
import { CategoryService } from "../category/category.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBudgetDto } from "./dto/create-budget.dto";
import { BudgetResetStrategy } from "../../generated/prisma/client/enums";
import type { Budget } from "../../generated/prisma/client/browser";

type BudgetFindManyArgs = { where: { categoryId: string } };
type BudgetFindUniqueArgs = { where: { id: string } };
type BudgetFindFirstArgs = {
  where: {
    categoryId: string;
    resetStrategy?: BudgetResetStrategy;
  };
};
type BudgetCreateArgs = {
  data: {
    name: string;
    amount: number;
    resetStrategy?: BudgetResetStrategy;
    categoryId: string;
  };
};
type BudgetUpdateArgs = {
  where: { id: string };
  data: Partial<CreateBudgetDto>;
};

type CategoryServiceMock = {
  validateCategoryExists: jest.Mock<Promise<void>, [string]>;
};

type PrismaBudgetMock = {
  findMany: jest.Mock<Promise<Budget[]>, [BudgetFindManyArgs]>;
  findUnique: jest.Mock<Promise<Budget | null>, [BudgetFindUniqueArgs]>;
  findFirst: jest.Mock<Promise<Budget | null>, [BudgetFindFirstArgs]>;
  create: jest.Mock<Promise<Budget>, [BudgetCreateArgs]>;
  update: jest.Mock<Promise<Budget>, [BudgetUpdateArgs]>;
  delete: jest.Mock<Promise<Budget>, [BudgetFindUniqueArgs]>;
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

describe("BudgetService", () => {
  let service: BudgetService;
  let categoryService: CategoryServiceMock;
  let prismaBudget: PrismaBudgetMock;

  beforeEach(async () => {
    categoryService = {
      validateCategoryExists: typedMock<Promise<void>, [string]>(),
    };

    prismaBudget = {
      findMany: typedMock<Promise<Budget[]>, [BudgetFindManyArgs]>(),
      findUnique: typedMock<Promise<Budget | null>, [BudgetFindUniqueArgs]>(),
      findFirst: typedMock<Promise<Budget | null>, [BudgetFindFirstArgs]>(),
      create: typedMock<Promise<Budget>, [BudgetCreateArgs]>(),
      update: typedMock<Promise<Budget>, [BudgetUpdateArgs]>(),
      delete: typedMock<Promise<Budget>, [BudgetFindUniqueArgs]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetService,
        { provide: CategoryService, useValue: categoryService },
        {
          provide: PrismaService,
          useValue: { budget: prismaBudget },
        },
      ],
    }).compile();

    service = module.get<BudgetService>(BudgetService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getAllBudgetsOfCategory", () => {
    it("should validate the category and return all budgets", async () => {
      const budgets = [makeMockBudget()];
      categoryService.validateCategoryExists.mockResolvedValue();
      prismaBudget.findMany.mockResolvedValue(budgets);

      const result = await service.getAllBudgetsOfCategory("category-1");

      expect(categoryService.validateCategoryExists).toHaveBeenCalledWith(
        "category-1",
      );
      expect(prismaBudget.findMany).toHaveBeenCalledWith({
        where: { categoryId: "category-1" },
      });
      expect(result).toEqual(budgets);
    });

    it("should propagate category validation failures", async () => {
      categoryService.validateCategoryExists.mockRejectedValue(
        new NotFoundException("Category not found"),
      );

      await expect(
        service.getAllBudgetsOfCategory("missing-category"),
      ).rejects.toThrow(NotFoundException);
      expect(prismaBudget.findMany).not.toHaveBeenCalled();
    });
  });

  describe("getBudgetById", () => {
    it("should return a budget by id", async () => {
      const budget = makeMockBudget();
      prismaBudget.findUnique.mockResolvedValue(budget);

      const result = await service.getBudgetById("budget-1");

      expect(prismaBudget.findUnique).toHaveBeenCalledWith({
        where: { id: "budget-1" },
      });
      expect(result).toEqual(budget);
    });

    it("should return null when budget does not exist", async () => {
      prismaBudget.findUnique.mockResolvedValue(null);

      await expect(service.getBudgetById("missing-budget")).resolves.toBeNull();
    });
  });

  describe("createBudgetForCategory", () => {
    const createInput = {
      name: "Monthly budget",
      amount: 500,
      resetStrategy: BudgetResetStrategy.MONTHLY,
    } satisfies CreateBudgetDto;

    it("should create a budget when one does not exist", async () => {
      const created = makeMockBudget();
      prismaBudget.findFirst.mockResolvedValue(null);
      prismaBudget.create.mockResolvedValue(created);

      const result = await service.createBudgetForCategory(
        createInput,
        "category-1",
      );

      expect(prismaBudget.findFirst).toHaveBeenCalledWith({
        where: {
          categoryId: "category-1",
          resetStrategy: BudgetResetStrategy.MONTHLY,
        },
      });
      expect(prismaBudget.create).toHaveBeenCalledWith({
        data: {
          name: createInput.name,
          amount: createInput.amount,
          resetStrategy: createInput.resetStrategy,
          categoryId: "category-1",
        },
      });
      expect(result).toEqual(created);
    });

    it("should throw ConflictException when same reset strategy exists", async () => {
      prismaBudget.findFirst.mockResolvedValue(makeMockBudget());

      await expect(
        service.createBudgetForCategory(createInput, "category-1"),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("updateBudget", () => {
    it("should update a budget when it exists", async () => {
      const updated = makeMockBudget({ amount: 750 });
      prismaBudget.findUnique.mockResolvedValue(makeMockBudget());
      prismaBudget.update.mockResolvedValue(updated);

      const updateInput: Partial<CreateBudgetDto> = { amount: 750 };

      const result = await service.updateBudget("budget-1", updateInput);

      expect(prismaBudget.update).toHaveBeenCalledWith({
        where: { id: "budget-1" },
        data: updateInput,
      });
      expect(result).toEqual(updated);
    });

    it("should throw NotFoundException when budget does not exist", async () => {
      prismaBudget.findUnique.mockResolvedValue(null);

      await expect(
        service.updateBudget("missing-budget", { amount: 750 }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaBudget.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteBudget", () => {
    it("should delete a budget when it exists", async () => {
      prismaBudget.findUnique.mockResolvedValue(makeMockBudget());
      prismaBudget.delete.mockResolvedValue(makeMockBudget());

      await service.deleteBudget("budget-1");

      expect(prismaBudget.delete).toHaveBeenCalledWith({
        where: { id: "budget-1" },
      });
    });

    it("should throw NotFoundException when budget does not exist", async () => {
      prismaBudget.findUnique.mockResolvedValue(null);

      await expect(service.deleteBudget("missing-budget")).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaBudget.delete).not.toHaveBeenCalled();
    });
  });
});
