import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

type AuthServiceMock = {
  login: jest.Mock;
  signup: jest.Mock;
  refreshToken: jest.Mock;
};

describe("AuthController", () => {
  let controller: AuthController;
  let authService: AuthServiceMock;

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      signup: jest.fn(),
      refreshToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("login", () => {
    it("should delegate to authService.login and return the result", async () => {
      const result = {
        accessToken: "access",
        refreshToken: "refresh",
        userId: "1",
        message: "Welcome back user!",
      };
      authService.login.mockResolvedValue(result);

      const response = await controller.login({
        email: "user@example.com",
        password: "pass1234",
      });

      expect(authService.login).toHaveBeenCalledWith(
        "user@example.com",
        "pass1234",
      );
      expect(response).toEqual(result);
    });
  });

  describe("signup", () => {
    it("should delegate to authService.signup and return the result", async () => {
      const result = {
        accessToken: "access",
        refreshToken: "refresh",
        message: "Welcome abroad user!",
      };
      authService.signup.mockResolvedValue(result);

      const response = await controller.signup({
        email: "user@example.com",
        username: "user",
        password: "pass1234",
      });

      expect(authService.signup).toHaveBeenCalledWith(
        "user@example.com",
        "pass1234",
        "user",
      );
      expect(response).toEqual(result);
    });
  });

  describe("refreshToken", () => {
    it("should delegate to authService.refreshToken and return the result", async () => {
      const result = {
        accessToken: "new-access",
        refreshToken: "new-refresh",
        message: "Token refreshed successfully",
      };
      authService.refreshToken.mockResolvedValue(result);

      const response = await controller.refreshToken("old-token");

      expect(authService.refreshToken).toHaveBeenCalledWith("old-token");
      expect(response).toEqual(result);
    });
  });
});
