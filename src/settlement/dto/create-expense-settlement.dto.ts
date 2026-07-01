import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import { SettlementStatus } from "../../../generated/prisma/client/enums";

export class CreateExpenseSettlementDto {
  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SettlementStatus)
  @IsOptional()
  status?: SettlementStatus;

  @IsUUID()
  @IsNotEmpty()
  fromUserId!: string;

  @IsUUID()
  @IsNotEmpty()
  toUserId!: string;
}

export class UpdateSettlementStatusDto {
  @IsEnum(SettlementStatus)
  @IsNotEmpty()
  status!: SettlementStatus;
}
