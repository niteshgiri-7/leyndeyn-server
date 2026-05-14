import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  let service: AuthService;
  const jwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("hashPassword should hash and compare correctly", async () => {
    const password = "password-123";
    const hashed = await service.hashPassword(password);

    expect(hashed).toBeDefined();
    expect(hashed).not.toEqual(password);
    await expect(service.comparePassword(password, hashed)).resolves.toBe(true);
    await expect(
      service.comparePassword("wrong-password", hashed),
    ).resolves.toBe(false);
  });

  it("generateJwtToken should call JwtService with payload and options", async () => {
    jwtService.signAsync.mockResolvedValue("token");
    const payload = {
      email: "user@example.com",
      username: "user",
      displayName: null,
      isVerified: false,
      id: "1",
    };

    const token = await service.generateJwtToken(payload, { expiresIn: "1h" });

    expect(jwtService.signAsync).toHaveBeenCalledWith(payload, {
      expiresIn: "1h",
    });
    expect(token).toBe("token");
  });

  it("generateJwtToken should propagate JwtService errors", async () => {
    jwtService.signAsync.mockRejectedValue(new Error("jwt-failed"));
    const payload = {
      email: "user@example.com",
      username: "user",
      displayName: null,
      isVerified: false,
      id: "1",
    };

    await expect(service.generateJwtToken(payload)).rejects.toThrow(
      "jwt-failed",
    );
  });
});
