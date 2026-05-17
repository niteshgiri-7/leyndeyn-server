import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { BudgetResetStrategy } from "../../../generated/prisma/client/enums";

export class CreateBudgetDto {
  @IsString()
  @MaxLength(50)
  @IsNotEmpty()
  name!: string;

  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @IsEnum(BudgetResetStrategy)
  @IsOptional()
  resetStrategy?: BudgetResetStrategy;
}
