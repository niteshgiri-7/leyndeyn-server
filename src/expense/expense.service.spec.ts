import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ExpenseService } from "./expense.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { ExpenseFilterQueryDto } from "./dto/expense-filter-query.dto";
import type { Expense, Category } from "../../generated/prisma/client/client";
import { SplitStrategy } from "../../generated/prisma/client/enums";
import { SplitStrategyFactory } from "./split/split-strategy.factory";
import { UpdateExpenseDto } from "./dto/update-expense.dto";

type ExpenseFindUniqueResult = Expense;

type PrismaExpenseMock = {
  findUnique: jest.Mock<Promise<ExpenseFindUniqueResult | null>, [unknown]>;
  findMany: jest.Mock<Promise<any[]>, [unknown]>;
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
    Promise<Category | null>,
    [{ where: { id: string }; select: { groupId: true } }]
  >;
};

type PrismaExpenseParticipantMock = {
  createManyAndReturn: jest.Mock<
    Promise<Array<{ expenseId: string; userId: string; amount: number }>>,
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
  groupId: null,
  splitStrategy: SplitStrategy.EQUAL,
  ...overrides,
});

type GroupExpenseResponse = {
  paidBy: {
    username: string;
    avatarUrl?: string | null;
  };
  paidAmount: number;
  cause: string;
  category: string;
  netAmount: number;
  spentAt: Date;
};

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
        Promise<Category | null>,
        [{ where: { id: string }; select: { groupId: true } }]
      >(),
    };

    prismaExpenseParticipant = {
      createManyAndReturn: jest.fn<
        Promise<Array<{ expenseId: string; userId: string; amount: number }>>,
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
    it("should return personal expenses for a user with filters", async () => {
      const expenses = [makeMockExpense()];
      prismaExpense.findMany.mockResolvedValue(expenses);
      const filters: ExpenseFilterQueryDto = {
        description: "coffee",
        categoryId: "category-1",
        minAmount: 50,
        maxAmount: 150,
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        spentById: ["someone-else", "another-user"],
      };

      const result = await service.getPersonalExpenses("user-1", filters);

      expect(prismaExpense.findMany).toHaveBeenCalledWith({
        where: {
          spentById: "user-1",
          groupId: null,
          description: {
            contains: "coffee",
            mode: "insensitive",
          },
          categoryId: "category-1",
          amount: {
            gte: 50,
            lte: 150,
          },
          createdAt: {
            gte: "2024-01-01",
            lte: "2024-01-31",
          },
        },
        include: {
          category: true,
        },
      });
      expect(result).toEqual(expenses);
    });

    it("should handle date range filtering", async () => {
      const expenses = [makeMockExpense()];
      const filters: ExpenseFilterQueryDto = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      };
      prismaExpense.findMany.mockResolvedValue(expenses);

      await service.getPersonalExpenses("user-1", filters);

      expect(prismaExpense.findMany).toHaveBeenCalledWith({
        where: {
          spentById: "user-1",
          groupId: null,
          createdAt: {
            gte: "2024-01-01",
            lte: "2024-01-31",
          },
        },
        include: {
          category: true,
        },
      });
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
      const filters: ExpenseFilterQueryDto = {
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      };
      prismaExpense.findMany.mockResolvedValue(expenses);

      await service.getAllExpensesOfAUser("user-1", filters);

      expect(prismaExpense.findMany).toHaveBeenCalledWith({
        where: {
          spentById: "user-1",
          createdAt: {
            gte: "2024-01-01",
            lte: "2024-01-31",
          },
        },
        include: {
          category: true,
          group: true,
        },
      });
    });
  });

  describe("getExpensesByGroupId", () => {
    it("should return decorated expenses for a group and current user", async () => {
      const expenses = [
        {
          ...makeMockExpense({
            description: "Coffee",
            spentById: "payer-1",
          }),
          category: {
            name: "Food",
          },
          spentBy: {
            username: "payer-1",
          },
          participants: [
            {
              userId: "user-1",
              amount: 50,
              user: {
                id: "user-1",
                username: "tester",
                email: "test@local",
                avatarUrl: null,
                passwordHash: null,
                createdAt: new Date("2024-01-01"),
                updatedAt: new Date("2024-01-01"),
                isVerified: true,
              },
            },
          ],
        },
      ];
      prismaExpense.findMany.mockResolvedValue(expenses as any[]);

      const filters: ExpenseFilterQueryDto = {
        description: "coffee",
        categoryId: "category-1",
        minAmount: 10,
        maxAmount: 120,
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        spentById: ["user-2", "user-3"],
      };

      const result = await service.getExpensesByGroupId(
        "group-1",
        "user-1",
        filters,
      );

      expect(prismaExpense.findMany).toHaveBeenCalledWith({
        where: {
          groupId: "group-1",
          description: {
            contains: "coffee",
            mode: "insensitive",
          },
          categoryId: "category-1",
          amount: {
            gte: 10,
            lte: 120,
          },
          createdAt: {
            gte: "2024-01-01",
            lte: "2024-01-31",
          },
          spentById: {
            in: ["user-2", "user-3"],
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        include: {
          category: true,
          spentBy: true,
          participants: {
            include: {
              user: true,
            },
          },
        },
      });
      expect(result).toEqual<GroupExpenseResponse[]>([
        {
          paidBy: {
            username: "payer-1",
            avatarUrl: undefined,
          },
          paidAmount: 100,
          cause: "Coffee",
          category: "Food",
          netAmount: -50,
          spentAt: new Date("2024-01-10"),
        },
      ]);
    });
  });

  describe("getExpenseByCategoryId", () => {
    it("should return expenses for a category", async () => {
      const expenses = [makeMockExpense()];
      prismaExpense.findMany.mockResolvedValue(expenses);
      const filters: ExpenseFilterQueryDto = {
        description: "coffee",
        minAmount: 75,
        maxAmount: 125,
        startDate: "2024-01-01",
        endDate: "2024-01-31",
      };

      const result = await service.getExpenseByCategoryId(
        "category-1",
        filters,
      );

      expect(prismaExpense.findMany).toHaveBeenCalledWith({
        where: {
          categoryId: "category-1",
          description: {
            contains: "coffee",
            mode: "insensitive",
          },
          amount: {
            gte: 75,
            lte: 125,
          },
          createdAt: {
            gte: "2024-01-01",
            lte: "2024-01-31",
          },
        },
      });
      expect(result).toEqual(expenses);
    });
  });

  describe("createPersonalExpense", () => {
    it("should create a personal expense", async () => {
      const dto: CreateExpenseDto = {
        amount: 100,
        description: "Coffee",
        categoryId: "category-1",
      };
      const created = makeMockExpense();
      prismaExpense.create.mockResolvedValue(created);

      const result = await service.createPersonalExpense(dto, "user-1");

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
  });

  describe("createGroupExpense", () => {
    it("should create a group expense with participants", async () => {
      const dto: CreateExpenseDto = {
        amount: 100,
        description: "Dinner",
        categoryId: "category-1",
        splitStrategy: SplitStrategy.EQUAL,
        participants: [
          {
            participantId: "user-2",
          },
        ],
      };
      const created = makeMockExpense({ splitStrategy: SplitStrategy.EQUAL });
      prismaCategory.findUnique.mockResolvedValue({
        id: "category-1",
        groupId: "group-1",
      } as any);
      prismaExpense.create.mockResolvedValue(created);
      prismaExpenseParticipant.createManyAndReturn.mockResolvedValue([
        {
          expenseId: created.id,
          userId: "user-2",
          amount: 50,
        },
      ]);

      const result = await service.createGroupExpense(dto, "user-1", "group-1");

      expect(prismaExpense.create).toHaveBeenCalledWith({
        data: {
          amount: dto.amount,
          description: dto.description,
          categoryId: dto.categoryId,
          spentById: "user-1",
          splitStrategy: SplitStrategy.EQUAL,
          groupId: "group-1",
        },
      });
      expect(splitStrategyFactory.getStrategy).toHaveBeenCalledWith(
        SplitStrategy.EQUAL,
      );
      expect(prismaExpenseParticipant.createManyAndReturn).toHaveBeenCalledWith(
        {
          data: [
            {
              expenseId: created.id,
              userId: "user-2",
              amount: 50,
            },
          ],
        },
      );
      expect(result).toEqual([
        {
          expenseId: created.id,
          userId: "user-2",
          amount: 50,
        },
      ]);
    });

    it("should require split strategy for non-personal expense", async () => {
      const dto: CreateExpenseDto = {
        amount: 100,
        description: "Dinner",
        categoryId: "category-1",
        participants: [
          {
            participantId: "user-2",
          },
        ],
      };

      await expect(
        service.createGroupExpense(dto, "user-1", "group-1"),
      ).rejects.toThrow(BadRequestException);
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
        ...makeMockExpense(),
      });
      prismaExpense.update.mockResolvedValue(updated);

      const result = await service.updateExpenseById(
        "expense-1",
        updateDto,
        "user-1",
      );

      expect(prismaExpense.update).toHaveBeenCalledWith({
        where: { id: "expense-1" },
        data: updateDto,
      });
      expect(result).toEqual(updated);
    });

    it("should throw NotFoundException when updating non-existent expense", async () => {
      prismaExpense.findUnique.mockResolvedValue(null);

      await expect(
        service.updateExpenseById(
          "missing",
          {
            amount: 150,
            categoryId: "categoryaa-1",
            description: "updated expense",
          },
          "user-1",
        ),
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
