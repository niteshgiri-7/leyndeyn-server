import { Injectable, NotFoundException } from '@nestjs/common';
import { UserCreateInput } from '../../generated/prisma/client/models';
import { UserRepository } from '../repository/user.repository';

@Injectable()
export class UserService {
    constructor(private readonly userRepository: UserRepository) {}
      
    async findUserById(id:string){
        const user = await this.userRepository.findById(id);
        if (!user) 
            throw new NotFoundException('User not found');
        return user;
    }

    async findUserByEmail(email:string){
        const user = await this.userRepository.findByEmail(email);
        if (!user) 
            throw new NotFoundException('User not found');
        return user;
    }
    
    async findAllUsers(){
        const users = await this.userRepository.findAll();
        if(!users || users.length === 0)
            throw new NotFoundException("No users found");
        return users;
    }

    async createUser(user:UserCreateInput){
         return await this.userRepository.create(user);
    }
}
