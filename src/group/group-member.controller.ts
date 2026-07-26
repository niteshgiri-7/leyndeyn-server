import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { GroupRole } from "../../generated/prisma/client/enums";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import { ALLOW_NON_ADMIN } from "./decorator/allow-non-admin";
import { CreateGroupMemberDto } from "./dto/create-group-member.dto";
import { GroupMemberService } from "./group-member.service";
import { GroupAdminGuard } from "./guard/group-admin.guard";
import { CurrentUser } from "../auth/decorator/current-user.decorator";

@UseGuards(AuthGuard, GroupAdminGuard)
@Controller("group/:groupId/members")
export class GroupMemberController {
  constructor(private readonly groupMemberService: GroupMemberService) {}

  @Post()
  async addMemberToGroup(
    @Body() data: CreateGroupMemberDto,
    @Param("groupId") groupId: string,
  ) {
    return await this.groupMemberService.addMemberToGroup(
      groupId,
      data.email,
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

  @Post("/:memberId/role")
  async changeMemberRole(
    @Param("groupId") groupId: string,
    @Param("memberId") memberId: string,
    @Body("role") role: GroupRole,
    @CurrentUser("id") currentUserId: string,
  ) {
    return await this.groupMemberService.changeMemberRole(
      groupId,
      memberId,
      role,
      currentUserId,
    );
  }
}
