import { Transform, Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsDateString,
  IsArray,
  IsOptional,
  IsString,
  Min,
  IsNumber,
} from "class-validator";

export class ExpenseFilterQueryDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Transform(({ value }): string[] | undefined => {
    if (value == null) return value;

    return Array.isArray(value) ? (value as string[]) : [String(value)];
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  spentById?: string[];
}
