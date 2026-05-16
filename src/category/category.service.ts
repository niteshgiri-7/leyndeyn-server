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

  buildOwnerFilter(scope: string = "PERSONAL", ownerId: string) {
    if (!ownerId)
      throw new BadRequestException("Category scope id is required");

    return scope === "PERSONAL"
      ? { userId: ownerId }
      : scope === "FRIENDSHIP"
        ? { friendShipId: ownerId }
        : { groupId: ownerId };
  }

  async createCategory(data: CreateCategoryDto, ownerId: string) {
    const { name, scope } = data;
    if (!ownerId && scope !== "PERSONAL")
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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ownerId: _, ...rest } = data;

    const scopeFilter = this.buildOwnerFilter(scope, ownerId);

    const dataToCreate = { ...rest, ...scopeFilter };

    return await this.prismaService.category.create({
      data: dataToCreate,
    });
  }

  async updateCategory(data: Partial<CreateCategoryDto>, categoryId: string) {
    await this.validateCategoryExists(categoryId);

    const { ownerId, ...rest } = data;

    const ownerFilter = this.buildOwnerFilter(data?.scope, ownerId!);

    const category = await this.prismaService.category.findFirst({
      where: {
        name: data?.name,
        scope: data?.scope,
        ...ownerFilter,
      },
    });
    if (
      category?.name === data?.name &&
      category?.scope === data?.scope &&
      category?.id === categoryId
    )
      throw new ConflictException(
        "Category with the same name and scope already exists for the owner",
      );

    const categoryToUpdate = { ...rest, ...ownerFilter };

    return await this.prismaService.category.update({
      where: {
        id: categoryId,
      },
      data: categoryToUpdate,
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

  async getCategoryById(categoryId: string, userId: string) {
    const category = await this.prismaService.category.findFirst({
      where: {
        id: categoryId,

        OR: [
          { userId },

          {
            friendShip: {
              OR: [{ receiverId: userId }, { requesterId: userId }],
            },
          },

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
