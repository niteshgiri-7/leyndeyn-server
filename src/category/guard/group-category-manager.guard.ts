import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCategoryDto } from "../dto/create-category.dto";
import { Reflector } from "@nestjs/core";

@Injectable()
export class GroupCategoryManagerGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canProceed = this.reflector.get<boolean>(
      "allow_non_admin",
      context.getHandler(),
    );

    if (canProceed) return true;

    const req = context
      .switchToHttp()
      .getRequest<Request<object, object, CreateCategoryDto>>();

    const userId = req.user?.id;

    const ownerId = req.body?.ownerId || req.query?.ownerId;

    const group = await this.prisma.group.findUnique({
      where: {
        id: ownerId as string,
      },
    });

    if (!group) throw new ForbiddenException("Group not found");

    if (group?.allowMembersToManageCategory) return true;

    const isGroupAdmin = await this.prisma.groupMember.findFirst({
      where: {
        userId,
        groupId: ownerId as string,
        role: "ADMIN",
      },
    });

    if (isGroupAdmin) return true;

    throw new ForbiddenException("Admin access required");
  }
}
