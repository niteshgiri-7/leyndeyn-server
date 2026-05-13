import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Status } from "../../generated/prisma/client/enums";
import { UserResponseDto } from "../common/response-dto/user-response.dto";
import { PrismaService } from "../prisma/prisma.service";
import { FriendGetPayload } from "../../generated/prisma/client/models";
import { UserRepository } from "../repository/user.repository";

type FriendRecord = FriendGetPayload<{
  include: {
    requester: true;
    receiver: true;
  };
}>;

@Injectable()
export class FriendsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userRepository: UserRepository,
  ) {}

  async getAllFriendsOfAUser(userId: string) {
    const records = await this.prismaService.friend.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      include: {
        requester: true,
        receiver: true,
      },
    });
    if (!records || !records.length)
      throw new NotFoundException("You don't have any friends yet.");

    const friends = this.extractFriendsFromRecord(records, userId);

    return friends.map((friend) => new UserResponseDto(friend));
  }

  async sendFriendRequest(requesterId: string, receiverId: string) {
    await this.userRepository.validateUserExists(receiverId);

    const receiver = await this.prismaService.user.findUnique({
      where: {
        id: receiverId,
      },
    });

    if (!receiver)
      throw new NotFoundException(
        "The user you are trying to send a friend request to does not exist.",
      );

    const existingRecord = await this.prismaService.friend.findFirst({
      where: {
        OR: [
          {
            receiverId,
            requesterId,
          },
        ],
      },
    });

    if (existingRecord)
      throw new BadRequestException(
        "Friend request already exists or you are already friends with this user.",
      );

    const newFriendRequest = await this.prismaService.friend.create({
      data: {
        receiverId,
        requesterId,
        status: "PENDING",
      },
    });

    return {
      message: "Friend request sent successfully.",
      status: newFriendRequest.status,
    };
  }

  async rejectFriendRequest(userId: string, friendId: string) {
    await this.userRepository.validateUserExists(friendId);

    const existingRecord = await this.prismaService.friend.findFirst({
      where: {
        OR: [
          {
            receiverId: userId,
            requesterId: friendId,
          },
          {
            receiverId: friendId,
            requesterId: userId,
          },
        ],
      },
    });

    if (!existingRecord)
      throw new NotFoundException("Friend request not found.");

    return await this.prismaService.friend.delete({
      where: {
        requesterId_receiverId: {
          requesterId: existingRecord.requesterId,
          receiverId: existingRecord.receiverId,
        },
      },
    });
  }

  async acceptFriendRequest(userId: string, friendId: string) {
    await this.userRepository.validateUserExists(friendId);

    const existingRecord = await this.prismaService.friend.findFirst({
      where: {
        OR: [
          {
            receiverId: userId,
            requesterId: friendId,
          },
          {
            receiverId: friendId,
            requesterId: userId,
          },
        ],
      },
    });

    if (!existingRecord)
      throw new NotFoundException("Friend request not found.");

    return await this.prismaService.friend.update({
      where: {
        requesterId_receiverId: {
          requesterId: existingRecord.requesterId,
          receiverId: existingRecord.receiverId,
        },
      },
      data: {
        status: "ACCEPTED",
      },
    });
  }

  async getAllReceivedRequests(receiverId: string, status?: Status) {
    const friendRequestsReceived = await this.prismaService.friend.findMany({
      where: {
        status,
        receiverId,
      },
      include: {
        requester: true,
      },
    });

    return friendRequestsReceived.map(
      (request) => new UserResponseDto(request.requester),
    );
  }

  //removes the current user from the records and returns just the friends
  extractFriendsFromRecord(records: FriendRecord[], currentUserId: string) {
    const friends = records.map((record) => {
      if (record.requesterId === currentUserId) return record.receiver;
      else return record.requester;
    });
    return friends;
  }
}
