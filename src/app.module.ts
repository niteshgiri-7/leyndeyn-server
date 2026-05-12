import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';  
import { UserModule } from './user/user.module';

@Module({
  imports: [
        PrismaModule, 
        UserModule,
        AuthModule,
        ConfigModule.forRoot({
      isGlobal: true, 
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {}
