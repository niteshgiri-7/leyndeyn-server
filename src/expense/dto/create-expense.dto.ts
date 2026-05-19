import { Type } from "class-transformer";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import {
  CategoryScope as ExpenseScope,
  SplitStrategy,
} from "../../../generated/prisma/client/enums";

export class ExpenseParticipantDto {
  @IsString()
  @IsNotEmpty()
  participantId!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  exactAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;
}

export class CreateExpenseDto {
  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsEnum(SplitStrategy)
  @IsOptional()
  splitStrategy?: SplitStrategy;

  @IsNotEmpty()
  @IsEnum(ExpenseScope)
  scope!: ExpenseScope;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExpenseParticipantDto)
  participants?: ExpenseParticipantDto[];
}
