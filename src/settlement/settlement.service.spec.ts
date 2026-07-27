import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { SettlementService } from "./settlement.service";
import { PrismaService } from "../prisma/prisma.service";
import { SettlementStatus } from "../../generated/prisma/client/enums";

type PrismaExpenseMock = {
  findMany: jest.Mock<Promise<unknown[]>, [unknown]>;
};

type PrismaExpenseSettlementMock = {
  findMany: jest.Mock<Promise<unknown[]>, [unknown]>;
  findUnique: jest.Mock<Promise<unknown>, [unknown]>;
  create: jest.Mock<Promise<unknown>, [unknown]>;
  update: jest.Mock<Promise<unknown>, [unknown]>;
};

type PrismaGroupMock = {
  findMany: jest.Mock<Promise<unknown[]>, [unknown]>;
};

type PrismaServiceMock = {
  expense: PrismaExpenseMock;
  expenseSettlement: PrismaExpenseSettlementMock;
  group: PrismaGroupMock;
};

const makeMockUser = (overrides: Record<string, unknown> = {}) => {
  const id = (overrides.id as string) ?? "user-1";
  const num = id.split("-")[1] || "1";
  return {
    id,
    email: `user${num}@test.com`,
    username: (overrides.username as string) ?? `user${num}`,
    avatarUrl: null,
    isVerified: true,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
};

const makeMockParticipant = (overrides: Record<string, unknown> = {}) => ({
  user: makeMockUser({ id: "user-2", username: "user2" }),
  amount: 50,
  ...overrides,
});

const makeMockExpense = (overrides: Record<string, unknown> = {}) => {
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
    participants: [makeMockParticipant()],
    spentBy: makeMockUser({ id: spentById }),
    ...overrides,
  };
};

const makeMockSettlement = (overrides: Record<string, unknown> = {}) => ({
  id: "s-1",
  amount: 25,
  description: "Payment",
  status: "SETTLED",
  fromUserId: "user-2",
  toUserId: "user-1",
  groupId: "g-1",
  createdAt: new Date("2024-01-02"),
  updatedAt: new Date("2024-01-02"),
  fromUser: makeMockUser({ id: "user-2", username: "user2" }),
  toUser: makeMockUser({ id: "user-1", username: "user1" }),
  ...overrides,
});

