import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RepositoryModule } from "../repository/repository.module";
import { ConfigService } from "@nestjs/config";

@Module({
  imports:[
       RepositoryModule,
  JwtModule.registerAsync({
  inject: [ConfigService],

  useFactory: (configService: ConfigService) => ({
    secret: configService.get<string>('JWT_SECRET'),
  }),
})
  ],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
