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
    emailOrEmails: string | string[],
    currentUserId: string,
    role?: GroupRole,
  ) {
    await this.validateGroupExists(groupId);

    const emails = Array.isArray(emailOrEmails)
      ? emailOrEmails
      : [emailOrEmails];
    const uniqueEmails = [...new Set(emails)];

    const users = await Promise.all(
      uniqueEmails.map((email) =>
        this.userRepository.validateUserExists("", email),
      ),
    );

    const groupWithMembers = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    const currentMemberCount = groupWithMembers?._count?.members ?? 0;

    if (currentMemberCount === 1 && users.length === 1) {
      const user = users[0];
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
        throw new ConflictException(
          "You and this person are already friends, so a 2-person group isn't needed — you can split expenses directly from your friendship. Add another member if you'd like to turn this into a group",
        );
      }
    }

    const results: Array<
      Awaited<ReturnType<PrismaService["groupMember"]["create"]>>
    > = [];
    for (const user of users) {
      const existingMember = await this.prisma.groupMember.findFirst({
        where: {
          groupId,
          user: {
            email: user.email,
          },
        },
      });

      if (existingMember)
        throw new ConflictException(
          `User ${user.email} is already a member of the group`,
        );

      const created = await this.prisma.groupMember.create({
        data: {
          groupId,
          userId: user.id,
          role: role ?? "MEMBER",
        },
      });
      results.push(created);
    }

    return Array.isArray(emailOrEmails) ? results : results[0];
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
