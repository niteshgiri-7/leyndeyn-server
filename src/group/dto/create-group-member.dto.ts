import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { GroupRole } from "../../../generated/prisma/client/enums";

export class CreateGroupMemberDto {
  @IsNotEmpty()
  @IsString()
  userId!: string;

  @IsEnum(GroupRole)
  role?: GroupRole;
}
