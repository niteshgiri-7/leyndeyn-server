import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserRepository } from "../repository/user.repository";

describe("UserService", () => {
  let service: UserService;
  const userRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: userRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("findUserById throws when user missing", async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(service.findUserById("id-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("findUserById returns user when found", async () => {
    const user = { id: "id-1", email: "user@example.com" };
    userRepository.findById.mockResolvedValue(user);

    await expect(service.findUserById("id-1")).resolves.toEqual(user);
  });

  it("findUserByEmail throws when user missing", async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      service.findUserByEmail("user@example.com"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("findUserByEmail returns user when found", async () => {
    const user = { id: "id-1", email: "user@example.com" };
    userRepository.findByEmail.mockResolvedValue(user);

    await expect(service.findUserByEmail("user@example.com")).resolves.toEqual(
      user,
    );
  });

  it("findAllUsers throws when no users", async () => {
    userRepository.findAll.mockResolvedValue([]);

    await expect(service.findAllUsers()).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("findAllUsers throws when repository returns null", async () => {
    userRepository.findAll.mockResolvedValue(null);

    await expect(service.findAllUsers()).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("findAllUsers returns list when users exist", async () => {
    const users = [{ id: "id-1", email: "user@example.com" }];
    userRepository.findAll.mockResolvedValue(users);

    await expect(service.findAllUsers()).resolves.toEqual(users);
  });

  it("createUser passes input to repository", async () => {
    const input = { email: "user@example.com", username: "user" };
    const created = { id: "id-1", ...input };
    userRepository.create.mockResolvedValue(created);

    await expect(service.createUser(input)).resolves.toEqual(created);
    expect(userRepository.create).toHaveBeenCalledWith(input);
  });

  it("createUser propagates repository errors", async () => {
    userRepository.create.mockRejectedValue(new Error("create-failed"));

    await expect(
      service.createUser({ email: "user@example.com", username: "user" }),
    ).rejects.toThrow("create-failed");
  });
});
