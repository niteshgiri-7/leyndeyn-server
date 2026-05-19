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
import { SplitStrategy } from "../../../generated/prisma/client/enums";

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

export class UpdateExpenseDto {
  @IsNumber()
  @IsNotEmpty()
  @IsOptional()
  amount!: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description!: string;

  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsEnum(SplitStrategy)
  splitStrategy?: SplitStrategy;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExpenseParticipantDto)
  participants?: ExpenseParticipantDto[];
}
