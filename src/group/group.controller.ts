import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { GroupService } from "./group.service";
import { CreateGroupDto } from "./dto/create-group.dto";
import { CreateFriendGroupDto } from "./dto/create-friend-group.dto";
import { JoinGroupViaInvitationDto } from "./dto/join-group-via-invitation.dto";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorator/current-user.decorator";
import { GroupAdminGuard } from "./guard/group-admin.guard";
import { ALLOW_NON_ADMIN } from "./decorator/allow-non-admin";
import type { JwtPayload } from "../auth/jwt-payload.type";

@Controller("group")
@UseGuards(AuthGuard, GroupAdminGuard)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @ALLOW_NON_ADMIN()
  @Get("all")
  async getAllGroupsForUser(@CurrentUser() user: JwtPayload) {
    return await this.groupService.getAllGroupsForUser(user?.id);
  }

  @ALLOW_NON_ADMIN()
  @Get(":groupId")
  async getGroupById(@Param("groupId") groupId: string) {
    return await this.groupService.findGroupById(groupId);
  }

  @ALLOW_NON_ADMIN()
  @Post()
  async createGroup(
    @CurrentUser() user: JwtPayload,
    @Body() data: CreateGroupDto,
  ) {
    return await this.groupService.createGroup(user?.id, data);
  }

  @ALLOW_NON_ADMIN()
  @Post("/friends")
  async createFriendGroup(
    @CurrentUser() user: JwtPayload,
    @Body() data: CreateFriendGroupDto,
  ) {
    return await this.groupService.createFriendGroup(user?.id, data.email);
  }

  @ALLOW_NON_ADMIN()
  @Get("/friends")
  async getAllFriendGroups(@CurrentUser() user: JwtPayload) {
    return await this.groupService.getAllFriendGroups(user?.id);
  }

  @ALLOW_NON_ADMIN()
  @Post("/join")
  async joinGroupViaInvitationCode(
    @Body() data: JoinGroupViaInvitationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.groupService.joinGroupViaInvitationCode(
      data.invitationCode,
      user.id,
    );
  }

  @Put(":groupId")
  async updateGroupById(
    @Param("groupId") groupId: string,
    @Body() data: Partial<CreateGroupDto>,
  ) {
    return await this.groupService.updateGroupById(groupId, data);
  }

  @Delete(":groupId")
  async deleteGroupById(@Param("groupId") groupId: string) {
    return await this.groupService.deleteGroupById(groupId);
  }

  //TODO: api to change the flag to allow/disallow members to invite other members to the group
}
