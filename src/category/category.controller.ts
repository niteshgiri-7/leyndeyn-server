import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { CategoryScope } from "../../generated/prisma/client/enums";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import { CategoryCreationGuard } from "./guard/create-category.guard";
import { ALLOW_NON_ADMIN } from "../group/decorator/allow-non-admin";

@UseGuards(AuthGuard, CategoryCreationGuard)
@Controller("category")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ALLOW_NON_ADMIN()
  @Get("/all")
  //ownerId could be userId,friendShipId or groupId based on the scope
  async getAllCategories(
    @Query("scope") scope: CategoryScope,
    @Query("ownerId") ownerId: string,
  ) {
    return await this.categoryService.getAllCategories(scope, ownerId);
  }

  @Post()
  async createCategory(@Body() data: CreateCategoryDto) {
    return await this.categoryService.createCategory(data, data?.ownerId);
  }

  @Put(":categoryId")
  async updateCategory(
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @Body() data: Partial<CreateCategoryDto>,
  ) {
    return await this.categoryService.updateCategory(data, categoryId);
  }

  @Delete(":categoryId")
  async deleteCategory(@Param("categoryId", ParseUUIDPipe) categoryId: string) {
    return await this.categoryService.deleteCategory(categoryId);
  }

  @ALLOW_NON_ADMIN()
  @Get(":categoryId")
  async getCategory(@Param("categoryId", ParseUUIDPipe) categoryId: string) {
    return await this.categoryService.getCategoryById(categoryId);
  }
}
