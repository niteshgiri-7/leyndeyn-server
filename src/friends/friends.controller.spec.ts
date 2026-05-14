import { Test, TestingModule } from "@nestjs/testing";
import { FriendsController } from "./friends.controller";
import { FriendsService } from "./friends.service";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "../auth/jwt-payload.type";
import { Status } from "../../generated/prisma/client/enums";

describe("FriendsController", () => {
  let controller: FriendsController;
  let service: {
    getAllFriendsOfAUser: jest.Mock;
    getAllReceivedRequests: jest.Mock;
    sendFriendRequest: jest.Mock;
    acceptFriendRequest: jest.Mock;
    rejectFriendRequest: jest.Mock;
    cancelFriendRequest: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getAllFriendsOfAUser: jest.fn(),
      getAllReceivedRequests: jest.fn(),
      sendFriendRequest: jest.fn(),
      acceptFriendRequest: jest.fn(),
      rejectFriendRequest: jest.fn(),
      cancelFriendRequest: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendsController],
      providers: [
        {
          provide: FriendsService,
          useValue: service,
        },
        {
          provide: JwtService,
          useValue: { verify: jest.fn(), sign: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<FriendsController>(FriendsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getAllFriendsOfAUser", () => {
    it("returns result from service.getAllFriendsOfAUser", async () => {
      const mockResult = [{ id: "user-2" }];
      service.getAllFriendsOfAUser.mockResolvedValue(mockResult);

      const result = await controller.getAllFriends({
        id: "user-1",
      } as JwtPayload);
      expect(result).toEqual(mockResult);
      expect(service.getAllFriendsOfAUser).toHaveBeenCalledWith("user-1");
    });
  });

  describe("getFriendRequests", () => {
    it("returns result from service.getAllReceivedRequests", async () => {
      const mockResult = [{ id: "user-2" }];
      service.getAllReceivedRequests.mockResolvedValue(mockResult);

      const result = await controller.getFriendRequests(
        { id: "user-1" } as JwtPayload,
        Status.PENDING,
      );
      expect(result).toEqual(mockResult);
      expect(service.getAllReceivedRequests).toHaveBeenCalledWith(
        "user-1",
        Status.PENDING,
      );
    });
  });

  describe("sendFriendRequest", () => {
    it("returns result from service.sendFriendRequest", async () => {
      const mockResult = { message: "Success" };
      service.sendFriendRequest.mockResolvedValue(mockResult);

      const result = await controller.sendFriendRequest(
        { id: "user-1" } as JwtPayload,
        "user-2",
      );
      expect(result).toEqual(mockResult);
      expect(service.sendFriendRequest).toHaveBeenCalledWith(
        "user-1",
        "user-2",
      );
    });
  });

  describe("acceptFriendRequest", () => {
    it("returns result from service.acceptFriendRequest", async () => {
      service.acceptFriendRequest.mockResolvedValue("Accepted");

      const result = await controller.acceptFriendRequest(
        { id: "user-1" } as JwtPayload,
        "user-2",
      );
      expect(result).toEqual("Accepted");
      expect(service.acceptFriendRequest).toHaveBeenCalledWith(
        "user-1",
        "user-2",
      );
    });
  });

  describe("rejectFriendRequest", () => {
    it("returns result from service.rejectFriendRequest", async () => {
      service.rejectFriendRequest.mockResolvedValue("Rejected");

      const result = await controller.rejectFriendRequest(
        { id: "user-1" } as JwtPayload,
        "user-2",
      );
      expect(result).toEqual("Rejected");
      expect(service.rejectFriendRequest).toHaveBeenCalledWith(
        "user-1",
        "user-2",
      );
    });
  });

  describe("cancelFriendRequest", () => {
    it("returns result from service.rejectFriendRequest", async () => {
      service.rejectFriendRequest.mockResolvedValue(undefined);

      const result = await controller.cancelFriendRequest(
        { id: "user-1" } as JwtPayload,
        "user-2",
      );
      expect(result).toBeUndefined();
      expect(service.rejectFriendRequest).toHaveBeenCalledWith(
        "user-1",
        "user-2",
      );
    });
  });
});
