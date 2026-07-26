import { Test, TestingModule } from "@nestjs/testing";
import { ExpenseController } from "./expense.controller";
import { ExpenseService } from "./expense.service";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import { ManageExpenseGuard } from "./guard/manage-expense.guard";
import { CreateExpenseDto } from "./dto/create-expense.dto";
import { DateRangeDto } from "./dto/date-range.dto";
import type { Expense } from "../../generated/prisma/client/browser";
import type { JwtPayload } from "../auth/jwt-payload.type";
import { UpdateExpenseDto } from "./dto/update-expense.dto";

type GroupExpenseResponse = {
  paidBy: string;
  paidAmount: number;
  cause: string;
  category: string;
  oweAmount?: number;
  spentAt: Date;
};

type ExpenseServiceMock = {
  createExpense: jest.Mock<Promise<Expense>, [CreateExpenseDto, string]>;
  getExpenseByCategoryId: jest.Mock<
    Promise<Expense[]>,
    [string, DateRangeDto | undefined]
  >;
  getPersonalExpenses: jest.Mock<
    Promise<Expense[]>,
    [string, DateRangeDto | undefined]
  >;
  getExpensesByGroupId: jest.Mock<
    Promise<GroupExpenseResponse[]>,
    [string, string, DateRangeDto | undefined]
  >;
  updateExpenseById: jest.Mock<
    Promise<Expense>,
    [string, Partial<CreateExpenseDto>]
  >;
  deleteExpenseById: jest.Mock<Promise<void>, [string]>;
  getExpenseById: jest.Mock<Promise<Expense>, [string]>;
  getAllExpensesOfAUser: jest.Mock<
    Promise<Expense[]>,
    [string, DateRangeDto | undefined]
  >;
};

const makeMockExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: "expense-1",
  amount: 100,
  description: "Coffee",
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
  spentById: "user-1",
  categoryId: "category-1",
  groupId: null,
  splitStrategy: "EQUAL",
  ...overrides,
});

const mockGuard = { canActivate: jest.fn<boolean, []>().mockReturnValue(true) };

describe("ExpenseController", () => {
  let controller: ExpenseController;
  let expenseService: ExpenseServiceMock;
  const mockUser: JwtPayload = {
    id: "user-1",
    email: "test@local",
    username: "tester",
    isVerified: true,
  };

  beforeEach(async () => {
    expenseService = {
      createExpense: jest.fn<Promise<Expense>, [CreateExpenseDto, string]>(),
      getExpenseByCategoryId: jest.fn<
        Promise<Expense[]>,
        [string, DateRangeDto | undefined]
      >(),
      getPersonalExpenses: jest.fn<
        Promise<Expense[]>,
        [string, DateRangeDto | undefined]
      >(),
      getExpensesByGroupId: jest.fn<
        Promise<GroupExpenseResponse[]>,
        [string, string, DateRangeDto | undefined]
      >(),
      updateExpenseById: jest.fn<
        Promise<Expense>,
        [string, Partial<CreateExpenseDto>]
      >(),
      deleteExpenseById: jest.fn<Promise<void>, [string]>(),
      getExpenseById: jest.fn<Promise<Expense>, [string]>(),
      getAllExpensesOfAUser: jest.fn<
        Promise<Expense[]>,
        [string, DateRangeDto | undefined]
      >(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpenseController],
      providers: [{ provide: ExpenseService, useValue: expenseService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockGuard)
      .overrideGuard(ManageExpenseGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<ExpenseController>(ExpenseController);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("creates an expense", async () => {
    const dto: CreateExpenseDto = {
      amount: 100,
      description: "Coffee",
      categoryId: "category-1",
    };
    const created = makeMockExpense();
    expenseService.createExpense.mockResolvedValue(created);

    const result = await controller.createPersonalExpense(mockUser, dto);

    expect(result).toEqual(created);
    expect(expenseService.createExpense).toHaveBeenCalledWith(dto, mockUser.id);
  });

  it("gets expenses by category id", async () => {
    const expenses = [makeMockExpense()];
    expenseService.getExpenseByCategoryId.mockResolvedValue(expenses);

    const result = await controller.getExpensesOfCategoryInGroup(
      "group-1",
      "category-1",
    );

    expect(result).toEqual(expenses);
    expect(expenseService.getExpenseByCategoryId).toHaveBeenCalledWith(
      "category-1",
      undefined,
    );
  });

  it("gets personal expenses", async () => {
    const expenses = [makeMockExpense()];
    expenseService.getPersonalExpenses.mockResolvedValue(expenses);

    const result = await controller.getPersonalExpenses(mockUser);

    expect(result).toEqual(expenses);
    expect(expenseService.getPersonalExpenses).toHaveBeenCalledWith(
      mockUser.id,
      undefined,
    );
  });

  it("gets expenses by group id", async () => {
    const expenses: GroupExpenseResponse[] = [
      {
        paidBy: "payer-1",
        paidAmount: 100,
        cause: "Coffee",
        category: "Food",
        oweAmount: 50,
        spentAt: new Date("2024-01-10"),
      },
    ];
    expenseService.getExpensesByGroupId.mockResolvedValue(expenses);

    const result = await controller.getExpensesByGroupId(mockUser, "group-1");

    expect(result).toEqual(expenses);
    expect(expenseService.getExpensesByGroupId).toHaveBeenCalledWith(
      "group-1",
      mockUser.id,
      undefined,
    );
  });

  it("updates an expense", async () => {
    const updateDto: UpdateExpenseDto = {
      amount: 150,
      categoryId: "category-1",
      description: "Updated expense",
    };
    const updated = makeMockExpense({ amount: 150 });
    expenseService.updateExpenseById.mockResolvedValue(updated);

    const result = await controller.updatePersonalExpense(
      "expense-1",
      updateDto,
    );

    expect(result).toEqual(updated);
    expect(expenseService.updateExpenseById).toHaveBeenCalledWith(
      "expense-1",
      updateDto,
    );
  });

  it("deletes an expense", async () => {
    expenseService.deleteExpenseById.mockResolvedValue(undefined);

    await controller.deleteExpenseById("expense-1");

    expect(expenseService.deleteExpenseById).toHaveBeenCalledWith("expense-1");
  });

  it("gets an expense by id", async () => {
    const expense = makeMockExpense();
    expenseService.getExpenseById.mockResolvedValue(expense);

    const result = await controller.getExpenseById("expense-1");

    expect(result).toEqual(expense);
    expect(expenseService.getExpenseById).toHaveBeenCalledWith("expense-1");
  });

  it("gets all expenses of a user", async () => {
    const expenses = [makeMockExpense()];
    expenseService.getAllExpensesOfAUser.mockResolvedValue(expenses);

    const result = await controller.getAllExpensesOfAUser(mockUser);

    expect(result).toEqual(expenses);
    expect(expenseService.getAllExpensesOfAUser).toHaveBeenCalledWith(
      mockUser.id,
      undefined,
    );
  });
});
