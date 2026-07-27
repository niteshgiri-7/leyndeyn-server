import { Transform, Type } from "class-transformer";
import {
  ArrayNotEmpty,
  IsDateString,
  IsArray,
  IsOptional,
  IsString,
  Min,
  IsNumber,
  Validate,
} from "class-validator";
import {
  IsBeforeOrSameConstraint,
  IsNotInFutureConstraint,
} from "../../common/validators/date.validator";

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
  @Validate(IsNotInFutureConstraint)
  @Validate(IsBeforeOrSameConstraint, ["endDate"])
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @Validate(IsNotInFutureConstraint)
  endDate?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

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
