import { Test, TestingModule } from "@nestjs/testing";
import { FriendsService } from "./friends.service";
import { PrismaService } from "../prisma/prisma.service";
import { UserRepository } from "../repository/user.repository";
import { mockPrismaService, mockUserRepository } from "../common/testing/mocks";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { UserResponseDto } from "../common/response-dto/user-response.dto";

describe("FriendsService", () => {
  let service: FriendsService;
  let prisma: ReturnType<typeof mockPrismaService>;
  let userRepository: ReturnType<typeof mockUserRepository> & {
    validateUserExists: jest.Mock;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        {
          provide: PrismaService,
          useFactory: mockPrismaService,
        },
        {
          provide: UserRepository,
          useFactory: () => ({
            ...mockUserRepository(),
            validateUserExists: jest.fn(),
          }),
        },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
    prisma = module.get(PrismaService);
    userRepository = module.get(UserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllFriendsOfAUser", () => {
    it("returns empty array if no records found", async () => {
      prisma.friend.findMany.mockResolvedValue([]);
      const result = await service.getAllFriendsOfAUser("user-1");
      expect(result).toEqual([]);
    });

    it("returns mapped friends", async () => {
      const records = [
        { requesterId: "user-1", receiver: { id: "user-2" } },
        { receiverId: "user-1", requester: { id: "user-3" } },
      ];
      prisma.friend.findMany.mockResolvedValue(records);

      const result = await service.getAllFriendsOfAUser("user-1");
      expect(prisma.friend.findMany).toHaveBeenCalledWith({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: "user-1" }, { receiverId: "user-1" }],
        },
        include: { requester: true, receiver: true },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(UserResponseDto);
    });
  });

  describe("sendFriendRequest", () => {
    it("throws BadRequestException if requesting self", async () => {
      await expect(
        service.sendFriendRequest("user-1", "user-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("throws NotFoundException if receiver does not exist", async () => {
      userRepository.validateUserExists.mockResolvedValue(undefined);
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.sendFriendRequest("user-1", "user-2"),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException if request already exists", async () => {
      userRepository.validateUserExists.mockResolvedValue(undefined);
      prisma.user.findUnique.mockResolvedValue({ id: "user-2" });
      prisma.friend.findFirst.mockResolvedValue({ status: "PENDING" });

      await expect(
        service.sendFriendRequest("user-1", "user-2"),
      ).rejects.toThrow(BadRequestException);
    });

    it("creates friend request and returns success", async () => {
      userRepository.validateUserExists.mockResolvedValue(undefined);
      prisma.user.findUnique.mockResolvedValue({ id: "user-2" });
      prisma.friend.findFirst.mockResolvedValue(null);

      const createdRequest = {
        id: 1,
        status: "PENDING",
        requesterId: "user-1",
        receiverId: "user-2",
      };
      prisma.friend.create.mockResolvedValue(createdRequest);

      const result = await service.sendFriendRequest("user-1", "user-2");
      expect(result).toEqual({
        message: "Friend request sent successfully.",
        status: "PENDING",
      });
    });
  });

  describe("rejectFriendRequest", () => {
    it("throws NotFoundException if request not found", async () => {
      userRepository.validateUserExists.mockResolvedValue(undefined);
      prisma.friend.findFirst.mockResolvedValue(null);

      await expect(
        service.rejectFriendRequest("user-1", "user-2"),
      ).rejects.toThrow(NotFoundException);
    });

    it("deletes friend request when found", async () => {
      const mockRecord = { requesterId: "user-2", receiverId: "user-1" };
      userRepository.validateUserExists.mockResolvedValue(undefined);
      prisma.friend.findFirst.mockResolvedValue(mockRecord);
      prisma.friend.delete.mockResolvedValue(mockRecord);

      await service.rejectFriendRequest("user-1", "user-2");
      expect(prisma.friend.delete).toHaveBeenCalledWith({
        where: {
          requesterId_receiverId: mockRecord,
        },
      });
    });
  });

  describe("acceptFriendRequest", () => {
    it("throws NotFoundException if request not found", async () => {
      userRepository.validateUserExists.mockResolvedValue(undefined);
      prisma.friend.findFirst.mockResolvedValue(null);

      await expect(
        service.acceptFriendRequest("user-1", "user-2"),
      ).rejects.toThrow(NotFoundException);
    });

    it("updates friend request to ACCEPTED", async () => {
      const mockRecord = { requesterId: "user-2", receiverId: "user-1" };
      userRepository.validateUserExists.mockResolvedValue(undefined);
      prisma.friend.findFirst.mockResolvedValue(mockRecord);
      prisma.friend.update.mockResolvedValue({
        ...mockRecord,
        status: "ACCEPTED",
      });

      await service.acceptFriendRequest("user-1", "user-2");
      expect(prisma.friend.update).toHaveBeenCalledWith({
        where: { requesterId_receiverId: mockRecord },
        data: { status: "ACCEPTED" },
      });
    });
  });

  describe("getAllReceivedRequests", () => {
    it("returns mapped received requests", async () => {
      const mockRecords = [{ requester: { id: "user-2", username: "john" } }];
      prisma.friend.findMany.mockResolvedValue(mockRecords);

      const result = await service.getAllReceivedRequests("user-1", "PENDING");
      expect(result).toHaveLength(1);
      expect(prisma.friend.findMany).toHaveBeenCalledWith({
        where: { status: "PENDING", receiverId: "user-1" },
        include: { requester: true },
      });
    });
  });

  describe("cancelFriendRequest", () => {
    it("deletes friend request", async () => {
      userRepository.validateUserExists.mockResolvedValue(undefined);
      prisma.friend.delete.mockResolvedValue({
        requesterId: "user-1",
        receiverId: "user-2",
      });

      await service.cancelFriendRequest("user-1", "user-2");
      expect(prisma.friend.delete).toHaveBeenCalledWith({
        where: {
          requesterId_receiverId: {
            requesterId: "user-1",
            receiverId: "user-2",
          },
          status: "PENDING",
        },
      });
    });
  });
});
