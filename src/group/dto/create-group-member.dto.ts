import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { GroupRole } from "../../../generated/prisma/client/enums";

export class GroupMemberDto {
  @IsNotEmpty()
  @IsString()
  groupId!: string;
  userId!: string;

  @IsEnum(GroupRole)
  role?: GroupRole;
}
