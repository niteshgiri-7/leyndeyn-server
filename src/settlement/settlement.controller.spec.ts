import { Test, TestingModule } from "@nestjs/testing";
import { SettlementController } from "./settlement.controller";
import { SettlementService } from "./settlement.service";

describe("SettlementController", () => {
  let controller: SettlementController;
  let settlementService: { getPendingSettlementsByGroupId: jest.Mock };

  beforeEach(async () => {
    settlementService = {
      getPendingSettlementsByGroupId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettlementController],
      providers: [{ provide: SettlementService, useValue: settlementService }],
    }).compile();

    controller = module.get<SettlementController>(SettlementController);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getPendingSettlements", () => {
    it("should call service with the groupId and return the result", async () => {
      const mockSettlements = [{ from: "user-2", to: "user-1", amount: 50 }];
      settlementService.getPendingSettlementsByGroupId.mockResolvedValue(
        mockSettlements,
      );

      const result = await controller.getPendingSettlements("group-1");

      expect(
        settlementService.getPendingSettlementsByGroupId,
      ).toHaveBeenCalledWith("group-1");
      expect(result).toEqual(mockSettlements);
    });

    it("should return empty array when there are no pending settlements", async () => {
      settlementService.getPendingSettlementsByGroupId.mockResolvedValue([]);

      const result = await controller.getPendingSettlements("group-1");

      expect(result).toEqual([]);
    });

    it("should delegate to the service without transformation", async () => {
      const rawResult = [
        { from: "user-3", to: "user-1", amount: 30 },
        { from: "user-3", to: "user-2", amount: 20 },
      ];
      settlementService.getPendingSettlementsByGroupId.mockResolvedValue(
        rawResult,
      );

      const result = await controller.getPendingSettlements("group-1");

      expect(result).toBe(rawResult);
    });
  });
});
