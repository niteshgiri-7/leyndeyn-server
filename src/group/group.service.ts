import {
  BadRequestException,
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

    if (exists)
      throw new BadRequestException(
        "Group with this name and your role as admin already exists",
      );

    // Resolve participant by email if provided
    let participantId: string | null = null;

    if (data.participantEmail) {
      const participant = await this.prisma.user.findUnique({
        where: { email: data.participantEmail },
        select: { id: true },
      });

      if (!participant)
        throw new NotFoundException(
          `No user found with email: ${data.participantEmail}`,
        );

      if (participant.id === userId)
        throw new BadRequestException(
          "You cannot add yourself as a participant",
        );

      participantId = participant.id;
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
              // Only include participant entry if email was resolved
              ...(participantId
                ? [{ userId: participantId, role: GroupRole.MEMBER }]
                : []),
            ],
          },
        },
      },
    });
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
    return await this.prisma.group.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
    });
  }
}
