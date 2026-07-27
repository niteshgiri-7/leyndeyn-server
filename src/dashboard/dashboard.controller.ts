import { Controller, Get, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/decorator/current-user.decorator";
import type { JwtPayload } from "../auth/jwt-payload.type";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import { DashboardService } from "./dashboard.service";

@UseGuards(AuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  async getDashboard(@CurrentUser() user: JwtPayload) {
    return await this.dashboardService.getDashboardData(user.id);
  }
}
