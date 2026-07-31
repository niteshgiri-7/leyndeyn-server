import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { PlatForm } from "../../../generated/prisma/client/enums";

export class RegisterDeviceDto {
  @IsNotEmpty()
  @IsString()
  userId!: string;
  @IsNotEmpty()
  @IsString()
  token!: string;

  @IsEnum(PlatForm)
  platform!: PlatForm;
}
