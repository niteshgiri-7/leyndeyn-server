import { IsDateString, IsNotEmpty, IsOptional } from "class-validator";

export class DateRangeDto {
  @IsOptional()
  @IsNotEmpty()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsNotEmpty()
  @IsDateString()
  endDate?: string;
}
