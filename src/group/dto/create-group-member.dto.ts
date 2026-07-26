import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { GroupRole } from "../../../generated/prisma/client/enums";

export class CreateGroupMemberDto {
  @IsNotEmpty()
  @IsString()
  email!: string;

  @IsEnum(GroupRole)
  @IsOptional()
  role?: GroupRole;
}
