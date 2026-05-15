import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  GroupCreateInput,
  GroupUpdateInput,
} from "../../generated/prisma/client/models";

@Injectable()
export class GroupService {
  constructor(private readonly prisma: PrismaService) {}

  async createGroup(userId: string, data: GroupCreateInput) {
    const group = await this.prisma.group.create({
      data: {
        ...data,
        members: {
          create: {
            user: {
              connect: {
                id: userId,
              },
            },
            role: "ADMIN",
          },
        },
      },
    });
    return group;
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
    const group = await this.findGroupById(id);
    if (!group) throw new NotFoundException("Group not found");
    return await this.prisma.group.update({
      where: {
        id,
      },
      data,
    });
  }

  async deleteGroupById(id: string) {
    const group = await this.findGroupById(id);
    if (!group) throw new NotFoundException("Group not found");

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
}
