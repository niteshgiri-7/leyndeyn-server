import { Test, TestingModule } from "@nestjs/testing";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { CategoryService } from "./category.service";
import { PrismaService } from "../prisma/prisma.service";
import { CategoryScope } from "../../generated/prisma/client/enums";
import { Category } from "../../generated/prisma/client/client";
import { CreateCategoryDto } from "./dto/create-category.dto";

// ─── Mock Factory ────────────────────────────────────────────────────────────

const makeMockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: "uuid-1",
  name: "Food",
  description: "Food expenses",
  scope: CategoryScope.PERSONAL,
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
  userId: "user-uuid-1",
  friendShipId: null,
  groupId: null,
  ...overrides,
});

// ─── Prisma Mock ─────────────────────────────────────────────────────────────

const prismaMock = {
  category: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe("CategoryService", () => {
  let service: CategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── validateCategoryExists ────────────────────────────────────────────────

  describe("validateCategoryExists", () => {
    it("should not throw if category exists", async () => {
      prismaMock.category.findUnique.mockResolvedValue(makeMockCategory());

      await expect(
        service.validateCategoryExists("uuid-1"),
      ).resolves.not.toThrow();
    });

    it("should throw NotFoundException if category does not exist", async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(
        service.validateCategoryExists("non-existent-uuid"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── buildOwnerFilter ─────────────────────────────────────────────────────

  describe("buildOwnerFilter", () => {
    it("should return userId filter for PERSONAL scope", () => {
      const filter = service.buildOwnerFilter(
        CategoryScope.PERSONAL,
        "user-uuid-1",
      );
      expect(filter).toEqual({ userId: "user-uuid-1" });
    });

    it("should return friendShipId filter for FRIENDSHIP scope", () => {
      const filter = service.buildOwnerFilter(
        CategoryScope.FRIENDSHIP,
        "friendship-uuid-1",
      );
      expect(filter).toEqual({ friendShipId: "friendship-uuid-1" });
    });

    it("should return groupId filter for GROUP scope", () => {
      const filter = service.buildOwnerFilter(
        CategoryScope.GROUP,
        "group-uuid-1",
      );
      expect(filter).toEqual({ groupId: "group-uuid-1" });
    });

    it("should throw BadRequestException if ownerId is not provided", () => {
      expect(() =>
        service.buildOwnerFilter(CategoryScope.PERSONAL, ""),
      ).toThrow(BadRequestException);
    });
  });

  // ─── createCategory ───────────────────────────────────────────────────────

  describe("createCategory", () => {
    const createInput = {
      name: "Food",
      description: "Food expenses",
      scope: CategoryScope.PERSONAL,
      ownerId: "user-uuid-1",
    } as unknown as CreateCategoryDto;

    it("should create and return a category", async () => {
      const expected = makeMockCategory();
      prismaMock.category.findFirst.mockResolvedValue(null);
      prismaMock.category.create.mockResolvedValue(expected);

      const result = await service.createCategory(createInput, "user-uuid-1");

      expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
        where: {
          name: createInput.name,
          scope: createInput.scope,
          userId: createInput.ownerId,
        },
      });
      const expectedCreateData = {
        name: createInput.name,
        description: createInput.description,
        scope: createInput.scope,
        userId: createInput.ownerId,
      };

      expect(prismaMock.category.create).toHaveBeenCalledWith({
        data: expectedCreateData,
      });
      expect(result).toEqual(expected);
    });

    it("should throw BadRequestException if ownerId is not provided", async () => {
      await expect(service.createCategory(createInput, "")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw ConflictException if category already exists for the owner", async () => {
      prismaMock.category.findFirst.mockResolvedValue(makeMockCategory());

      await expect(
        service.createCategory(createInput, "user-uuid-1"),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── updateCategory ───────────────────────────────────────────────────────

  describe("updateCategory", () => {
    it("should update and return the category", async () => {
      const updated = makeMockCategory({ name: "Transport" });
      prismaMock.category.findUnique.mockResolvedValue(makeMockCategory());
      // ensure no conflicting category found
      prismaMock.category.findFirst.mockResolvedValue(null);
      prismaMock.category.update.mockResolvedValue(updated);

      const updateData = {
        name: "Transport",
        scope: CategoryScope.PERSONAL,
        ownerId: "user-uuid-1",
      };

      const result = await service.updateCategory(updateData, "uuid-1");

      expect(prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: "uuid-1" },
        data: {
          name: "Transport",
          scope: CategoryScope.PERSONAL,
          userId: "user-uuid-1",
        },
      });
      expect(result).toEqual(updated);
    });

    it("should throw NotFoundException if category does not exist", async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCategory({ name: "Transport" }, "non-existent-uuid"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteCategory ───────────────────────────────────────────────────────

  describe("deleteCategory", () => {
    it("should delete the category", async () => {
      prismaMock.category.findUnique.mockResolvedValue(makeMockCategory());
      prismaMock.category.delete.mockResolvedValue(undefined);

      await expect(service.deleteCategory("uuid-1")).resolves.not.toThrow();

      expect(prismaMock.category.delete).toHaveBeenCalledWith({
        where: { id: "uuid-1" },
      });
    });

    it("should throw NotFoundException if category does not exist", async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.deleteCategory("non-existent-uuid")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── getAllCategories ─────────────────────────────────────────────────────

  describe("getAllCategories", () => {
    it("should return all categories for PERSONAL scope", async () => {
      const categories = [makeMockCategory()];
      prismaMock.category.findMany.mockResolvedValue(categories);

      const result = await service.getAllCategories(
        CategoryScope.PERSONAL,
        "user-uuid-1",
      );

      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        where: { userId: "user-uuid-1" },
      });
      expect(result).toEqual(categories);
    });

    it("should return all categories for FRIENDSHIP scope", async () => {
      const categories = [
        makeMockCategory({
          scope: CategoryScope.FRIENDSHIP,
          friendShipId: "friendship-uuid-1",
          userId: null,
        }),
      ];
      prismaMock.category.findMany.mockResolvedValue(categories);

      const result = await service.getAllCategories(
        CategoryScope.FRIENDSHIP,
        "friendship-uuid-1",
      );

      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        where: { friendShipId: "friendship-uuid-1" },
      });
      expect(result).toEqual(categories);
    });

    it("should return all categories for GROUP scope", async () => {
      const categories = [
        makeMockCategory({
          scope: CategoryScope.GROUP,
          groupId: "group-uuid-1",
          userId: null,
        }),
      ];
      prismaMock.category.findMany.mockResolvedValue(categories);

      const result = await service.getAllCategories(
        CategoryScope.GROUP,
        "group-uuid-1",
      );

      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        where: { groupId: "group-uuid-1" },
      });
      expect(result).toEqual(categories);
    });

    it("should throw BadRequestException if ownerId is missing", async () => {
      await expect(
        service.getAllCategories(CategoryScope.PERSONAL, ""),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getCategoryById ──────────────────────────────────────────────────────

  describe("getCategoryById", () => {
    it("should return a category by id", async () => {
      const category = makeMockCategory();
      prismaMock.category.findFirst.mockResolvedValue(category);

      const result = await service.getCategoryById("uuid-1", "user-uuid-1");

      expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
        where: {
          id: "uuid-1",
          OR: [
            { userId: "user-uuid-1" },
            {
              friendShip: {
                OR: [
                  { receiverId: "user-uuid-1" },
                  { requesterId: "user-uuid-1" },
                ],
              },
            },
            {
              group: {
                members: {
                  some: { userId: "user-uuid-1" },
                },
              },
            },
          ],
        },
        include: { budgets: true },
      });
      expect(result).toEqual(category);
    });

    it("should throw ForbiddenException if category does not exist or access denied", async () => {
      prismaMock.category.findFirst.mockResolvedValue(null);

      await expect(
        service.getCategoryById("non-existent-uuid", "user-uuid-1"),
      ).rejects.toThrow();
    });
  });
});
