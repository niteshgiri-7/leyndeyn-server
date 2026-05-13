import { Module } from "@nestjs/common";
import { RepositoryModule } from "../repository/repository.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

@Module({
  imports: [RepositoryModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
