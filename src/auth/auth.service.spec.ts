import { Test, TestingModule } from "@nestjs/testing";
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { UserRepository } from "../repository/user.repository";

type UserRepositoryMock = {
  findByEmail: jest.Mock;
  findById: jest.Mock;
  create: jest.Mock;
};

type JwtServiceMock = {
  signAsync: jest.Mock;
  verifyAsync: jest.Mock;
};

describe("AuthService", () => {
  let service: AuthService;
  let userRepository: UserRepositoryMock;
  let jwtService: JwtServiceMock;

  beforeEach(async () => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        { provide: UserRepository, useValue: userRepository },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("login", () => {
    it("should throw NotFoundException when user not found", async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login("missing@test.com", "pass1234"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when user has no passwordHash", async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: "1",
        email: "user@test.com",
        passwordHash: null,
      });

      await expect(service.login("user@test.com", "pass1234")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException when user has no email", async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: "1",
        email: null,
        passwordHash: "hashed",
      });

      await expect(service.login("user@test.com", "pass1234")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw UnauthorizedException when password is invalid", async () => {
      const hashed = await bcrypt.hash("correct-password", 10);
      userRepository.findByEmail.mockResolvedValue({
        id: "1",
        email: "user@test.com",
        username: "user",
        isVerified: false,
        passwordHash: hashed,
      });

      await expect(
        service.login("user@test.com", "wrong-password"),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should return tokens for valid credentials", async () => {
      const password = "pass1234";
      const hashed = await bcrypt.hash(password, 10);
      userRepository.findByEmail.mockResolvedValue({
        id: "1",
        email: "user@test.com",
        username: "user",
        isVerified: false,
        passwordHash: hashed,
      });
      jwtService.signAsync
        .mockResolvedValueOnce("access-token")
        .mockResolvedValueOnce("refresh-token");

      const result = await service.login("user@test.com", password);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        message: "Welcome back user!",
        userId: "1",
      });
    });
  });

  describe("signup", () => {
    it("should throw ConflictException when email already exists", async () => {
      userRepository.findByEmail.mockResolvedValue({
        id: "1",
        email: "exists@test.com",
      });

      await expect(
        service.signup("exists@test.com", "pass1234", "user"),
      ).rejects.toThrow(ConflictException);
    });

    it("should create user with hashed password and return tokens", async () => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue({
        id: "1",
        email: "user@test.com",
        username: "user",
        isVerified: false,
      });
      jwtService.signAsync
        .mockResolvedValueOnce("access-token")
        .mockResolvedValueOnce("refresh-token");

      const result = await service.signup("user@test.com", "pass1234", "user");

      const createCalls = (
        userRepository.create as jest.Mock<
          Promise<unknown>,
          [Record<string, unknown>]
        >
      ).mock.calls;
      expect(createCalls[0][0].email).toBe("user@test.com");
      expect(createCalls[0][0].username).toBe("user");
      expect(createCalls[0][0].passwordHash).not.toBe("pass1234");
      expect(createCalls[0][0].passwordHash).toMatch(/^\$2[ab]\$\d+\$/);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: "access-token",
        refreshToken: "refresh-token",
        message: "Welcome abroad user!",
      });
    });
  });

  describe("refreshToken", () => {
    it("should throw when token is invalid", async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error("invalid token"));

      await expect(service.refreshToken("bad-token")).rejects.toThrow();
    });

    it("should throw UnauthorizedException when user not found", async () => {
      jwtService.verifyAsync.mockResolvedValue({ id: "1" });
      userRepository.findById.mockResolvedValue(null);

      await expect(service.refreshToken("valid-token")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should return new tokens for valid refresh token", async () => {
      jwtService.verifyAsync.mockResolvedValue({
        id: "1",
        email: "user@test.com",
      });
      userRepository.findById.mockResolvedValue({
        id: "1",
        email: "user@test.com",
        username: "user",
        isVerified: false,
      });
      jwtService.signAsync
        .mockResolvedValueOnce("new-access-token")
        .mockResolvedValueOnce("new-refresh-token");

      const result = await service.refreshToken("valid-token");

      expect(jwtService.verifyAsync).toHaveBeenCalledWith("valid-token");
      expect(userRepository.findById).toHaveBeenCalledWith("1");
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        message: "Token refreshed successfully",
      });
    });
  });
});
