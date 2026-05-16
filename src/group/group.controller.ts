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
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorator/current-user.decorator";
import { GroupAdminGuard } from "./guard/group-admin.guard";

@Controller("group")
@UseGuards(AuthGuard, GroupAdminGuard)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Get(":groupId")
  async getGroupById(@Param("groupId") groupId: string) {
    return await this.groupService.findGroupById(groupId);
  }

  @Post()
  async createGroup(
    @CurrentUser() userId: string,
    @Body() data: CreateGroupDto,
  ) {
    return await this.groupService.createGroup(userId, data);
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
