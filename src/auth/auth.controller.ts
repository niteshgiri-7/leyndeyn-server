import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { CreateUserDto, CustomLoginDto } from "../user/dto/user.dto";

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

  @Post("google")
  async loginWithGoogle(@Body() dto: GoogleLoginDto) {
    return await this.authService.loginWithGoogle(dto);
  }

  @Post("refresh-token")
  async refreshToken(@Body("refreshToken") refreshToken: string) {
    return await this.authService.refreshToken(refreshToken);
  }
}
