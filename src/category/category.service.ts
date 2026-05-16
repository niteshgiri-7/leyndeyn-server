import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CategoryCreateInput,
  CategoryUpdateInput,
} from "../../generated/prisma/client/models";

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

  buildOwnerFilter(scope: string = "PERSONAL", ownerId: string) {
    if (!ownerId)
      throw new BadRequestException("Category scope id is required");

    return scope === "PERSONAL"
      ? { userId: ownerId }
      : scope === "FRIENDSHIP"
        ? { friendShipId: ownerId }
        : { groupId: ownerId };
  }

  async createCategory(data: CategoryCreateInput, ownerId: string) {
    const { name, scope } = data;
    if (!ownerId)
      throw new BadRequestException(
        "Category scope id is required to create a category",
      );

    const ownerFilter = this.buildOwnerFilter(scope, ownerId);

    const categoryExists = await this.prismaService.category.findFirst({
      where: {
        name,
        scope,
        ...ownerFilter,
      },
    });

    if (categoryExists)
      throw new ConflictException(
        "Category with the same name and scope already exists for the owner",
      );

    return await this.prismaService.category.create({
      data,
    });
  }

  async updateCategory(data: CategoryUpdateInput, categoryId: string) {
    await this.validateCategoryExists(categoryId);

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

    await this.prismaService.category.delete({
      where: {
        id: categoryId,
      },
    });
  }

  async getAllCategories(scope: string, ownerId: string) {
    const ownerFilter = this.buildOwnerFilter(scope, ownerId);
    const categoriesByScope = await this.prismaService.category.findMany({
      where: {
        ...ownerFilter,
      },
    });
    return categoriesByScope;
  }

  async getCategoryById(categoryId: string) {
    return await this.prismaService.category.findUnique({
      where: {
        id: categoryId,
      },
    });
  }
}