describe("SettlementService", () => {
  let service: SettlementService;
  let prismaExpense: PrismaExpenseMock;
  let prismaExpenseSettlement: PrismaExpenseSettlementMock;
  let prismaGroup: PrismaGroupMock;

  beforeEach(async () => {
    prismaExpense = {
      findMany: jest.fn<Promise<unknown[]>, [unknown]>(),
    };

    prismaExpenseSettlement = {
      findMany: jest.fn<Promise<unknown[]>, [unknown]>(),
      findUnique: jest.fn<Promise<unknown>, [unknown]>(),
      create: jest.fn<Promise<unknown>, [unknown]>(),
      update: jest.fn<Promise<unknown>, [unknown]>(),
    };

    prismaGroup = {
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
            group: prismaGroup,
          } satisfies PrismaServiceMock,
        },
      ],
    }).compile();

    service = module.get<SettlementService>(SettlementService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getSettlementsByGroupId", () => {
    it("should compute settlements for a simple expense", async () => {
      const expenses = [
        makeMockExpense({
          participants: [makeMockParticipant({ amount: 50 })],
        }),
      ];
      prismaExpense.findMany.mockResolvedValue(expenses);
      prismaExpenseSettlement.findMany.mockResolvedValue([]);

      const result = await service.getSettlementsByGroupId("g-1");

      expect(result).toEqual([
        {
          from: { userId: "user-2", username: "user2", avatarUrl: null },
          to: { userId: "user-1", username: "user1", avatarUrl: null },
          amount: 50,
        },
      ]);
    });

    it("should handle multiple participants", async () => {
      const expenses = [
        makeMockExpense({
          participants: [
            makeMockParticipant({
              user: makeMockUser({ id: "user-2" }),
              amount: 25,
            }),
            makeMockParticipant({
              user: makeMockUser({ id: "user-3" }),
              amount: 25,
            }),
          ],
        }),
      ];
      prismaExpense.findMany.mockResolvedValue(expenses);
      prismaExpenseSettlement.findMany.mockResolvedValue([]);

      const result = await service.getSettlementsByGroupId("g-1");

      expect(result).toEqual([
        {
          from: { userId: "user-2", username: "user2", avatarUrl: null },
          to: { userId: "user-1", username: "user1", avatarUrl: null },
          amount: 25,
        },
        {
          from: { userId: "user-3", username: "user3", avatarUrl: null },
          to: { userId: "user-1", username: "user1", avatarUrl: null },
          amount: 25,
        },
      ]);
    });

    it("should handle cross expenses between users", async () => {
      const expenses = [
        makeMockExpense({
          id: "e-1",
          spentById: "user-1",
          participants: [
            makeMockParticipant({
              user: makeMockUser({ id: "user-2" }),
              amount: 50,
            }),
            makeMockParticipant({
              user: makeMockUser({ id: "user-3" }),
              amount: 50,
            }),
          ],
        }),
        makeMockExpense({
          id: "e-2",
          spentById: "user-2",
          participants: [
            makeMockParticipant({
              user: makeMockUser({ id: "user-1" }),
              amount: 30,
            }),
          ],
        }),
      ];
      prismaExpense.findMany.mockResolvedValue(expenses);
      prismaExpenseSettlement.findMany.mockResolvedValue([]);

      const result = await service.getSettlementsByGroupId("g-1");

      expect(result).toEqual([
        {
          from: { userId: "user-3", username: "user3", avatarUrl: null },
          to: { userId: "user-1", username: "user1", avatarUrl: null },
          amount: 50,
        },
        {
          from: { userId: "user-2", username: "user2", avatarUrl: null },
          to: { userId: "user-1", username: "user1", avatarUrl: null },
          amount: 20,
        },
      ]);
    });

    it("should account for already-settled amounts", async () => {
      const expenses = [
        makeMockExpense({
          participants: [makeMockParticipant({ amount: 50 })],
        }),
      ];
      const settlements = [makeMockSettlement({ amount: 20 })];
      prismaExpense.findMany.mockResolvedValue(expenses);
      prismaExpenseSettlement.findMany.mockResolvedValue(settlements);

      const result = await service.getSettlementsByGroupId("g-1");

      expect(result).toEqual([
        {
          from: { userId: "user-2", username: "user2", avatarUrl: null },
          to: { userId: "user-1", username: "user1", avatarUrl: null },
          amount: 30,
        },
      ]);
    });

    it("should return empty array when fully settled", async () => {
      const expenses = [
        makeMockExpense({
          participants: [makeMockParticipant({ amount: 50 })],
        }),
      ];
      const settlements = [makeMockSettlement({ amount: 50 })];
      prismaExpense.findMany.mockResolvedValue(expenses);
      prismaExpenseSettlement.findMany.mockResolvedValue(settlements);

      const result = await service.getSettlementsByGroupId("g-1");

      expect(result).toEqual([]);
    });

    it("should return empty array when no expenses exist", async () => {
      prismaExpense.findMany.mockResolvedValue([]);
      prismaExpenseSettlement.findMany.mockResolvedValue([]);

      const result = await service.getSettlementsByGroupId("g-1");

      expect(result).toEqual([]);
    });

    it("should handle complex multi-user scenario", async () => {
      const expenses = [
        makeMockExpense({
          id: "e-1",
          spentById: "user-1",
          participants: [
            makeMockParticipant({
              user: makeMockUser({ id: "user-2" }),
              amount: 30,
            }),
            makeMockParticipant({
              user: makeMockUser({ id: "user-3" }),
              amount: 30,
            }),
          ],
        }),
        makeMockExpense({
          id: "e-2",
          spentById: "user-2",
          participants: [
            makeMockParticipant({
              user: makeMockUser({ id: "user-1" }),
              amount: 50,
            }),
          ],
        }),
      ];
      prismaExpense.findMany.mockResolvedValue(expenses);
      prismaExpenseSettlement.findMany.mockResolvedValue([]);

      const result = await service.getSettlementsByGroupId("g-1");

      expect(result).toEqual([
        {
          from: { userId: "user-3", username: "user3", avatarUrl: null },
          to: { userId: "user-2", username: "user2", avatarUrl: null },
          amount: 20,
        },
        {
          from: { userId: "user-3", username: "user3", avatarUrl: null },
          to: { userId: "user-1", username: "user1", avatarUrl: null },
          amount: 10,
        },
      ]);
    });
  });

  describe("settleExpense", () => {
    it("should create a settlement record", async () => {
      const created = {
        id: "s-1",
        amount: 50,
        fromUserId: "user-2",
        toUserId: "user-1",
      };
      prismaExpenseSettlement.create.mockResolvedValue(created);

      const result = await service.settleExpense("g-1", {
        amount: 50,
        fromUserId: "user-2",
        toUserId: "user-1",
      });

      expect(prismaExpenseSettlement.create).toHaveBeenCalled();
      expect(result).toEqual(created);
    });
  });

  describe("updateSettlementStatus", () => {
    it("should update status successfully", async () => {
      const existing = { toUserId: "user-1", status: "PENDING" };
      const updated = { id: "s-1", toUserId: "user-1", status: "SETTLED" };
      prismaExpenseSettlement.findUnique.mockResolvedValue(existing);
      prismaExpenseSettlement.update.mockResolvedValue(updated);

      const result = await service.updateSettlementStatus(
        "user-1",
        "g-1",
        "s-1",
        SettlementStatus.SETTLED,
      );

      expect(prismaExpenseSettlement.findUnique).toHaveBeenCalledWith({
        where: { id: "s-1", groupId: "g-1" },
      });
      expect(prismaExpenseSettlement.update).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it("should throw NotFoundException when settlement not found", async () => {
      prismaExpenseSettlement.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSettlementStatus(
          "user-1",
          "g-1",
          "missing",
          SettlementStatus.SETTLED,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when not the receiver", async () => {
      prismaExpenseSettlement.findUnique.mockResolvedValue({
        toUserId: "user-2",
        status: "PENDING",
      });

      await expect(
        service.updateSettlementStatus(
          "user-1",
          "g-1",
          "s-1",
          SettlementStatus.SETTLED,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should throw BadRequestException when already SETTLED", async () => {
      prismaExpenseSettlement.findUnique.mockResolvedValue({
        toUserId: "user-1",
        status: "SETTLED",
      });

      await expect(
        service.updateSettlementStatus(
          "user-1",
          "g-1",
          "s-1",
          SettlementStatus.SETTLED,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getRecentSettlementTransactions", () => {
    it("should fetch with default count", async () => {
      const transactions = [makeMockSettlement()];
      prismaExpenseSettlement.findMany.mockResolvedValue(transactions);

      const result = await service.getRecentSettlementTransactions("g-1");

      expect(prismaExpenseSettlement.findMany).toHaveBeenCalledWith({
        where: { groupId: "g-1", status: undefined },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          fromUser: { select: { avatarUrl: true, username: true } },
          toUser: { select: { avatarUrl: true, username: true } },
        },
      });
      expect(result).toEqual(transactions);
    });

    it("should fetch with status filter and custom count", async () => {
      const transactions = [makeMockSettlement()];
      prismaExpenseSettlement.findMany.mockResolvedValue(transactions);

      const result = await service.getRecentSettlementTransactions(
        "g-1",
        SettlementStatus.SETTLED,
        5,
      );

      expect(prismaExpenseSettlement.findMany).toHaveBeenCalledWith({
        where: { groupId: "g-1", status: SettlementStatus.SETTLED },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          fromUser: { select: { avatarUrl: true, username: true } },
          toUser: { select: { avatarUrl: true, username: true } },
        },
      });
      expect(result).toEqual(transactions);
    });
  });

  describe("getUserBalances", () => {
    it("should aggregate balances correctly for a user across friend and regular groups", async () => {
      const mockGroups = [
        {
          id: "g-1",
          name: "",
          members: [{ userId: "user-1" }, { userId: "user-2" }],
        },
        {
          id: "g-2",
          name: "Trip",
          members: [
            { userId: "user-1" },
            { userId: "user-3" },
            { userId: "user-4" },
          ],
        },
      ];

      const mockExpenses = [
        makeMockExpense({
          id: "e-1",
          groupId: "g-1",
          spentById: "user-2",
          participants: [
            makeMockParticipant({
              user: makeMockUser({ id: "user-1" }),
              amount: 40,
            }),
          ],
        }),
        makeMockExpense({
          id: "e-2",
          groupId: "g-2",
          spentById: "user-1",
          participants: [
            makeMockParticipant({
              user: makeMockUser({ id: "user-3" }),
              amount: 100,
            }),
          ],
        }),
      ];

      prismaGroup.findMany.mockResolvedValue(mockGroups);
      prismaExpense.findMany.mockResolvedValue(mockExpenses);
      prismaExpenseSettlement.findMany.mockResolvedValue([]);

      const result = await service.getUserBalances("user-1");

      expect(prismaGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { members: { some: { userId: "user-1" } } },
        }),
      );

      expect(result.totalYouOwe).toBe(40);
      expect(result.totalOwedToYou).toBe(100);
      expect(result.netBalance).toBe(60);
      expect(result.items).toHaveLength(2);

      const youOweItem = result.items.find(
        (i) => i.settlementType === "YOU_OWE",
      );
      expect(youOweItem).toMatchObject({
        type: "friend",
        amount: 40,
        groupName: "Friend",
      });

      const owesYouItem = result.items.find(
        (i) => i.settlementType === "OWES_YOU",
      );
      expect(owesYouItem).toMatchObject({
        type: "group",
        amount: 100,
        groupName: "Trip",
      });
    });
  });
});
