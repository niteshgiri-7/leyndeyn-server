import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCategoryDto } from "../dto/create-category.dto";

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

    const req = context
      .switchToHttp()
      .getRequest<
        Request<{ categoryId?: string }, object, CreateCategoryDto>
      >();

    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException("User not authenticated");

    const categoryId = req.params?.categoryId;
    let groupId: string | null = null;
    let allowMembersToManageCategory: boolean | null = null;

    if (categoryId) {
      const category = await this.prisma.category.findUnique({
        where: {
          id: categoryId,
        },
        select: {
          groupId: true,
          userId: true,
        },
      });

      if (!category) throw new ForbiddenException("Category not found");

      if (!category.groupId) return true;

      groupId = category.groupId;
    }

    const ownerId = req.body?.ownerId || req.query?.ownerId;

    if (!groupId) {
      if (!ownerId) throw new BadRequestException("OwnerId is required");

      const group = await this.prisma.group.findUnique({
        where: {
          id: ownerId as string,
        },
        select: {
          id: true,
          allowMembersToManageCategory: true,
        },
      });

      if (!group) {
        if (ownerId === userId) return true;

        throw new ForbiddenException("Group not found");
      }

      groupId = group.id;
      allowMembersToManageCategory = group.allowMembersToManageCategory;
    }

    if (!groupId) return true;

    const membership = await this.prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) throw new ForbiddenException("Not a group member");

    if (req.method === "GET" || canProceed) return true;

    if (allowMembersToManageCategory === null) {
      const group = await this.prisma.group.findUnique({
        where: {
          id: groupId,
        },
        select: {
          allowMembersToManageCategory: true,
        },
      });

      allowMembersToManageCategory =
        group?.allowMembersToManageCategory ?? null;
    }

    if (allowMembersToManageCategory) return true;

    if (membership.role === "ADMIN") return true;

    throw new ForbiddenException("Admin access required");
  }
}
