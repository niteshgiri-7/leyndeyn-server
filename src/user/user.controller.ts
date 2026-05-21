import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { UserService } from "./user.service";

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  //TODO:add admin validation here later
  @Get("all")
  async getAllUsers() {
    return await this.userService.findAllUsers();
  }

  //TODO: add validation(must be self or same group member) before returning the user details
  @Get(":id")
  async getUserById(@Param("id", ParseUUIDPipe) id: string) {
    return await this.userService.findUserById(id);
  }
}
