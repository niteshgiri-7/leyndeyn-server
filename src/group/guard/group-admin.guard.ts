import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Request } from "express";
import { Reflector } from "@nestjs/core";

@Injectable()
export class GroupAdminGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(
      "allow_non_admin",
      context.getHandler(),
    );

    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();

    const userId = request.user?.id;
    const groupId = request.params?.groupId[0]; // Extract groupId from route parameters

    if (!userId) {
      throw new ForbiddenException("User not authenticated");
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException("Not a group member");
    }

    const group = await this.prisma.group.findUnique({
      where: {
        id: groupId,
      },
      select: {
        allowMembersToInvite: true,
      },
    });

    if (group?.allowMembersToInvite) return true;

    if (membership.role !== "ADMIN") {
      throw new ForbiddenException("Admin access required");
    }

    return true;
  }
}
