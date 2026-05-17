import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ExpenseService } from "./expense.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { DateRangeDto } from "./dto/date-range.dto";
import type { Expense } from "../../generated/prisma/client/browser";

type PrismaExpenseMock = {
  findUnique: jest.Mock<Promise<Expense | null>, [{ where: { id: string } }]>;
  findMany: jest.Mock<Promise<Expense[]>, [unknown]>;
  create: jest.Mock<
    Promise<Expense>,
    [{ data: CreateExpenseDto & { spentById: string } }]
  >;
  update: jest.Mock<
    Promise<Expense>,
    [{ where: { id: string }; data: Partial<CreateExpenseDto> }]
  >;
  delete: jest.Mock<Promise<Expense>, [{ where: { id: string } }]>;
};

const makeMockExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "expense-1",
  amount: 100,
  description: "Coffee",
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
  spentById: "user-1",
  categoryId: "category-1",
  ...overrides,
});

describe("ExpenseService", () => {
  let service: ExpenseService;
  let prismaExpense: PrismaExpenseMock;

  beforeEach(async () => {
    prismaExpense = {
      findUnique: jest.fn<
        Promise<Expense | null>,
        [{ where: { id: string } }]
      >(),
      findMany: jest.fn<Promise<Expense[]>, [unknown]>(),
      create: jest.fn<
        Promise<Expense>,
        [{ data: CreateExpenseDto & { spentById: string } }]
      >(),
      update: jest.fn<
        Promise<Expense>,
        [{ where: { id: string }; data: Partial<CreateExpenseDto> }]
      >(),
      delete: jest.fn<Promise<Expense>, [{ where: { id: string } }]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpenseService,
        {
          provide: PrismaService,
          useValue: { expense: prismaExpense },
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
      };
      const created = makeMockExpense();
      prismaExpense.create.mockResolvedValue(created);

      const result = await service.createExpense(dto, "user-1");

      expect(prismaExpense.create).toHaveBeenCalledWith({
        data: { ...dto, spentById: "user-1" },
      });
      expect(result).toEqual(created);
    });
  });

  describe("updateExpense", () => {
    it("should update an expense", async () => {
      const updateDto: Partial<CreateExpenseDto> = { amount: 150 };
      const updated = makeMockExpense({ amount: 150 });
      prismaExpense.findUnique.mockResolvedValue(makeMockExpense());
      prismaExpense.update.mockResolvedValue(updated);

      const result = await service.updateExpense("expense-1", updateDto);

      expect(prismaExpense.update).toHaveBeenCalledWith({
        where: { id: "expense-1" },
        data: updateDto,
      });
      expect(result).toEqual(updated);
    });

    it("should throw NotFoundException when updating non-existent expense", async () => {
      prismaExpense.findUnique.mockResolvedValue(null);

      await expect(
        service.updateExpense("missing", { amount: 150 }),
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
