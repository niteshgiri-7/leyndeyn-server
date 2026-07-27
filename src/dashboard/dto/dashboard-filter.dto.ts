import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Validate,
} from "class-validator";
import {
  IsBeforeOrSameConstraint,
  IsNotInFutureConstraint,
} from "../../common/validators/date.validator";

export enum DashboardPeriod {
  THIS_WEEK = "THIS_WEEK",
  THIS_MONTH = "THIS_MONTH",
  PREVIOUS_WEEK = "PREVIOUS_WEEK",
  PREVIOUS_MONTH = "PREVIOUS_MONTH",
}

export class DashboardFilterDto {
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod;

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
}
