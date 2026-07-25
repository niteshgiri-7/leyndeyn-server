import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { GroupRole } from "../../generated/prisma/client/enums";
import { GroupUpdateInput } from "../../generated/prisma/client/models";
import { PrismaService } from "../prisma/prisma.service";
import { CreateGroupDto } from "./dto/create-group.dto";

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) {}

  async validateGroupExists(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: {
        id: groupId,
      },
    });
    if (!group) throw new NotFoundException("Group not found");
  }
  generateRandomInvitationCode(length: number = 8): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createGroup(userId: string, data: CreateGroupDto) {
    const exists = await this.prisma.group.findFirst({
      where: {
        name: data.name,
        members: {
          some: {
            userId,
            role: GroupRole.ADMIN,
          },
        },
      },
    });
    // FIXME:fix this, check the group name and created by userId instead, because a user can be admin of multiple groups with the same name created by different users.
    if (exists)
      throw new BadRequestException(
        "Group with this name and your role as admin already exists",
      );

    const invitedUserIds = data.userIds ?? [];
    const uniqueUserIds = [...new Set(invitedUserIds)];

    if (uniqueUserIds.includes(userId)) {
      throw new BadRequestException("You cannot add yourself as a participant");
    }

    const resolvedUserIds: string[] = [];

    for (const invitedUserId of uniqueUserIds) {
      const participant = await this.prisma.user.findUnique({
        where: { id: invitedUserId },
        select: { id: true },
      });

      if (!participant) {
        throw new NotFoundException(`No user found with id: ${invitedUserId}`);
      }

      resolvedUserIds.push(participant.id);
    }

    const invitationCode = this.generateRandomInvitationCode();

    return this.prisma.group.create({
      data: {
        name: data.name,
        description: data.description,
        allowMembersToInvite: data.allowMembersToInvite,
        allowMembersToManageCategory: data.allowMembersToManageCategory,
        invitationCode,
        members: {
          createMany: {
            data: [
              { userId, role: GroupRole.ADMIN },
              ...resolvedUserIds.map((memberUserId) => ({
                userId: memberUserId,
                role: GroupRole.MEMBER,
              })),
            ],
          },
        },
      },
    });
  }

  async createFriendGroup(userId: string, friendEmail: string) {
    const friend = await this.prisma.user.findUnique({
      where: { email: friendEmail },
      select: { id: true },
    });

    if (!friend)
      throw new NotFoundException(`No user found with email: ${friendEmail}`);

    if (friend.id === userId)
      throw new BadRequestException("You cannot add yourself as a friend");

    const existingFriendGroup = await this.prisma.group.findFirst({
      where: {
        name: "",
        members: {
          every: {
            userId: {
              in: [userId, friend.id],
            },
          },
        },
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (existingFriendGroup?._count?.members === 2) {
      throw new ConflictException("Friend group already exists");
    }

    const invitationCode = this.generateRandomInvitationCode();

    return this.prisma.group.create({
      data: {
        name: "",
        invitationCode,
        members: {
          createMany: {
            data: [
              { userId, role: GroupRole.ADMIN },
              { userId: friend.id, role: GroupRole.ADMIN },
            ],
          },
        },
      },
    });
  }

  async getAllFriendGroups(userId: string) {
    const groups = await this.prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return groups
      .filter((group) => group.members.length === 2)
      .map((group) => ({
        ...group,
        members: group.members.filter((member) => member.userId !== userId),
      }));
  }

  async findGroupById(id: string) {
    const group = await this.prisma.group.findUnique({
      where: {
        id,
      },
    });
    if (!group) throw new NotFoundException("Group not found");
    return group;
  }

  async updateGroupById(id: string, data: GroupUpdateInput) {
    await this.validateGroupExists(id);

    return await this.prisma.group.update({
      where: {
        id,
      },
      data,
    });
  }

  async deleteGroupById(id: string) {
    await this.validateGroupExists(id);

    const groupWithMembers = await this.prisma.group.findFirst({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    const memberCount = groupWithMembers?._count?.members ?? 0;

    if (memberCount > 1)
      throw new BadRequestException(
        "Cannot delete group with more than 1 member. Please remove members before deleting the group.",
      );

    return await this.prisma.group.delete({
      where: {
        id,
      },
    });
  }

  async getAllGroupsForUser(userId: string) {
    const groups = await this.prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        members: true,
      },
    });
    return groups.filter((group) => group.members.length !== 2); // Filter out friend groups (groups with exactly 2 members)
  }

  async joinGroupViaInvitationCode(invitationCode: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: {
        invitationCode,
      },
    });

    if (!group) throw new NotFoundException("Invalid invitation code");

    const existingMember = await this.prisma.groupMember.findFirst({
      where: {
        groupId: group.id,
        userId,
      },
    });

    if (existingMember)
      throw new ConflictException("You are already a member of this group");

    return await this.prisma.groupMember.create({
      data: {
        groupId: group.id,
        userId,
        role: GroupRole.MEMBER,
      },
    });
  }
}
