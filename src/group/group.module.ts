import { Module } from "@nestjs/common";
import { GroupController } from "./group.controller";
import { GroupService } from "./group.service";
import { GroupMemberController } from "./group-member.controller";
import { GroupMemberService } from "./group-member.service";
import { GroupAdminGuard } from "./guard/group-admin.guard";
import { UserRepository } from "../repository/user.repository";
@Module({
  controllers: [GroupController, GroupMemberController],
  providers: [
    GroupService,
    UserRepository,
    GroupMemberService,
    GroupAdminGuard,
  ],
})
export class GroupModule {}
