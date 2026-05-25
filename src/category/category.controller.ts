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
import { CurrentUser } from "../auth/decorator/current-user.decorator";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/jwt-payload.type";
import { ALLOW_NON_ADMIN } from "../group/decorator/allow-non-admin";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { GroupCategoryManagerGuard } from "./guard/group-category-manager.guard";

@UseGuards(AuthGuard, GroupCategoryManagerGuard)
@Controller("category")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ALLOW_NON_ADMIN()
  @Get("/all")
  //ownerId could be userId or groupId based on the scope
  async getAllCategories(
    @Query("ownerId") ownerId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.categoryService.getAllCategories(ownerId, user?.id);
  }

  @ALLOW_NON_ADMIN()
  @Post("/personal")
  async createPersonalCategory(
    @Body() data: CreateCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.categoryService.createPersonalCategory(data, user?.id);
  }

  @Post("/group")
  async createGroupCategory(
    @Body() data: CreateCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.categoryService.createGroupCategory(data, user?.id);
  }

  @Put(":categoryId")
  async updateCategory(
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @Body() data: CreateCategoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.categoryService.updateCategory(
      data,
      categoryId,
      user?.id,
    );
  }

  @Delete(":categoryId")
  async deleteCategory(
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.categoryService.deleteCategory(categoryId, user?.id);
  }

  @ALLOW_NON_ADMIN()
  @Get(":categoryId")
  async getCategory(
    @CurrentUser() user: JwtPayload,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
  ) {
    return await this.categoryService.getCategoryById(categoryId, user?.id);
  }
}
