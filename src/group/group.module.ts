import { Module } from "@nestjs/common";
import { GroupController } from "./group.controller";
import { GroupService } from "./group.service";
import { GroupMemberController } from "./group-member.controller";
import { GroupMemberService } from "./group-member.service";
import { GroupAdminGuard } from "./guard/group-admin.guard";
import { UserRepository } from "../repository/user.repository";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
@Module({
  controllers: [GroupController, GroupMemberController],
  providers: [
    GroupService,
    UserRepository,
    GroupMemberService,
    AuthGuard,
    GroupAdminGuard,
  ],
})
export class GroupModule {}
