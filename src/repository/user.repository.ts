import { Injectable } from "@nestjs/common";
import { IRepository } from "./repository.interface";
import { User } from "../../generated/prisma/client/client";
import { UserCreateInput, UserUpdateInput, UserWhereUniqueInput } from "../../generated/prisma/client/models";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class UserRepository implements IRepository<User,UserCreateInput,UserUpdateInput,UserWhereUniqueInput> {

    constructor(private readonly prisma:PrismaService){}

    async findById(id:string){
        return await this.prisma.user.findUnique({
            where:{
                id:id
            }
        })
    }

    async findByEmail(email:string){
        return await this.prisma.user.findUnique({
            where:{
                email:email
            }
        })
    }

    async findAll(){
        return await this.prisma.user.findMany();
    }

    
    async create(data: UserCreateInput) {
        return this.prisma.user.create({
            data
        })
    }

    async update(id:UserWhereUniqueInput,data:UserUpdateInput){
        return await this.prisma.user.update({
            where:id,
            data
        })
    }

    async delete(id:UserWhereUniqueInput){
         await this.prisma.user.delete({
            where:id
        })
    }

};