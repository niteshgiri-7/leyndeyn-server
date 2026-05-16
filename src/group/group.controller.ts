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

  @Get(":id")
  async getGroupById(@Param("id") id: string) {
    return await this.groupService.findGroupById(id);
  }

  @Post()
  async createGroup(
    @CurrentUser() userId: string,
    @Body() data: CreateGroupDto,
  ) {
    return await this.groupService.createGroup(userId, data);
  }

  @Put(":groupdId")
  async updateGroupById(
    @Param("groupdId") groupdId: string,
    @Body() data: Partial<CreateGroupDto>,
  ) {
    return await this.groupService.updateGroupById(groupdId, data);
  }

  @Delete(":groupdId")
  async deleteGroupById(@Param("groupdId") groupdId: string) {
    return await this.groupService.deleteGroupById(groupdId);
  }

  //TODO: api to change the flag to allow/disallow members to invite other members to the group
}
