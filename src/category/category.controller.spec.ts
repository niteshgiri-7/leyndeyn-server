import { Test, TestingModule } from "@nestjs/testing";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import { Category } from "../../generated/prisma/client/client";
import type { JwtPayload } from "../auth/jwt-payload.type";
import { GroupCategoryManagerGuard } from "./guard/group-category-manager.guard";

// ─── Mock Factory ─────────────────────────────────────────────────────────────

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
  const mockUser: JwtPayload = {
    id: "user-uuid-1",
    email: "test@local",
    username: "tester",
    isVerified: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [{ provide: CategoryService, useValue: categoryServiceMock }],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockGuard)
      .overrideGuard(GroupCategoryManagerGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<CategoryController>(CategoryController);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── getAllCategories ───────────────────────────────────────────────────────

  describe("getAllCategories", () => {
    it("should return categories for owner", async () => {
      const categories = [makeMockCategory()];
      categoryServiceMock.getAllCategories.mockResolvedValue(categories[0]);

      const result = await controller.getAllCategories("user-uuid-1");

      expect(categoryServiceMock.getAllCategories).toHaveBeenCalledWith(
        "user-uuid-1",
      );
      expect(result).toEqual(categories[0]);
    });
  });

  // ─── createCategory ────────────────────────────────────────────────────────

  describe("createCategory", () => {
    it("should create and return a category", async () => {
      const dto: CreateCategoryDto = {
        name: "Food",
        description: "Food expenses",
        ownerId: "user-uuid-1",
      };
      const created = makeMockCategory();
      categoryServiceMock.createCategory.mockResolvedValue(created);

      const result = await controller.createCategory(dto);

      expect(categoryServiceMock.createCategory).toHaveBeenCalledWith(dto);
      expect(result).toEqual(created);
    });

    it("should pass ownerId from dto to service", async () => {
      const dto: CreateCategoryDto = {
        name: "Transport",
        description: "Transport expenses",
        ownerId: "group-uuid-1",
      };
      categoryServiceMock.createCategory.mockResolvedValue(
        makeMockCategory({ name: "Transport" }),
      );

      await controller.createCategory(dto);

      expect(categoryServiceMock.createCategory).toHaveBeenCalledWith(dto);
    });
  });

  // ─── updateCategory ────────────────────────────────────────────────────────

  describe("updateCategory", () => {
    it("should update and return the category", async () => {
      const dto: CreateCategoryDto = {
        name: "Transport",
        description: "Transport expenses",
        ownerId: "user-uuid-1",
      };
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
      const dto: CreateCategoryDto = {
        name: "Transport",
        description: "Updated desc",
        ownerId: "user-uuid-1",
      };
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

      const result = await controller.getCategory(mockUser, "uuid-1");

      expect(categoryServiceMock.getCategoryById).toHaveBeenCalledWith(
        "uuid-1",
        mockUser.id,
      );
      expect(result).toEqual(category);
    });

    it("should return null if category does not exist", async () => {
      categoryServiceMock.getCategoryById.mockResolvedValue(null);

      const result = await controller.getCategory(
        mockUser,
        "non-existent-uuid",
      );

      expect(result).toBeNull();
    });
  });
});
