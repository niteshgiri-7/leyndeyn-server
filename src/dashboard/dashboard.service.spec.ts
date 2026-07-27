import { Test, TestingModule } from "@nestjs/testing";
import { DashboardService } from "./dashboard.service";
import { GroupService } from "../group/group.service";
import { ExpenseService } from "../expense/expense.service";
import { SettlementService } from "../settlement/settlement.service";
import { BudgetService } from "../budget/budget.service";
import { CategoryService } from "../category/category.service";

describe("DashboardService", () => {
  let service: DashboardService;
  let settlementServiceMock: Partial<SettlementService>;
  let expenseServiceMock: Partial<ExpenseService>;
  let categoryServiceMock: Partial<CategoryService>;
  let budgetServiceMock: Partial<BudgetService>;
  let groupServiceMock: Partial<GroupService>;

  beforeEach(async () => {
    settlementServiceMock = {
      getUserBalances: jest.fn().mockResolvedValue({
        totalYouOwe: 10,
        totalOwedToYou: 20,
        netBalance: 10,
        items: [],
      }),
    };
    expenseServiceMock = {
      getAllExpensesOfAUser: jest.fn().mockResolvedValue([]),
      getAllExpensesOfAUserAsParticipant: jest.fn().mockResolvedValue([]),
      getPersonalExpenses: jest.fn().mockResolvedValue([]),
    };
    categoryServiceMock = {
      getPersonalCategories: jest.fn().mockResolvedValue([]),
      getAllGroupsCategories: jest.fn().mockResolvedValue([]),
    };
    budgetServiceMock = {
      getBudgetsForPersonalCategories: jest.fn().mockResolvedValue([]),
      getBudgetsForAllTheGroups: jest.fn().mockResolvedValue([]),
    };
    groupServiceMock = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: GroupService, useValue: groupServiceMock },
        { provide: ExpenseService, useValue: expenseServiceMock },
        { provide: SettlementService, useValue: settlementServiceMock },
        { provide: BudgetService, useValue: budgetServiceMock },
        { provide: CategoryService, useValue: categoryServiceMock },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return formatted dashboard data including balances", async () => {
    const data = await service.getDashboardData("user-1");
    expect(data.balances).toBeDefined();
    expect(data.balances.netBalance).toBe(10);
    expect(settlementServiceMock.getUserBalances).toHaveBeenCalledWith(
      "user-1",
    );
  });
});
