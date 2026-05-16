import { Module } from "@nestjs/common";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import { GroupMemberController } from "./group-member.controller";
import { GroupMemberService } from "./group-member.service";
import { GroupController } from "./group.controller";
import { GroupService } from "./group.service";
import { GroupAdminGuard } from "./guard/group-admin.guard";
import { RepositoryModule } from "../repository/repository.module";
@Module({
  imports: [RepositoryModule],
  controllers: [GroupController, GroupMemberController],
  providers: [GroupService, GroupMemberService, AuthGuard, GroupAdminGuard],
})
export class GroupModule {}
