import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Status } from "../../generated/prisma/client/enums";
import { CurrentUser } from "../auth/decorator/current-user.decorator";
import { AuthGuard } from "../auth/guards/jwt-auth.guard";
import type { JwtPayload } from "../auth/jwt-payload.type";
import { FriendsService } from "./friends.service";

@Controller("friend")
@UseGuards(AuthGuard)
export class FriendsController {
  constructor(private readonly friendService: FriendsService) {}

  @Get("all")
  async getAllFriends(@CurrentUser() user: JwtPayload) {
    return await this.friendService.getAllFriendsOfAUser(user?.id);
  }

  @Post("requests")
  async sendFriendRequest(
    @CurrentUser() user: JwtPayload,
    @Body("id") id: string,
  ) {
    //requesterId is the current user and receiverId is the id from the parameter
    return await this.friendService.sendFriendRequest(user?.id, id);
  }

  @Delete("requests/:id")
  async cancelFriendRequest(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
  ) {
    return await this.friendService.rejectFriendRequest(user?.id, id);
  }

  @Get("requests/received")
  async getFriendRequests(
    @CurrentUser() user: JwtPayload,
    @Query(
      "status",
      new DefaultValuePipe(Status.PENDING),
      new ParseEnumPipe(Status),
    )
    status: Status,
  ) {
    return await this.friendService.getAllReceivedRequests(user.id, status);
  }

  @Patch("requests/:id")
  async rejectFriendRequest(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
  ) {
    //userId is the current user and friendId is the id from the parameter
    return await this.friendService.rejectFriendRequest(user?.id, id);
  }

  @Patch("requests/:id/accept")
  async acceptFriendRequest(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
  ) {
    return await this.friendService.acceptFriendRequest(user?.id, id);
  }
}
