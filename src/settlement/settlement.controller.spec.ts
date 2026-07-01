import { Test, TestingModule } from "@nestjs/testing";
import { SettlementController } from "./settlement.controller";
import { SettlementService } from "./settlement.service";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CreateExpenseSettlementDto,
  GetSettlementStatusQueryDto,
  UpdateSettlementStatusDto,
} from "./dto/create-expense-settlement.dto";
import type { JwtPayload } from "../auth/jwt-payload.type";
import { SettlementStatus } from "../../generated/prisma/client/enums";

type SettlementServiceMock = {
  getSettlementsByGroupId: jest.Mock;
  settleExpense: jest.Mock;
  getRecentSettlementTransactions: jest.Mock;
  updateSettlementStatus: jest.Mock;
};

const mockGuard = { canActivate: jest.fn<boolean, []>().mockReturnValue(true) };

describe("SettlementController", () => {
  let controller: SettlementController;
  let settlementService: SettlementServiceMock;
  const mockUser: JwtPayload = {
    id: "user-1",
    email: "test@local",
    username: "tester",
    isVerified: true,
  };

  beforeEach(async () => {
    settlementService = {
      getSettlementsByGroupId: jest.fn(),
      settleExpense: jest.fn(),
      getRecentSettlementTransactions: jest.fn(),
      updateSettlementStatus: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettlementController],
      providers: [{ provide: SettlementService, useValue: settlementService }],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<SettlementController>(SettlementController);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getSettlements", () => {
    it("should call service with groupId and return result", async () => {
      const mockResult = [
        {
          from: { userId: "user-2", username: "", avatarUrl: null },
          to: { userId: "user-1", username: "", avatarUrl: null },
          amount: 50,
        },
      ];
      settlementService.getSettlementsByGroupId.mockResolvedValue(mockResult);

      const result = await controller.getSettlements("group-1");

      expect(settlementService.getSettlementsByGroupId).toHaveBeenCalledWith(
        "group-1",
      );
      expect(result).toEqual(mockResult);
    });
  });

  describe("settleExpense", () => {
    it("should call service with groupId and dto", async () => {
      const dto: CreateExpenseSettlementDto = {
        amount: 50,
        description: "Payment",
        fromUserId: "user-2",
        toUserId: "user-1",
      };
      const created = { id: "s-1", ...dto };
      settlementService.settleExpense.mockResolvedValue(created);

      const result = await controller.settleExpense("group-1", dto);

      expect(settlementService.settleExpense).toHaveBeenCalledWith(
        "group-1",
        dto,
      );
      expect(result).toEqual(created);
    });
  });

  describe("getRecentSettlementTransactions", () => {
    it("should call service with groupId and query params", async () => {
      const query: GetSettlementStatusQueryDto = {
        status: SettlementStatus.SETTLED,
        numberOfTransactions: 5,
      };
      const transactions = [{ id: "s-1", amount: 50 }];
      settlementService.getRecentSettlementTransactions.mockResolvedValue(
        transactions,
      );

      const result = await controller.getRecentSettlementTransactions(
        "group-1",
        query,
      );

      expect(
        settlementService.getRecentSettlementTransactions,
      ).toHaveBeenCalledWith("group-1", SettlementStatus.SETTLED, 5);
      expect(result).toEqual(transactions);
    });

    it("should call service with defaults when no filters provided", async () => {
      const query: GetSettlementStatusQueryDto = {};
      settlementService.getRecentSettlementTransactions.mockResolvedValue([]);

      await controller.getRecentSettlementTransactions("group-1", query);

      expect(
        settlementService.getRecentSettlementTransactions,
      ).toHaveBeenCalledWith("group-1", undefined, undefined);
    });
  });

  describe("updateSettlementStatus", () => {
    it("should call service with user, group, settlement id and status", async () => {
      const dto: UpdateSettlementStatusDto = {
        status: SettlementStatus.SETTLED,
      };
      const updated = { id: "s-1", status: SettlementStatus.SETTLED };
      settlementService.updateSettlementStatus.mockResolvedValue(updated);

      const result = await controller.updateSettlementStatus(
        "group-1",
        "settlement-1",
        mockUser,
        dto,
      );

      expect(settlementService.updateSettlementStatus).toHaveBeenCalledWith(
        mockUser.id,
        "group-1",
        "settlement-1",
        SettlementStatus.SETTLED,
      );
      expect(result).toEqual(updated);
    });
  });
});
