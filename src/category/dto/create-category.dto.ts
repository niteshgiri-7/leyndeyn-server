import { IsEnum, IsNotEmpty, IsString, MaxLength } from "class-validator";
import { CategoryScope } from "../../../generated/prisma/client/enums";

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  description!: string;

  @IsEnum(CategoryScope)
  scope!: CategoryScope;

  @IsString()
  @IsNotEmpty()
  ownerId!: string;
}
