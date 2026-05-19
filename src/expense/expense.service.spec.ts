import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ExpenseService } from "./expense.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { DateRangeDto } from "./dto/date-range.dto";
import type { Expense, Category } from "../../generated/prisma/client/client";
import {
  CategoryScope,
  SplitStrategy,
} from "../../generated/prisma/client/enums";
import { SplitStrategyFactory } from "./split/split-strategy.factory";
import { UpdateExpenseDto } from "./dto/update-expense.dto";

type ExpenseFindUniqueResult = Expense | { category: { scope: CategoryScope } };

type PrismaExpenseMock = {
  findUnique: jest.Mock<Promise<ExpenseFindUniqueResult | null>, [unknown]>;
  findMany: jest.Mock<Promise<Expense[]>, [unknown]>;
  create: jest.Mock<
    Promise<Expense>,
    [{ data: CreateExpenseDto & { spentById: string } }]
  >;
  update: jest.Mock<
    Promise<Expense>,
    [{ where: { id: string }; data: UpdateExpenseDto }]
  >;
  delete: jest.Mock<Promise<Expense>, [{ where: { id: string } }]>;
};

type PrismaCategoryMock = {
  findUnique: jest.Mock<
    Promise<Pick<Category, "scope"> | null>,
    [{ where: { id: string }; select: { scope: true } }]
  >;
};

type PrismaExpenseParticipantMock = {
  createMany: jest.Mock<
    Promise<{ count: number }>,
    [{ data: Array<{ expenseId: string; userId: string; amount: number }> }]
  >;
  updateMany: jest.Mock<
    Promise<{ count: number }>,
    [
      {
        where: { expenseId: string };
        data: Array<{ userId: string; expenseId: string; amount: number }>;
      },
    ]
  >;
};
type TransactionFn<T> = (prisma: PrismaServiceMock) => Promise<T>;

type PrismaServiceMock = {
  expense: PrismaExpenseMock;
  category: PrismaCategoryMock;
  expenseParticipant: PrismaExpenseParticipantMock;

  $transaction: <T>(fn: TransactionFn<T>) => Promise<T>;
};

const makeSplitStrategyFactoryMock = () => ({
  getStrategy: jest.fn(() => ({
    calculate: jest.fn(() => [
      {
        userId: "user-2",
        amount: 50,
      },
    ]),
  })),
});

const makeMockExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "expense-1",
  amount: 100,
  description: "Coffee",
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
  spentById: "user-1",
  categoryId: "category-1",
  splitStrategy: SplitStrategy.EQUAL,
  ...overrides,
});

