import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserRepository } from "../repository/user.repository";
import { GroupRole } from "../../generated/prisma/client/enums";

@Injectable()
export class GroupMemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
  ) {}

  async addMemberToGroup(
    groupId: string,
    email: string,
    currentUserId: string,
    role?: GroupRole,
  ) {
    await this.validateGroupExists(groupId);
    const user = await this.userRepository.validateUserExists("", email); //finding user by email

    const existingMember = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        user: {
          email,
        },
      },
    });

    if (existingMember)
      throw new ConflictException("User is already a member of the group");

    const groupWithMembers = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (groupWithMembers?._count?.members === 1) {
      const existingFriendGroup = await this.prisma.group.findFirst({
        where: {
          members: {
            every: {
              userId: {
                in: [currentUserId, user.id],
              },
            },
          },
        },
        include: {
          _count: {
            select: { members: true },
          },
        },
      });

      if (existingFriendGroup?._count?.members === 2) {
        throw new ConflictException("Friend group already exists");
      }
    }

    return await this.prisma.groupMember.create({
      data: {
        groupId,
        userId: user.id,
        role: role ?? "MEMBER",
      },
    });
  }

  async removeMemberFromGroup(groupId: string, userId: string) {
    await this.validateGroupExists(groupId);

    const user = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
        role: "ADMIN",
      },
      select: {
        role: true,
      },
    });

    if (user?.role === "ADMIN")
      throw new ConflictException("Cannot remove an admin from the group");

    await this.prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });
  }

  async getAllGroupMembers(groupId: string) {
    await this.validateGroupExists(groupId);

    return await this.prisma.groupMember.findMany({
      where: {
        groupId,
      },
      include: {
        user: {
          omit: {
            passwordHash: true,
            createdAt: true,
            updatedAt: true,
            isVerified: true,
          },
        },
      },
    });
  }

  async changeMemberRole(
    groupId: string,
    memberId: string,
    role: GroupRole,
    currentUserId: string,
  ) {
    await this.validateGroupExists(groupId);

    const member = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: memberId,
        },
      },
    });

    if (!member) throw new NotFoundException("Member not found in the group");

    if (memberId === currentUserId)
      throw new ConflictException("Cannot change your own role");

    return await this.prisma.groupMember.update({
      where: {
        groupId_userId: { groupId, userId: memberId },
      },
      data: { role },
    });
  }

  async validateGroupExists(groupId: string) {
    const group = await this.prisma.group.findUnique({
      where: {
        id: groupId,
      },
    });

    if (!group) throw new NotFoundException("Group not found");
  }
}
