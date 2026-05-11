import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AccountCreateInput, UserCreateInput } from '../../../generated/prisma/client/models';


export class BaseUserDto implements UserCreateInput {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
  
  @IsString()
  @IsNotEmpty()
  username!:string;
}

export class CreateUserDto extends BaseUserDto  {
  @IsString()
  @MinLength(8)
  password!:string;
}

export class GoogleLoginDto extends BaseUserDto implements  Omit<AccountCreateInput,"user"> {
       
      @IsString()
      @IsNotEmpty()
       provider!: string;

      @IsString()
      @IsNotEmpty()
       providerAccountId!: string;
}

export class CustomLoginDto implements Pick<UserCreateInput,"email">{
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  password!:string;
}