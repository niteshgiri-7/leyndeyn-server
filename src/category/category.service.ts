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
    const { ownerId: groupId, name, description } = data;
    const membership = await this.getGroupMembership(groupId, userId);

    if (!membership) throw new ForbiddenException("Not a group member");

    const group = await this.prismaService.group.findUnique({
      where: {
        id: groupId,
      },
      select: {
        allowMembersToManageCategory: true,
      },
    });

    if (!group) throw new NotFoundException("Group not found");

    if (!group.allowMembersToManageCategory && membership.role !== "ADMIN")
      throw new ForbiddenException("Admin access required");

    return await this.prismaService.category.create({
      data: {
        name,
        description,
        groupId,
      },
    });
  }

  async updateCategory(
    data: Partial<CreateCategoryDto>,
    categoryId: string,
    userId: string,
  ) {
    const category = await this.prismaService.category.findUnique({
      where: { id: categoryId },
      select: { groupId: true, userId: true },
    });

    if (!category) throw new NotFoundException("Category not found");

    if (category.groupId) {
      const membership = await this.getGroupMembership(
        category.groupId,
        userId,
      );
      if (!membership) throw new ForbiddenException("Not a group member");

      const group = await this.prismaService.group.findUnique({
        where: { id: category.groupId },
        select: { allowMembersToManageCategory: true },
      });

      if (!group) throw new NotFoundException("Group not found");

      if (!group.allowMembersToManageCategory && membership.role !== "ADMIN")
        throw new ForbiddenException("Admin access required");
    } else if (category.userId !== userId) {
      throw new ForbiddenException("Not authorized to update this category");
    }

    const { name, description } = data;

    return await this.prismaService.category.update({
      where: { id: categoryId },
      data: { name, description },
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
        include: {
          budgets: true,
          expenses: true,
          group: true,
        },
      });
    }

    const membership = await this.getGroupMembership(ownerId, userId);

    if (!membership) throw new ForbiddenException("Not a group member");

    return await this.prismaService.category.findMany({
      where: {
        groupId: ownerId,
      },
      include: {
        budgets: true,
        expenses: true,
        group: true,
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

  async getPersonalCategories(userId: string) {
    const personalCategories = await this.getAllCategories(userId, userId);
    return personalCategories;
  }

  async getAllGroupsCategories(userId: string) {
    const groupCategories = await this.prismaService.category.findMany({
      where: {
        group: {
          members: {
            some: {
              userId,
            },
          },
        },
      },
      include: {
        budgets: true,
        expenses: true,
        group: true,
      },
    });

    return groupCategories;
  }
}
