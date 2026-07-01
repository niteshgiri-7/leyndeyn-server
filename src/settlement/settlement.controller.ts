import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { SettlementService } from "./settlement.service";

@Controller("settlement/group/")
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Get(":groupId")
  async getPendingSettlements(
    @Param("groupId", ParseUUIDPipe) groupId: string,
  ) {
    return await this.settlementService.getPendingSettlementsByGroupId(groupId);
  }
}
