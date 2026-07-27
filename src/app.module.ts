import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { UserModule } from "./user/user.module";
import { JwtModule } from "@nestjs/jwt";
import { GroupModule } from "./group/group.module";
import { CategoryModule } from "./category/category.module";
import { BudgetModule } from "./budget/budget.module";
import { ExpenseModule } from "./expense/expense.module";
import { SettlementModule } from "./settlement/settlement.module";
import { DashboardModule } from "./dashboard/dashboard.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
      }),
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    GroupModule,
    CategoryModule,
    BudgetModule,
    ExpenseModule,
    SettlementModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
