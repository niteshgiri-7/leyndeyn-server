import { IsEmail, IsNotEmpty } from "class-validator";

export class CreateFriendGroupDto {
  @IsNotEmpty()
  @IsEmail()
  email!: string;
}
