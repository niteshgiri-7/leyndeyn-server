import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { GroupMemberDto } from "./dto/create-group-member.dto";
import { GroupMemberService } from "./group-member.service";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import { GroupAdminGuard } from "./guard/group-admin.guard";
import { ALLOW_NON_ADMIN } from "./decorator/allow-non-admin";

@UseGuards(AuthGuard, GroupAdminGuard)
@Controller("group/:groupId/members")
export class GroupMemberController {
  constructor(private readonly groupMemberService: GroupMemberService) {}

  @Post()
  async addMemberToGroup(
    @Body() data: GroupMemberDto,
    @Param("groupId") groupId: string,
  ) {
    return await this.groupMemberService.addMemberToGroup(
      groupId,
      data.userId,
      data.role,
    );
  }

  @Delete(":userId")
  async removeMemberFromGroup(
    @Param("groupId") groupId: string,
    @Param("userId") userId: string,
  ) {
    return await this.groupMemberService.removeMemberFromGroup(groupId, userId);
  }

  @ALLOW_NON_ADMIN()
  @Get()
  async getAllGroupMembers(@Param("groupId") groupId: string) {
    return await this.groupMemberService.getAllGroupMembers(groupId);
  }
}
