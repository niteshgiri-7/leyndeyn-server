import { Module } from "@nestjs/common";
import { FriendsController } from "./friends.controller";
import { FriendsService } from "./friends.service";
import { RepositoryModule } from "../repository/repository.module";

@Module({
  imports: [RepositoryModule],
  controllers: [FriendsController],
  providers: [FriendsService],
})
export class FriendsModule {}
