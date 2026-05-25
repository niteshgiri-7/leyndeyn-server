import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCategoryDto } from "./dto/create-category.dto";

@Injectable()
export class CategoryService {
  constructor(private readonly prismaService: PrismaService) {}

  private async getGroupMembership(groupId: string, userId: string) {
    return this.prismaService.groupMember.findUnique({
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
  }

  async validateCategoryExists(categoryId: string) {
    const category = await this.prismaService.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) throw new NotFoundException("Category not found");
  }

  async createPersonalCategory(data: CreateCategoryDto, userId: string) {
    if (data.ownerId !== userId)
      throw new ForbiddenException("OwnerId must match current user");

    const { ownerId, name } = data;
    const exists = await this.prismaService.category.findFirst({
      where: {
        name,
        userId: ownerId,
      },
    });

    if (exists)
      throw new ConflictException("Category with the same name already exists");

    return await this.prismaService.category.create({
      data,
    });
  }

  async createGroupCategory(data: CreateCategoryDto, userId: string) {
    const { ownerId, name } = data;
    const membership = await this.getGroupMembership(ownerId, userId);

    if (!membership) throw new ForbiddenException("Not a group member");

    const group = await this.prismaService.group.findUnique({
      where: {
        id: ownerId,
      },
      select: {
        allowMembersToManageCategory: true,
      },
    });

    if (!group) throw new ForbiddenException("Group not found");

    if (!group.allowMembersToManageCategory && membership.role !== "ADMIN")
      throw new ForbiddenException("Admin access required");

    const exists = await this.prismaService.category.findFirst({
      where: {
        name,
        groupId: ownerId,
      },
    });

    if (exists)
      throw new ConflictException("Category with the same name already exists");

    return await this.prismaService.category.create({
      data,
    });
  }

  async updateCategory(
    data: CreateCategoryDto,
    categoryId: string,
    userId: string,
  ) {
    const category = await this.prismaService.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        groupId: true,
        userId: true,
      },
    });

    if (!category) throw new NotFoundException("Category not found");

    if (category.groupId) {
      const membership = await this.getGroupMembership(
        category.groupId,
        userId,
      );

      if (!membership) throw new ForbiddenException("Not a group member");

      const group = await this.prismaService.group.findUnique({
        where: {
          id: category.groupId,
        },
        select: {
          allowMembersToManageCategory: true,
        },
      });

      if (!group) throw new ForbiddenException("Group not found");

      if (!group.allowMembersToManageCategory && membership.role !== "ADMIN")
        throw new ForbiddenException("Admin access required");
    } else if (category.userId !== userId) {
      throw new ForbiddenException("OwnerId must match current user");
    }

    const { name, ownerId } = data;

    const exists = await this.prismaService.category.findFirst({
      where: {
        id: { not: categoryId },
        name,
        OR: [{ groupId: ownerId }, { userId: ownerId }],
      },
    });

    if (exists)
      throw new ConflictException(
        "Category with the same name already exists for the given scope",
      );

    return await this.prismaService.category.update({
      where: {
        id: categoryId,
      },
      data,
    });
  }

  async deleteCategory(categoryId: string, userId: string) {
    const category = await this.prismaService.category.findUnique({
      where: {
        id: categoryId,
      },
      select: {
        groupId: true,
        userId: true,
      },
    });

    if (!category) throw new NotFoundException("Category not found");

    if (category.groupId) {
      const membership = await this.getGroupMembership(
        category.groupId,
        userId,
      );

      if (!membership) throw new ForbiddenException("Not a group member");

      const group = await this.prismaService.group.findUnique({
        where: {
          id: category.groupId,
        },
        select: {
          allowMembersToManageCategory: true,
        },
      });

      if (!group) throw new ForbiddenException("Group not found");

      if (!group.allowMembersToManageCategory && membership.role !== "ADMIN")
        throw new ForbiddenException("Admin access required");
    } else if (category.userId !== userId) {
      throw new ForbiddenException("OwnerId must match current user");
    }

    //TODO: if a category has expense then throw bad request

    const expense = await this.prismaService.expense.findFirst({
      where: {
        categoryId,
      },
    });

    if (expense)
      throw new BadRequestException(
        "Cannot delete category with associated expenses",
      );

    await this.prismaService.category.delete({
      where: {
        id: categoryId,
      },
    });
  }

  async getAllCategories(ownerId: string, userId: string) {
    if (ownerId === userId) {
      return await this.prismaService.category.findMany({
        where: {
          userId: ownerId,
        },
      });
    }

    const membership = await this.getGroupMembership(ownerId, userId);

    if (!membership) throw new ForbiddenException("Not a group member");

    return await this.prismaService.category.findMany({
      where: {
        groupId: ownerId,
      },
    });
  }

  async getCategoryById(categoryId: string, userId: string) {
    const category = await this.prismaService.category.findFirst({
      where: {
        id: categoryId,

        OR: [
          { userId },

          {
            group: {
              members: {
                some: {
                  userId,
                },
              },
            },
          },
        ],
      },

      include: {
        budgets: true,
      },
    });

    if (!category)
      throw new ForbiddenException(
        "You don't have access to this category or it doesn't exist",
      );

    return category;
  }
}
