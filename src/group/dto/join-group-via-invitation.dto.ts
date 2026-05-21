import { IsNotEmpty, IsString } from "class-validator";

export class JoinGroupViaInvitationDto {
  @IsString()
  @IsNotEmpty()
  invitationCode!: string;
}
