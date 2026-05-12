import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../generated/prisma/client/client';

export type JwtPayload = Pick<User, "email" | "username" | "isVerified">;

@Injectable()
export class AuthService {

    constructor(private readonly jwtService: JwtService) { }

    async hashPassword(password: string) {
        return await bcrypt.hash(password, 10);
    }

    async comparePassword(password: string, hashedPassword: string) {
        return await bcrypt.compare(password, hashedPassword);
    }

   async generateJwtToken(payload:JwtPayload,options?:JwtSignOptions){
    return await this.jwtService.signAsync(payload,options);
   }


}
