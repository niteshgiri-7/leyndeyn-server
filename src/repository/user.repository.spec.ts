import { Test, TestingModule } from "@nestjs/testing";
import { UserRepository } from "./user.repository";
import { PrismaService } from "../prisma/prisma.service";
import { mockPrismaService } from "../common/testing/mocks";
import {
  UserCreateInput,
  UserUpdateInput,
} from "../../generated/prisma/client/models";

describe("UserRepository", () => {
  let repository: UserRepository;
  let prismaService: ReturnType<typeof mockPrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: PrismaService,
          useFactory: mockPrismaService,
        },
      ],
    }).compile();

    repository = module.get<UserRepository>(UserRepository);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(repository).toBeDefined();
  });

  describe("findById", () => {
    it("should call prisma.user.findUnique with correct params", async () => {
      const mockUser = { id: "1", email: "test@example.com" };
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findById("1");

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: "1" },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe("findByEmail", () => {
    it("should call prisma.user.findUnique with correct params", async () => {
      const mockUser = { id: "1", email: "test@example.com" };
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await repository.findByEmail("test@example.com");

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe("findAll", () => {
    it("should call prisma.user.findMany", async () => {
      const mockUsers = [{ id: "1", email: "user1@example.com" }];
      prismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await repository.findAll();

      expect(prismaService.user.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockUsers);
    });
  });

  describe("create", () => {
    it("should call prisma.user.create with correct data", async () => {
      const createData = { email: "new@example.com", password: "hash" };
      const mockUser = { id: "2", ...createData };
      prismaService.user.create.mockResolvedValue(mockUser);

      const result = await repository.create(
        createData as unknown as UserCreateInput,
      );

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: createData,
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe("update", () => {
    it("should call prisma.user.update with correct params", async () => {
      const updateData = { name: "Updated Name" };
      const mockUser = {
        id: "1",
        email: "test@example.com",
        name: "Updated Name",
      };
      prismaService.user.update.mockResolvedValue(mockUser);

      const result = await repository.update(
        { id: "1" },
        updateData as unknown as UserUpdateInput,
      );

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: updateData,
      });
      expect(result).toEqual(mockUser);
    });
  });
});
