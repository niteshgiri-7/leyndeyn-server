import { Module } from "@nestjs/common";
import { RepositoryModule } from "../repository/repository.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GoogleAuthService } from "./gogole-auth.service";

@Module({
  imports: [RepositoryModule],
  controllers: [AuthController],
  providers: [AuthService, GoogleAuthService],
})
export class AuthModule {}
