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
export class ManageBudgetGuard implements CanActivate {
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
    const categoryId = request.params?.categoryId as string;

    if (!userId) {
      throw new ForbiddenException("User not authenticated");
    }

    const categoryWithAssociatedGroup = await this.prisma.category.findUnique({
      where: {
        id: categoryId,
      },
      include: {
        group: {
          select: {
            members: {
              where: {
                userId,
              },
              select: {
                role: true,
              },
            },
            allowMembersToManageCategory: true,
          },
        },
      },
    });

    if (!categoryWithAssociatedGroup)
      throw new ForbiddenException(
        "Category not found or user is not a member of the associated group",
      );

    if (categoryWithAssociatedGroup?.group?.allowMembersToManageCategory)
      return true;

    if (categoryWithAssociatedGroup?.group?.members[0]?.role !== "ADMIN")
      throw new ForbiddenException("Admin access required to manage budgets");

    return true;
  }
}
