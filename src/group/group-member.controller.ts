import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import { ALLOW_NON_ADMIN } from "./decorator/allow-non-admin";
import { CreateGroupMemberDto } from "./dto/create-group-member.dto";
import { GroupMemberService } from "./group-member.service";
import { GroupAdminGuard } from "./guard/group-admin.guard";
import { JoinGroupViaInvitationDto } from "./dto/join-group-via-invitation.dto";
import { CurrentUser } from "../auth/decorator/current-user.decorator";
import type { JwtPayload } from "../auth/jwt-payload.type";
import { GroupRole } from "../../generated/prisma/client/enums";

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
      data.userId,
      data.role,
    );
  }

  @Post()
  async joinGroupByInvitationCode(
    @CurrentUser() currentUser: JwtPayload,
    @Body() data: JoinGroupViaInvitationDto,
  ) {
    return await this.groupMemberService.joinGroupByInvitationCode(
      data.invitationCode,
      currentUser.id,
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

  //TODO: api to change the role of a member in the group
  @Post("/:memberId/role")
  async changeMemberRole(
    @Param("groupId") groupId: string,
    @Param("memberId") memberId: string,
    @Body("role") role: GroupRole,
  ) {
    return await this.groupMemberService.changeMemberRole(
      groupId,
      memberId,
      role,
    );
  }
}
