import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { PrismaService } from "../prisma/prisma.service";
import { Category } from "../../generated/prisma/client/client";
import { CreateCategoryDto } from "./dto/create-category.dto";

// ─── Mock Factory ────────────────────────────────────────────────────────────

const makeMockCategory = (overrides: Partial<Category> = {}): Category => ({
  id: "uuid-1",
  name: "Food",
  description: "Food expenses",
  createdAt: new Date("2024-01-10"),
  updatedAt: new Date("2024-01-10"),
  userId: "user-uuid-1",
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
  expense: {
    findFirst: jest.fn(),
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

  // ─── createCategory ───────────────────────────────────────────────────────

  describe("createCategory", () => {
    const createInput: CreateCategoryDto = {
      name: "Food",
      description: "Food expenses",
      ownerId: "user-uuid-1",
    };

    it("should create and return a category", async () => {
      const expected = makeMockCategory();
      prismaMock.category.findFirst.mockResolvedValue(null);
      prismaMock.category.create.mockResolvedValue(expected);

      const result = await service.createCategory(createInput);

      expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
        where: {
          name: createInput.name,
          OR: [
            { groupId: createInput.ownerId },
            { userId: createInput.ownerId },
          ],
        },
      });
      expect(prismaMock.category.create).toHaveBeenCalledWith({
        data: createInput,
      });
      expect(result).toEqual(expected);
    });

    it("should throw ConflictException if category already exists for the owner", async () => {
      prismaMock.category.findFirst.mockResolvedValue(makeMockCategory());

      await expect(service.createCategory(createInput)).rejects.toThrow(
        ConflictException,
      );
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

      const updateData: CreateCategoryDto = {
        name: "Transport",
        description: "Transport expenses",
        ownerId: "user-uuid-1",
      };

      const result = await service.updateCategory(
        updateData,
        "category-uuid-1",
      );

      expect(prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: "category-uuid-1" },
        data: updateData,
      });
      expect(result).toEqual(updated);
    });

    it("should throw NotFoundException if category does not exist", async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCategory(
          {
            name: "Transport",
            description: "asdfasdf",
            ownerId: "user-uuid-1",
          },
          "non-existent-uuid",
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteCategory ───────────────────────────────────────────────────────

  describe("deleteCategory", () => {
    it("should delete the category", async () => {
      prismaMock.category.findUnique.mockResolvedValue(makeMockCategory());
      prismaMock.category.delete.mockResolvedValue(undefined);
      prismaMock.expense.findFirst.mockResolvedValue(null);

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
    it("should return categories by owner id", async () => {
      const categories = [makeMockCategory()];
      prismaMock.category.findFirst.mockResolvedValue(categories[0]);

      const result = await service.getAllCategories("user-uuid-1");

      expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
        where: { OR: [{ groupId: "user-uuid-1" }, { userId: "user-uuid-1" }] },
      });
      expect(result).toEqual(categories[0]);
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
