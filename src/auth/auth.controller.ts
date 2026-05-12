import { Body, ConflictException, Controller, NotFoundException, Post, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto, CustomLoginDto } from '../user/dto/user.dto';
import { AuthService, JwtPayload } from './auth.service';
import { UserRepository } from '../repository/user.repository';

@Controller('auth')
export class AuthController {
  
    constructor(private readonly userRepository:UserRepository,private readonly authService:AuthService){}

    @Post('login')
    async login(@Body() loginDto:CustomLoginDto){
        
      const user = await this.userRepository.findByEmail(loginDto.email);

        if(!user || !user.passwordHash || !user.email)
            throw new NotFoundException('user not found');


        const isCredentialsValid = await this.authService.comparePassword(loginDto.password,user.passwordHash);

        if(!isCredentialsValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload:JwtPayload = {
            email:user.email,
            isVerified:user.isVerified,
            username:user.username,

        }
       
        const accessToken = await this.authService.generateJwtToken(payload,{expiresIn:"1h"});
        const refreshToken = await this.authService.generateJwtToken(payload,{expiresIn:"7d"});

        return { accessToken, refreshToken, message:`Welcome back ${user.username}!` };

    }

    @Post('signup')
    async signup(@Body() createUserDto:CreateUserDto){

        const {email,password,username} = createUserDto;

        const user = await this.userRepository.findByEmail(email);

        if(user) throw new ConflictException('User with this email already exists');

        const hashedPassword = await this.authService.hashPassword(password);

        const newUser = await this.userRepository.create({
            email,
            passwordHash:hashedPassword,
            username
        });

        const accessToken = await this.authService.generateJwtToken(newUser,{expiresIn:"1h"});
        const refreshToken = await this.authService.generateJwtToken(newUser,{expiresIn:"7d"});

        return { accessToken, refreshToken, message:`Welcome abroad ${newUser.username}!` };
    }
}
