import { Test, TestingModule } from "@nestjs/testing";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CategoryScope } from "../../generated/prisma/client/enums";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import { CategoryCreationGuard } from "./guard/create-category.guard";
import { Category } from "../../generated/prisma/client/client";

// ─── Mock Factory ─────────────────────────────────────────────────────────────

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

// ─── Service Mock ─────────────────────────────────────────────────────────────

const categoryServiceMock = {
  getAllCategories: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  getCategoryById: jest.fn(),
};

// ─── Guard Mocks (bypass in unit tests) ──────────────────────────────────────

const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe("CategoryController", () => {
  let controller: CategoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: CategoryService, useValue: categoryServiceMock }],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockGuard)
      .overrideGuard(CategoryCreationGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<CategoryController>(CategoryController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getAllCategories ───────────────────────────────────────────────────────

  describe("getAllCategories", () => {
    it("should return all categories for given scope and ownerId", async () => {
      const categories = [makeMockCategory()];
      categoryServiceMock.getAllCategories.mockResolvedValue(categories);

      const result = await controller.getAllCategories(
        CategoryScope.PERSONAL,
        "user-uuid-1",
      );

      expect(categoryServiceMock.getAllCategories).toHaveBeenCalledWith(
        CategoryScope.PERSONAL,
        "user-uuid-1",
      );
      expect(result).toEqual(categories);
    });

    it("should return categories for FRIENDSHIP scope", async () => {
      const categories = [
        makeMockCategory({
          scope: CategoryScope.FRIENDSHIP,
          friendShipId: "friendship-uuid-1",
          userId: null,
        }),
      ];
      categoryServiceMock.getAllCategories.mockResolvedValue(categories);

      const result = await controller.getAllCategories(
        CategoryScope.FRIENDSHIP,
        "friendship-uuid-1",
      );

      expect(categoryServiceMock.getAllCategories).toHaveBeenCalledWith(
        CategoryScope.FRIENDSHIP,
        "friendship-uuid-1",
      );
      expect(result).toEqual(categories);
    });

    it("should return categories for GROUP scope", async () => {
      const categories = [
        makeMockCategory({
          scope: CategoryScope.GROUP,
          groupId: "group-uuid-1",
          userId: null,
        }),
      ];
      categoryServiceMock.getAllCategories.mockResolvedValue(categories);

      const result = await controller.getAllCategories(
        CategoryScope.GROUP,
        "group-uuid-1",
      );

      expect(categoryServiceMock.getAllCategories).toHaveBeenCalledWith(
        CategoryScope.GROUP,
        "group-uuid-1",
      );
      expect(result).toEqual(categories);
    });
  });

  // ─── createCategory ────────────────────────────────────────────────────────

  describe("createCategory", () => {
    it("should create and return a category", async () => {
      const dto: CreateCategoryDto = {
        name: "Food",
        description: "Food expenses",
        scope: CategoryScope.PERSONAL,
        ownerId: "user-uuid-1",
      };
      const created = makeMockCategory();
      categoryServiceMock.createCategory.mockResolvedValue(created);

      const result = await controller.createCategory(dto);

      expect(categoryServiceMock.createCategory).toHaveBeenCalledWith(
        dto,
        dto.ownerId,
      );
      expect(result).toEqual(created);
    });

    it("should pass ownerId from dto to service", async () => {
      const dto: CreateCategoryDto = {
        name: "Transport",
        description: "Transport expenses",
        scope: CategoryScope.GROUP,
        ownerId: "group-uuid-1",
      };
      categoryServiceMock.createCategory.mockResolvedValue(
        makeMockCategory({ name: "Transport", scope: CategoryScope.GROUP }),
      );

      await controller.createCategory(dto);

      expect(categoryServiceMock.createCategory).toHaveBeenCalledWith(
        dto,
        "group-uuid-1",
      );
    });
  });

  // ─── updateCategory ────────────────────────────────────────────────────────

  describe("updateCategory", () => {
    it("should update and return the category", async () => {
      const dto: Partial<CreateCategoryDto> = { name: "Transport" };
      const updated = makeMockCategory({ name: "Transport" });
      categoryServiceMock.updateCategory.mockResolvedValue(updated);

      const result = await controller.updateCategory("uuid-1", dto);

      expect(categoryServiceMock.updateCategory).toHaveBeenCalledWith(
        dto,
        "uuid-1",
      );
      expect(result).toEqual(updated);
    });

    it("should forward the categoryId correctly", async () => {
      const dto: Partial<CreateCategoryDto> = { description: "Updated desc" };
      categoryServiceMock.updateCategory.mockResolvedValue(makeMockCategory());

      await controller.updateCategory("uuid-99", dto);

      expect(categoryServiceMock.updateCategory).toHaveBeenCalledWith(
        dto,
        "uuid-99",
      );
    });
  });

  // ─── deleteCategory ────────────────────────────────────────────────────────

  describe("deleteCategory", () => {
    it("should call deleteCategory with the correct categoryId", async () => {
      categoryServiceMock.deleteCategory.mockResolvedValue(undefined);

      await controller.deleteCategory("uuid-1");

      expect(categoryServiceMock.deleteCategory).toHaveBeenCalledWith("uuid-1");
    });

    it("should propagate errors from service", async () => {
      categoryServiceMock.deleteCategory.mockRejectedValue(
        new Error("Delete failed"),
      );

      await expect(controller.deleteCategory("uuid-1")).rejects.toThrow(
        "Delete failed",
      );
    });
  });

  // ─── getCategory ───────────────────────────────────────────────────────────

  describe("getCategory", () => {
    it("should return a category by id", async () => {
      const category = makeMockCategory();
      categoryServiceMock.getCategoryById.mockResolvedValue(category);

      const result = await controller.getCategory("uuid-1");

      expect(categoryServiceMock.getCategoryById).toHaveBeenCalledWith(
        "uuid-1",
      );
      expect(result).toEqual(category);
    });

    it("should return null if category does not exist", async () => {
      categoryServiceMock.getCategoryById.mockResolvedValue(null);

      const result = await controller.getCategory("non-existent-uuid");

      expect(result).toBeNull();
    });
  });
});
