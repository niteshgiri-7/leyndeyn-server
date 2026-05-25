import { IsEnum, IsNotEmpty, IsString, MaxLength } from "class-validator";

export enum CategoryScope {
  PERSONAL,
  GROUP,
}
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
