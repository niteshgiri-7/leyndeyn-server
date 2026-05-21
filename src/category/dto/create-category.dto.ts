import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  description!: string;

  @IsString()
  @IsNotEmpty()
  ownerId!: string;
}
