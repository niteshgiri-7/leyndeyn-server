import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SettlementService } from "./settlement.service";
import { CheckAccess } from "../expense/decorator/check-access.decorator";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  CreateExpenseSettlementDto,
  UpdateSettlementStatusDto,
} from "./dto/create-expense-settlement.dto";
import { CurrentUser } from "../auth/decorator/current-user.decorator";
import type { JwtPayload } from "../auth/jwt-payload.type";

@UseGuards(AuthGuard)
@Controller("settlement/group/")
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @CheckAccess("group")
  @Get(":groupId")
  async getPendingSettlements(
    @Param("groupId", ParseUUIDPipe) groupId: string,
  ) {
    return await this.settlementService.getPendingSettlementsByGroupId(groupId);
  }

  //TODO: send email or notification to "toUserId" that "fromUserId" has settled the expense and the amount has been transferred to their account and ask for review.
  @CheckAccess("group")
  @Post(":groupId/")
  async settleExpense(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() data: CreateExpenseSettlementDto,
  ) {
    return await this.settlementService.settleExpense(groupId, data);
  }

  @CheckAccess("group")
  @Post(":groupId/:settlementId/status")
  async updateSettlementStatus(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Param("settlementId", ParseUUIDPipe) settlementId: string,
    @CurrentUser() user: JwtPayload,
    @Body("status") data: UpdateSettlementStatusDto,
  ) {
    return await this.settlementService.updateSettlementStatus(
      user.id,
      groupId,
      settlementId,
      data.status,
    );
  }
}
