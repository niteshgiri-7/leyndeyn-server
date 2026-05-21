import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

export type ResourceType = "group" | "expense";

export const RESOURCE_KEY = "resource";

@Injectable()
export class ManageExpenseGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resource = this.reflector.get<ResourceType>(
      RESOURCE_KEY,
      context.getHandler(),
    );

    const request = context.switchToHttp().getRequest<Request>();

    const userId = request.user?.id;

    const expenseId = request.params?.expenseId as string;
    const groupId = request.params?.groupId as string;

    if (!userId) throw new ForbiddenException("User is not authenticated");

    switch (resource) {
      case "group": {
        if (!groupId) throw new ForbiddenException("Group ID is missing");
        return await this.checkGroupMemberShip(userId, groupId);
      }
      case "expense": {
        if (!expenseId) throw new ForbiddenException("Expense ID is missing");
        return await this.checkExpenseOwnerShip(userId, expenseId);
      }
      default: {
        return true;
      }
    }
  }

  private async checkGroupMemberShip(
    userId: string,
    groupId: string,
  ): Promise<boolean> {
    const member = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
      },
    });

    if (!member)
      throw new ForbiddenException("User is not a member of the group");

    return true;
  }

  private async checkExpenseOwnerShip(
    userId: string,
    expenseId: string,
  ): Promise<boolean> {
    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        spentById: userId,
      },
    });
    if (!expense)
      throw new ForbiddenException("User is not the owner of the expense");

    return true;
  }
}
