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

@Controller("group")
@UseGuards(AuthGuard)
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

  @Put(":id")
  async updateGroupById(
    @Param("id") id: string,
    @Body() data: Partial<CreateGroupDto>,
  ) {
    return await this.groupService.updateGroupById(id, data);
  }

  @Delete(":id")
  async deleteGroupById(@Param("id") id: string) {
    return await this.groupService.deleteGroupById(id);
  }
}
