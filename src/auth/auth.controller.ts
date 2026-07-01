import { Body, Controller, Post } from "@nestjs/common";
import { CreateUserDto, CustomLoginDto } from "../user/dto/user.dto";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() loginDto: CustomLoginDto) {
    return await this.authService.login(loginDto.email, loginDto.password);
  }

  @Post("signup")
  async signup(@Body() createUserDto: CreateUserDto) {
    return await this.authService.signup(
      createUserDto.email,
      createUserDto.password,
      createUserDto.username,
    );
  }

  @Post("refresh-token")
  async refreshToken(@Body("refreshToken") refreshToken: string) {
    return await this.authService.refreshToken(refreshToken);
  }
}
