import { Test, TestingModule } from "@nestjs/testing";
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UserRepository } from "../repository/user.repository";

describe("AuthController", () => {
  let controller: AuthController;
  const userRepository = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };
  const authService = {
    comparePassword: jest.fn(),
    generateJwtToken: jest.fn(),
    hashPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: UserRepository,
          useValue: userRepository,
        },
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("login", () => {
    it("throws NotFoundException when user is missing", async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        controller.login({
          email: "missing@example.com",
          password: "pass1234",
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws NotFoundException when user has no email or password hash", async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: "1",
        email: null,
        passwordHash: null,
      });

      await expect(
        controller.login({ email: "user@example.com", password: "pass1234" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws NotFoundException when user has no email", async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: "1",
        email: null,
        passwordHash: "hashed",
      });

      await expect(
        controller.login({ email: "user@example.com", password: "pass1234" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws NotFoundException when user has no password hash", async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: "1",
        email: "user@example.com",
        passwordHash: null,
      });

      await expect(
        controller.login({ email: "user@example.com", password: "pass1234" }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("throws UnauthorizedException when password is invalid", async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: "1",
        email: "user@example.com",
        username: "user",
        displayName: null,
        isVerified: false,
        passwordHash: "hashed",
      });
      authService.comparePassword.mockResolvedValue(false);

      await expect(
        controller.login({ email: "user@example.com", password: "wrong" }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it("returns tokens for valid credentials", async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: "1",
        email: "user@example.com",
        username: "user",
        displayName: null,
        isVerified: false,
        passwordHash: "hashed",
      });
      authService.comparePassword.mockResolvedValue(true);
      authService.generateJwtToken
        .mockResolvedValueOnce("access")
        .mockResolvedValueOnce("refresh");

      const result = await controller.login({
        email: "user@example.com",
        password: "pass1234",
      });

      expect(result).toEqual({
        accessToken: "access",
        refreshToken: "refresh",
        userId: "1",
        message: "Welcome back user!",
      });
      expect(authService.generateJwtToken).toHaveBeenCalledTimes(2);
    });

    it("propagates errors from AuthService.comparePassword", async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: "1",
        email: "user@example.com",
        username: "user",
        displayName: null,
        isVerified: false,
        passwordHash: "hashed",
      });
      authService.comparePassword.mockRejectedValue(
        new Error("compare-failed"),
      );

      await expect(
        controller.login({ email: "user@example.com", password: "pass1234" }),
      ).rejects.toThrow("compare-failed");
    });
  });

  describe("signup", () => {
    it("throws ConflictException when user already exists", async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: "1",
        email: "user@example.com",
      });

      await expect(
        controller.signup({
          email: "user@example.com",
          username: "user",
          password: "pass1234",
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("creates a new user and returns tokens", async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      authService.hashPassword.mockResolvedValue("hashed");
      userRepository.create.mockResolvedValue({
        id: "1",
        email: "user@example.com",
        username: "user",
        displayName: null,
        isVerified: false,
      });
      authService.generateJwtToken
        .mockResolvedValueOnce("access")
        .mockResolvedValueOnce("refresh");

      const result = await controller.signup({
        email: "user@example.com",
        username: "user",
        password: "pass1234",
      });

      expect(authService.hashPassword).toHaveBeenCalledWith("pass1234");
      expect(userRepository.create).toHaveBeenCalledWith({
        email: "user@example.com",
        passwordHash: "hashed",
        username: "user",
      });
      expect(result).toEqual({
        accessToken: "access",
        refreshToken: "refresh",
        message: "Welcome abroad user!",
      });
    });

    it("propagates errors from hashPassword", async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      authService.hashPassword.mockRejectedValue(new Error("hash-failed"));

      await expect(
        controller.signup({
          email: "user@example.com",
          username: "user",
          password: "pass1234",
        }),
      ).rejects.toThrow("hash-failed");
    });

    it("propagates errors from userRepository.create", async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      authService.hashPassword.mockResolvedValue("hashed");
      userRepository.create.mockRejectedValue(new Error("create-failed"));

      await expect(
        controller.signup({
          email: "user@example.com",
          username: "user",
          password: "pass1234",
        }),
      ).rejects.toThrow("create-failed");
    });
  });
});
