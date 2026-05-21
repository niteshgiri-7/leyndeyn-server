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

  async validateCategoryExists(categoryId: string) {
    const category = await this.prismaService.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) throw new NotFoundException("Category not found");
  }

  async createCategory(data: CreateCategoryDto) {
    const { ownerId, name } = data;
    const exists = await this.prismaService.category.findFirst({
      where: {
        name,
        OR: [{ groupId: ownerId }, { userId: ownerId }],
      },
    });

    if (exists)
      throw new ConflictException(
        "Category with the same name already exists for the given scope",
      );

    return await this.prismaService.category.create({
      data,
    });
  }

  async updateCategory(data: CreateCategoryDto, categoryId: string) {
    await this.validateCategoryExists(categoryId);

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

  async deleteCategory(categoryId: string) {
    await this.validateCategoryExists(categoryId);

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

  async getAllCategories(ownerId: string) {
    return await this.prismaService.category.findMany({
      where: {
        OR: [{ groupId: ownerId }, { userId: ownerId }],
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
