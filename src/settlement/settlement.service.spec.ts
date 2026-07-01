import { Test, TestingModule } from "@nestjs/testing";
import { SettlementService } from "./settlement.service";
import { PrismaService } from "../prisma/prisma.service";
import type { Balance } from "./type/settlement.type";

type PrismaExpenseMock = {
  findMany: jest.Mock<Promise<unknown[]>, [unknown]>;
};

type PrismaExpenseSettlementMock = {
  findMany: jest.Mock<Promise<unknown[]>, [unknown]>;
};

const makeParticipant = (overrides: Record<string, unknown> = {}) => ({
  id: "p-1",
  amount: 50,
  userId: "user-2",
  expenseId: "e-1",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  ...overrides,
});

const makeExpense = (overrides: Record<string, unknown> = {}) => {
  const spentById = (overrides.spentById as string) ?? "user-1";
  return {
    id: "e-1",
    amount: 100,
    description: "Dinner",
    splitStrategy: "EQUAL",
    spentById,
    categoryId: "c-1",
    groupId: "g-1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    participants: [makeParticipant()],
    spentBy: {
      id: spentById,
      email: "user@test.com",
      username: "user1",
      avatarUrl: null,
      isVerified: true,
    },
    ...overrides,
  };
};

const makeSettlement = (overrides: Record<string, unknown> = {}) => ({
  amount: 25,
  fromUserId: "user-2",
  toUserId: "user-1",
  status: "SETTLED",
  ...overrides,
});

