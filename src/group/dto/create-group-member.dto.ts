import { IsEnum, IsNotEmpty, IsOptional } from "class-validator";
import { GroupRole } from "../../../generated/prisma/client/enums";

export class CreateGroupMemberDto {
  @IsNotEmpty()
  email!: string | string[];

  @IsEnum(GroupRole)
  @IsOptional()
  role?: GroupRole;
}
