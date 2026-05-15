import { Module } from "@nestjs/common";
import { GroupController } from "./group.controller";
import { GroupService } from "./group.service";
import { GroupMemberController } from "./group-member.controller";

@Module({
  controllers: [GroupController, GroupMemberController],
  providers: [GroupService],
})
export class GroupModule {}
