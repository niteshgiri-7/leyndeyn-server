import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { UserService } from "./user.service";

@Controller("user")
export class UserController {
    constructor(private readonly userService:UserService){}

    @Get("all")
    async getAllUsers(){
        return await this.userService.findAllUsers();
    }

    @Get(":id")
    async getUserById(@Param('id', ParseUUIDPipe) id: string) {
        return await this.userService.findUserById(id);
    }
}
