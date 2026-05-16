import { Module } from "@nestjs/common";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";
import { GroupCategoryManagerGuard } from "./guard/group-category-manager.guard";

@Module({
  controllers: [CategoryController],
  providers: [CategoryService, GroupCategoryManagerGuard],
})
export class CategoryModule {}