describe("ExpenseService", () => {
  let service: ExpenseService;
  let prismaExpense: PrismaExpenseMock;
  let prismaCategory: PrismaCategoryMock;
  let prismaExpenseParticipant: PrismaExpenseParticipantMock;
  let prismaService: PrismaServiceMock;
  let splitStrategyFactory: ReturnType<typeof makeSplitStrategyFactoryMock>;

  beforeEach(async () => {
    prismaExpense = {
      findUnique: jest.fn<Promise<ExpenseFindUniqueResult | null>, [unknown]>(),
      findMany: jest.fn<Promise<Expense[]>, [unknown]>(),
      create: jest.fn<
        Promise<Expense>,
        [{ data: CreateExpenseDto & { spentById: string } }]
      >(),
      update: jest.fn<
        Promise<Expense>,
        [{ where: { id: string }; data: UpdateExpenseDto }]
      >(),
      delete: jest.fn<Promise<Expense>, [{ where: { id: string } }]>(),
    };

    prismaCategory = {
      findUnique: jest.fn<
        Promise<Pick<Category, "scope"> | null>,
        [{ where: { id: string }; select: { scope: true } }]
      >(),
    };

    prismaExpenseParticipant = {
      createMany: jest.fn<
        Promise<{ count: number }>,
        [{ data: Array<{ expenseId: string; userId: string; amount: number }> }]
      >(),
      updateMany: jest.fn<
        Promise<{ count: number }>,
        [
          {
            where: { expenseId: string };
            data: Array<{ userId: string; expenseId: string; amount: number }>;
          },
        ]
      >(),
    };

    prismaService = {
      expense: prismaExpense,
      category: prismaCategory,
      expenseParticipant: prismaExpenseParticipant,
      $transaction: jest.fn((callback) =>
        Promise.resolve(callback(prismaService)),
      ),
    };

    splitStrategyFactory = makeSplitStrategyFactoryMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: SplitStrategyFactory,
          useValue: splitStrategyFactory,
        },
      ],
    }).compile();

    service = module.get<ExpenseService>(ExpenseService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getExpenseById", () => {
    it("should return an expense by id with includes", async () => {
      const expense = makeMockExpense();
      prismaExpense.findUnique.mockResolvedValue(expense);

      const result = await service.getExpenseById("expense-1");

      expect(prismaExpense.findUnique).toHaveBeenCalledWith({
        where: { id: "expense-1" },
        include: { category: true, spentBy: true },
      });
      expect(result).toEqual(expense);
    });

    it("should throw NotFoundException when expense not found", async () => {
      prismaExpense.findUnique.mockResolvedValue(null);

      await expect(service.getExpenseById("missing")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getPersonalExpenses", () => {
    it("should return personal expenses for a user", async () => {
      const expenses = [makeMockExpense()];
      prismaExpense.findMany.mockResolvedValue(expenses);

      const result = await service.getPersonalExpenses("user-1");

      expect(prismaExpense.findMany).toHaveBeenCalled();
      expect(result).toEqual(expenses);
    });

    it("should handle date range filtering", async () => {
      const expenses = [makeMockExpense()];
      const dateRange: DateRangeDto = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      };
      prismaExpense.findMany.mockResolvedValue(expenses);

      await service.getPersonalExpenses("user-1", dateRange);

      expect(prismaExpense.findMany).toHaveBeenCalled();
    });
  });

  describe("getAllExpensesOfAUser", () => {
    it("should return all expenses for a user with nested includes", async () => {
      const expenses = [makeMockExpense()];
      prismaExpense.findMany.mockResolvedValue(expenses);

      const result = await service.getAllExpensesOfAUser("user-1");

      expect(prismaExpense.findMany).toHaveBeenCalled();
      expect(result).toEqual(expenses);
    });

    it("should handle date range for all expenses", async () => {
      const expenses = [makeMockExpense()];
      const dateRange: DateRangeDto = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      };
      prismaExpense.findMany.mockResolvedValue(expenses);

      await service.getAllExpensesOfAUser("user-1", dateRange);

      expect(prismaExpense.findMany).toHaveBeenCalled();
    });
  });

  describe("getExpensesByGroupId", () => {
    it("should return expenses for a group", async () => {
      const expenses = [makeMockExpense()];
      prismaExpense.findMany.mockResolvedValue(expenses);

      const result = await service.getExpensesByGroupId("group-1");

      expect(prismaExpense.findMany).toHaveBeenCalled();
      expect(result).toEqual(expenses);
    });
  });

  describe("getExpensesByFriendShipId", () => {
    it("should return expenses for a friendship", async () => {
      const expenses = [makeMockExpense()];
      prismaExpense.findMany.mockResolvedValue(expenses);

      const result = await service.getExpensesByFriendShipId("friendship-1");

      expect(prismaExpense.findMany).toHaveBeenCalled();
      expect(result).toEqual(expenses);
    });
  });

  describe("getExpenseByCategoryId", () => {
    it("should return expenses for a category", async () => {
      const expenses = [makeMockExpense()];
      prismaExpense.findMany.mockResolvedValue(expenses);

      const result = await service.getExpenseByCategoryId("category-1");

      expect(prismaExpense.findMany).toHaveBeenCalledWith({
        where: {
          categoryId: "category-1",
          createdAt: { gte: undefined, lte: undefined },
        },
      });
      expect(result).toEqual(expenses);
    });
  });

  describe("createExpense", () => {
    it("should create an expense", async () => {
      const dto: CreateExpenseDto = {
        amount: 100,
        description: "Coffee",
        categoryId: "category-1",
        scope: CategoryScope.PERSONAL,
      };
      const created = makeMockExpense();
      prismaExpense.create.mockResolvedValue(created);
      prismaCategory.findUnique.mockResolvedValue({
        scope: CategoryScope.PERSONAL,
      });

      const result = await service.createExpense(dto, "user-1");

      expect(prismaExpense.create).toHaveBeenCalledWith({
        data: {
          amount: dto.amount,
          description: dto.description,
          categoryId: dto.categoryId,
          spentById: "user-1",
          splitStrategy: SplitStrategy.NONE,
        },
      });
      expect(result).toEqual(created);
    });

    it("should create a non-personal expense with participants", async () => {
      const dto: CreateExpenseDto = {
        amount: 100,
        description: "Dinner",
        categoryId: "category-1",
        scope: CategoryScope.GROUP,
        splitStrategy: SplitStrategy.EQUAL,
        participants: [
          {
            participantId: "user-2",
          },
        ],
      };
      const created = makeMockExpense({ splitStrategy: SplitStrategy.EQUAL });
      prismaExpense.create.mockResolvedValue(created);
      prismaCategory.findUnique.mockResolvedValue({
        scope: CategoryScope.GROUP,
      });
      prismaExpenseParticipant.createMany.mockResolvedValue({ count: 1 });

      const result = await service.createExpense(dto, "user-1");

      expect(prismaExpense.create).toHaveBeenCalledWith({
        data: {
          amount: dto.amount,
          description: dto.description,
          categoryId: dto.categoryId,
          spentById: "user-1",
          splitStrategy: SplitStrategy.EQUAL,
        },
      });
      expect(splitStrategyFactory.getStrategy).toHaveBeenCalledWith(
        SplitStrategy.EQUAL,
      );
      expect(prismaExpenseParticipant.createMany).toHaveBeenCalledWith({
        data: [
          {
            expenseId: created.id,
            userId: "user-2",
            amount: 50,
          },
        ],
      });
      expect(result).toEqual({ count: 1 });
    });

    it("should require split strategy for non-personal expense", async () => {
      const dto: CreateExpenseDto = {
        amount: 100,
        description: "Dinner",
        categoryId: "category-1",
        scope: CategoryScope.GROUP,
        participants: [
          {
            participantId: "user-2",
          },
        ],
      };

      await expect(service.createExpense(dto, "user-1")).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaExpense.create).not.toHaveBeenCalled();
    });
  });

  describe("updateExpense", () => {
    it("should update an expense", async () => {
      const updateDto: UpdateExpenseDto = {
        amount: 150,
        categoryId: "category-1",
        description: "Updated expense",
      };
      const updated = makeMockExpense({ amount: 150 });
      prismaExpense.findUnique.mockResolvedValue({
        category: {
          scope: CategoryScope.PERSONAL,
        },
      });
      prismaExpense.update.mockResolvedValue(updated);
      prismaCategory.findUnique.mockResolvedValue({
        scope: CategoryScope.PERSONAL,
      });

      const result = await service.updateExpenseById("expense-1", updateDto);

      expect(prismaExpense.update).toHaveBeenCalledWith({
        where: { id: "expense-1" },
        data: updateDto,
      });
      expect(result).toEqual(updated);
    });

    it("should throw NotFoundException when updating non-existent expense", async () => {
      prismaExpense.findUnique.mockResolvedValue(null);

      await expect(
        service.updateExpenseById("missing", {
          amount: 150,
          categoryId: "categoryaa-1",
          description: "updated expense",
        }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaExpense.update).not.toHaveBeenCalled();
    });
  });

  describe("deleteExpenseById", () => {
    it("should delete an expense", async () => {
      prismaExpense.findUnique.mockResolvedValue(makeMockExpense());
      prismaExpense.delete.mockResolvedValue(makeMockExpense());

      await service.deleteExpenseById("expense-1");

      expect(prismaExpense.delete).toHaveBeenCalledWith({
        where: { id: "expense-1" },
      });
    });

    it("should throw NotFoundException when deleting non-existent expense", async () => {
      prismaExpense.findUnique.mockResolvedValue(null);

      await expect(service.deleteExpenseById("missing")).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaExpense.delete).not.toHaveBeenCalled();
    });
  });
});
