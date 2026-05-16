import { Module } from "@nestjs/common";
import { CategoryController } from "./category.controller";
import { CategoryService } from "./category.service";
import { CategoryCreationGuard } from "./guard/create-category.guard";

@Module({
  controllers: [CategoryController],
  providers: [CategoryService, CategoryCreationGuard],
})
export class CategoryModule {}