describe("SettlementService", () => {
  let service: SettlementService;
  let prismaExpense: PrismaExpenseMock;
  let prismaExpenseSettlement: PrismaExpenseSettlementMock;

  beforeEach(async () => {
    prismaExpense = {
      findMany: jest.fn<Promise<unknown[]>, [unknown]>(),
    };

    prismaExpenseSettlement = {
      findMany: jest.fn<Promise<unknown[]>, [unknown]>(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementService,
        {
          provide: PrismaService,
          useValue: {
            expense: prismaExpense,
            expenseSettlement: prismaExpenseSettlement,
          },
        },
      ],
    }).compile();

    service = module.get<SettlementService>(SettlementService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getAllExpensesByGroupId", () => {
    it("should fetch expenses with participants and spentBy", async () => {
      const expenses = [makeExpense()];
      prismaExpense.findMany.mockResolvedValue(expenses);

      const result = await service.getAllExpensesByGroupId("g-1");

      expect(prismaExpense.findMany).toHaveBeenCalledWith({
        where: { groupId: "g-1" },
        include: {
          participants: true,
          spentBy: { omit: { passwordHash: true } },
        },
      });
      expect(result).toEqual(expenses);
    });

    it("should return empty array when no expenses exist", async () => {
      prismaExpense.findMany.mockResolvedValue([]);

      const result = await service.getAllExpensesByGroupId("g-1");

      expect(result).toEqual([]);
    });
  });

  describe("getAllSettlementsByGroupId", () => {
    it("should fetch settlements with selected fields only", async () => {
      const settlements = [makeSettlement()];
      prismaExpenseSettlement.findMany.mockResolvedValue(settlements);

      const result = await service.getAllSettlementsByGroupId("g-1");

      expect(prismaExpenseSettlement.findMany).toHaveBeenCalledWith({
        where: { groupId: "g-1" },
        select: {
          amount: true,
          fromUserId: true,
          toUserId: true,
          status: true,
        },
      });
      expect(result).toEqual(settlements);
    });

    it("should return empty array when no settlements exist", async () => {
      prismaExpenseSettlement.findMany.mockResolvedValue([]);

      const result = await service.getAllSettlementsByGroupId("g-1");

      expect(result).toEqual([]);
    });
  });

  describe("calculateBalances", () => {
    it("should credit spender and debit participant for a single expense", () => {
      const expenses = [
        makeExpense({
          participants: [makeParticipant({ amount: 50, userId: "user-2" })],
        }),
      ];

      const result = service.calculateBalances(expenses as never, []);

      expect(result.get("user-1")).toBe(50);
      expect(result.get("user-2")).toBe(-50);
    });

    it("should handle multiple participants correctly", () => {
      const expenses = [
        makeExpense({
          spentById: "user-1",
          participants: [
            makeParticipant({ id: "p-1", amount: 25, userId: "user-2" }),
            makeParticipant({ id: "p-2", amount: 25, userId: "user-3" }),
          ],
        }),
      ];

      const result = service.calculateBalances(expenses as never, []);

      expect(result.get("user-1")).toBe(50);
      expect(result.get("user-2")).toBe(-25);
      expect(result.get("user-3")).toBe(-25);
    });

    it("should handle multiple expenses", () => {
      const expenses = [
        makeExpense({
          id: "e-1",
          spentById: "user-1",
          participants: [makeParticipant({ amount: 30, userId: "user-2" })],
        }),
        makeExpense({
          id: "e-2",
          spentById: "user-2",
          participants: [makeParticipant({ amount: 20, userId: "user-1" })],
        }),
      ];

      const result = service.calculateBalances(expenses as never, []);

      expect(result.get("user-1")).toBe(10);
      expect(result.get("user-2")).toBe(-10);
    });

    it("should adjust balances for already-settled expenses", () => {
      const expenses = [
        makeExpense({
          participants: [makeParticipant({ amount: 50, userId: "user-2" })],
        }),
      ];
      const settlements = [makeSettlement({ amount: 20 })];

      const result = service.calculateBalances(
        expenses as never,
        settlements as never,
      );

      expect(result.get("user-1")).toBe(30);
      expect(result.get("user-2")).toBe(-30);
    });

    it("should handle fully settled expense (balance becomes zero)", () => {
      const expenses = [
        makeExpense({
          participants: [makeParticipant({ amount: 50, userId: "user-2" })],
        }),
      ];
      const settlements = [makeSettlement({ amount: 50 })];

      const result = service.calculateBalances(
        expenses as never,
        settlements as never,
      );

      expect(result.get("user-1")).toBe(0);
      expect(result.get("user-2")).toBe(0);
    });

    it("should return empty map when no expenses or settlements", () => {
      const result = service.calculateBalances([], []);
      expect(result.size).toBe(0);
    });

    it("should handle user being both spender and participant across expenses", () => {
      const expenses = [
        makeExpense({
          id: "e-1",
          spentById: "user-1",
          participants: [
            makeParticipant({ id: "p-1", amount: 40, userId: "user-2" }),
            makeParticipant({ id: "p-2", amount: 40, userId: "user-3" }),
          ],
        }),
        makeExpense({
          id: "e-2",
          spentById: "user-2",
          participants: [
            makeParticipant({ id: "p-3", amount: 30, userId: "user-1" }),
          ],
        }),
      ];

      const result = service.calculateBalances(expenses as never, []);

      expect(result.get("user-1")).toBe(50);
      expect(result.get("user-2")).toBe(-10);
      expect(result.get("user-3")).toBe(-40);
    });

    it("should handle multiple settled expenses", () => {
      const expenses = [
        makeExpense({
          participants: [makeParticipant({ amount: 100, userId: "user-2" })],
        }),
      ];
      const settlements = [
        makeSettlement({ amount: 30 }),
        makeSettlement({ amount: 30 }),
      ];

      const result = service.calculateBalances(
        expenses as never,
        settlements as never,
      );

      expect(result.get("user-1")).toBe(40);
      expect(result.get("user-2")).toBe(-40);
    });
  });

  describe("splitBalancesToDebtorAndCreditor", () => {
    it("should split balances into debtors and creditors", () => {
      const balances = new Map<string, number>([
        ["user-1", 100],
        ["user-2", -50],
        ["user-3", -30],
      ]);

      const result = service.splitBalancesToDebtorAndCreditor(balances);

      expect(result.creditors).toEqual([{ userId: "user-1", amount: 100 }]);
      expect(result.debtors).toEqual([
        { userId: "user-2", amount: 50 },
        { userId: "user-3", amount: 30 },
      ]);
    });

    it("should convert negative amounts to positive for debtors", () => {
      const balances = new Map<string, number>([["user-1", -75]]);

      const result = service.splitBalancesToDebtorAndCreditor(balances);

      expect(result.debtors).toEqual([{ userId: "user-1", amount: 75 }]);
      expect(result.creditors).toEqual([]);
    });

    it("should sort debtors descending by amount", () => {
      const balances = new Map<string, number>([
        ["user-a", -10],
        ["user-b", -50],
        ["user-c", -30],
      ]);

      const result = service.splitBalancesToDebtorAndCreditor(balances);

      expect(result.debtors.map((d) => d.amount)).toEqual([50, 30, 10]);
      expect(result.debtors.map((d) => d.userId)).toEqual([
        "user-b",
        "user-c",
        "user-a",
      ]);
    });

    it("should sort creditors descending by amount", () => {
      const balances = new Map<string, number>([
        ["user-a", 30],
        ["user-b", 100],
        ["user-c", 10],
      ]);

      const result = service.splitBalancesToDebtorAndCreditor(balances);

      expect(result.creditors.map((c) => c.amount)).toEqual([100, 30, 10]);
      expect(result.creditors.map((c) => c.userId)).toEqual([
        "user-b",
        "user-a",
        "user-c",
      ]);
    });

    it("should return empty arrays for empty map", () => {
      const result = service.splitBalancesToDebtorAndCreditor(new Map());

      expect(result.debtors).toEqual([]);
      expect(result.creditors).toEqual([]);
    });

    it("should place zero-balance users into creditors", () => {
      const balances = new Map<string, number>([["user-1", 0]]);

      const result = service.splitBalancesToDebtorAndCreditor(balances);

      expect(result.debtors).toEqual([]);
      expect(result.creditors).toEqual([{ userId: "user-1", amount: 0 }]);
    });
  });

  describe("simplifyDebts", () => {
    it("should produce a single settlement for one debtor and one creditor", () => {
      const debtors: Balance[] = [{ userId: "user-2", amount: 50 }];
      const creditors: Balance[] = [{ userId: "user-1", amount: 50 }];

      const result = service.simplifyDebts(debtors, creditors);

      expect(result).toEqual([{ from: "user-2", to: "user-1", amount: 50 }]);
    });

    it("should handle multiple debtors paying one creditor", () => {
      const debtors: Balance[] = [
        { userId: "user-2", amount: 30 },
        { userId: "user-3", amount: 20 },
      ];
      const creditors: Balance[] = [{ userId: "user-1", amount: 50 }];

      const result = service.simplifyDebts(debtors, creditors);

      expect(result).toEqual([
        { from: "user-2", to: "user-1", amount: 30 },
        { from: "user-3", to: "user-1", amount: 20 },
      ]);
    });

    it("should handle one debtor paying multiple creditors", () => {
      const debtors: Balance[] = [{ userId: "user-1", amount: 50 }];
      const creditors: Balance[] = [
        { userId: "user-2", amount: 30 },
        { userId: "user-3", amount: 20 },
      ];

      const result = service.simplifyDebts(debtors, creditors);

      expect(result).toEqual([
        { from: "user-1", to: "user-2", amount: 30 },
        { from: "user-1", to: "user-3", amount: 20 },
      ]);
    });

    it("should match exact amounts across multiple pairs", () => {
      const debtors: Balance[] = [
        { userId: "user-2", amount: 40 },
        { userId: "user-3", amount: 60 },
      ];
      const creditors: Balance[] = [
        { userId: "user-1", amount: 40 },
        { userId: "user-4", amount: 60 },
      ];

      const result = service.simplifyDebts(debtors, creditors);

      expect(result).toEqual([
        { from: "user-2", to: "user-1", amount: 40 },
        { from: "user-3", to: "user-4", amount: 60 },
      ]);
    });

    it("should return empty array when both arrays are empty", () => {
      expect(service.simplifyDebts([], [])).toEqual([]);
    });

    it("should return empty array when only debtors exist", () => {
      expect(service.simplifyDebts([{ userId: "u1", amount: 10 }], [])).toEqual(
        [],
      );
    });

    it("should return empty array when only creditors exist", () => {
      expect(service.simplifyDebts([], [{ userId: "u1", amount: 10 }])).toEqual(
        [],
      );
    });

    it("should handle complex multi-person scenario", () => {
      const debtors: Balance[] = [
        { userId: "user-2", amount: 100 },
        { userId: "user-3", amount: 40 },
      ];
      const creditors: Balance[] = [
        { userId: "user-1", amount: 80 },
        { userId: "user-4", amount: 60 },
      ];

      const result = service.simplifyDebts(debtors, creditors);

      expect(result).toEqual([
        { from: "user-2", to: "user-1", amount: 80 },
        { from: "user-2", to: "user-4", amount: 20 },
        { from: "user-3", to: "user-4", amount: 40 },
      ]);
    });

    it("should skip near-zero remaining amounts (< 0.01)", () => {
      const debtors: Balance[] = [{ userId: "user-2", amount: 50.005 }];
      const creditors: Balance[] = [{ userId: "user-1", amount: 50 }];

      const result = service.simplifyDebts(debtors, creditors);

      expect(result).toEqual([{ from: "user-2", to: "user-1", amount: 50 }]);
    });
  });

  describe("getPendingSettlementsByGroupId", () => {
    it("should compute settlements for a simple expense", async () => {
      const expenses = [
        makeExpense({
          participants: [makeParticipant({ amount: 50, userId: "user-2" })],
        }),
      ];
      prismaExpense.findMany.mockResolvedValue(expenses);
      prismaExpenseSettlement.findMany.mockResolvedValue([]);

      const result = await service.getPendingSettlementsByGroupId("g-1");

      expect(result).toEqual([{ from: "user-2", to: "user-1", amount: 50 }]);
    });

    it("should account for already-settled amounts", async () => {
      const expenses = [
        makeExpense({
          participants: [makeParticipant({ amount: 50, userId: "user-2" })],
        }),
      ];
      const settlements = [makeSettlement({ amount: 20 })];
      prismaExpense.findMany.mockResolvedValue(expenses);
      prismaExpenseSettlement.findMany.mockResolvedValue(settlements);

      const result = await service.getPendingSettlementsByGroupId("g-1");

      expect(result).toEqual([{ from: "user-2", to: "user-1", amount: 30 }]);
    });

    it("should return empty array for group with no expenses", async () => {
      prismaExpense.findMany.mockResolvedValue([]);
      prismaExpenseSettlement.findMany.mockResolvedValue([]);

      const result = await service.getPendingSettlementsByGroupId("g-1");

      expect(result).toEqual([]);
    });

    it("should return empty array when everything is fully settled", async () => {
      const expenses = [
        makeExpense({
          participants: [makeParticipant({ amount: 50, userId: "user-2" })],
        }),
      ];
      const settlements = [makeSettlement({ amount: 50 })];

      prismaExpense.findMany.mockResolvedValue(expenses);
      prismaExpenseSettlement.findMany.mockResolvedValue(settlements);

      const result = await service.getPendingSettlementsByGroupId("g-1");

      expect(result).toEqual([]);
    });

    it("should handle complex multi-user group scenario", async () => {
      const expenses = [
        makeExpense({
          id: "e-1",
          spentById: "user-1",
          participants: [
            makeParticipant({ id: "p-1", amount: 30, userId: "user-2" }),
            makeParticipant({ id: "p-2", amount: 30, userId: "user-3" }),
          ],
        }),
        makeExpense({
          id: "e-2",
          spentById: "user-2",
          participants: [
            makeParticipant({ id: "p-3", amount: 50, userId: "user-1" }),
          ],
        }),
      ];
      prismaExpense.findMany.mockResolvedValue(expenses);
      prismaExpenseSettlement.findMany.mockResolvedValue([]);

      const result = await service.getPendingSettlementsByGroupId("g-1");

      expect(result).toEqual([
        { from: "user-3", to: "user-2", amount: 20 },
        { from: "user-3", to: "user-1", amount: 10 },
      ]);
    });

    it("should call all sub-methods in correct order", async () => {
      const getExpensesSpy = jest.spyOn(service, "getAllExpensesByGroupId");
      const getSettlementsSpy = jest.spyOn(
        service,
        "getAllSettlementsByGroupId",
      );
      const calculateSpy = jest.spyOn(service, "calculateBalances");
      const splitSpy = jest.spyOn(service, "splitBalancesToDebtorAndCreditor");
      const simplifySpy = jest.spyOn(service, "simplifyDebts");

      prismaExpense.findMany.mockResolvedValue([]);
      prismaExpenseSettlement.findMany.mockResolvedValue([]);

      await service.getPendingSettlementsByGroupId("g-1");

      expect(getExpensesSpy).toHaveBeenCalledWith("g-1");
      expect(getSettlementsSpy).toHaveBeenCalledWith("g-1");
      expect(calculateSpy).toHaveBeenCalled();
      expect(splitSpy).toHaveBeenCalled();
      expect(simplifySpy).toHaveBeenCalled();

      getExpensesSpy.mockRestore();
      getSettlementsSpy.mockRestore();
      calculateSpy.mockRestore();
      splitSpy.mockRestore();
      simplifySpy.mockRestore();
    });
  });
});
