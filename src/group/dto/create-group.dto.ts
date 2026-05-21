import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateGroupDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsBoolean()
  allowMembersToInvite?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMembersToManageCategory?: boolean;

  @IsOptional()
  @IsEmail()
  participantEmail?: string;
}
