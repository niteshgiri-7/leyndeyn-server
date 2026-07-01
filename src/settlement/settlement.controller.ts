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
import { CreateExpenseSettlementDto } from "./dto/create-expense-settlement.dto";

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

  @CheckAccess("group")
  @Post(":groupId/")
  async settleExpense(
    @Param("groupId", ParseUUIDPipe) groupId: string,
    @Body() data: CreateExpenseSettlementDto,
  ) {
    return await this.settlementService.settleExpense(groupId, data);
  }
}
