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
import { GroupCategoryManagerGuard } from "./guard/group-category-manager.guard";
import { ALLOW_NON_ADMIN } from "../group/decorator/allow-non-admin";
import { CurrentUser } from "../auth/decorator/current-user.decorator";
import type { JwtPayload } from "../auth/jwt-payload.type";

@UseGuards(AuthGuard, GroupCategoryManagerGuard)
@Controller("category")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ALLOW_NON_ADMIN()
  @Get("/all")
  //ownerId could be userId,friendShipId or groupId based on the scope
  async getAllCategories(
    @CurrentUser() user: JwtPayload,
    @Query("scope") scope: CategoryScope,
    @Query("ownerId") ownerId: string,
  ) {
    return await this.categoryService.getAllCategories(
      scope,
      scope === "PERSONAL" ? user.id : ownerId,
    );
  }

  @Post()
  async createCategory(
    @CurrentUser() user: JwtPayload,
    @Body() data: CreateCategoryDto,
  ) {
    return await this.categoryService.createCategory(
      data,
      data?.scope === "PERSONAL" ? user.id : data.ownerId,
    );
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
  async getCategory(
    @CurrentUser() user: JwtPayload,
    @Param("categoryId", ParseUUIDPipe) categoryId: string,
  ) {
    return await this.categoryService.getCategoryById(categoryId, user?.id);
  }
}
