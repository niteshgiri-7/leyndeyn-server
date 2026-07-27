import { Test, TestingModule } from "@nestjs/testing";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { JwtService } from "@nestjs/jwt";
import type { JwtPayload } from "../auth/jwt-payload.type";

describe("DashboardController", () => {
  let controller: DashboardController;
  let dashboardServiceMock: Partial<DashboardService>;

  beforeEach(async () => {
    dashboardServiceMock = {
      getDashboardData: jest.fn().mockResolvedValue({
        summary: {},
        budgetOverview: {},
        balances: {},
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [
        { provide: DashboardService, useValue: dashboardServiceMock },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should fetch dashboard data for user", async () => {
    const mockPayload: JwtPayload = {
      id: "user-1",
      email: "user@test.com",
      username: "user1",
      isVerified: true,
    };
    const data = await controller.getDashboard(mockPayload);
    expect(dashboardServiceMock.getDashboardData).toHaveBeenCalledWith(
      "user-1",
    );
    expect(data).toBeDefined();
  });
});
