import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UserRepository } from "../repository/user.repository";
import { JwtPayload } from "./jwt-payload.type";
import { GoogleLoginDto } from "./dto/google-login.dto";
import { GoogleAuthService } from "./gogole-auth.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userRepository: UserRepository,
    private readonly googleAuthService: GoogleAuthService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user || !user.passwordHash || !user.email)
      throw new NotFoundException("user not found");

    const isCredentialsValid = await this.comparePassword(
      password,
      user.passwordHash,
    );

    if (!isCredentialsValid)
      throw new UnauthorizedException("Invalid credentials");

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      isVerified: user.isVerified,
      username: user.username,
    };

    const accessToken = await this.generateJwtToken(payload, {
      expiresIn: "7d",
    });
    const refreshToken = await this.generateJwtToken(payload, {
      expiresIn: "7d",
    });

    return {
      accessToken,
      refreshToken,
      message: `Welcome back ${user.username}!`,
      userId: user.id,
    };
  }

  async signup(email: string, password: string, username: string) {
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser)
      throw new ConflictException("User with this email already exists");

    const hashedPassword = await this.hashPassword(password);

    const newUser = await this.userRepository.create({
      email,
      passwordHash: hashedPassword,
      username,
      category: {
        create: {
          name: "misc",
          description: "Miscellaneous",
        },
      },
    });

    const payload: JwtPayload = {
      id: newUser.id,
      email: newUser.email,
      username: newUser.username,
      isVerified: newUser.isVerified,
    };

    const accessToken = await this.generateJwtToken(payload, {
      expiresIn: "7d",
    });
    const refreshToken = await this.generateJwtToken(payload, {
      expiresIn: "14d",
    });

    return {
      accessToken,
      refreshToken,
      message: `Welcome abroad ${newUser.username}!`,
    };
  }

  async refreshToken(token: string) {
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

    const user = await this.userRepository.findById(payload.id);

    if (!user) throw new UnauthorizedException("User not found");

    const newAccessToken = await this.generateJwtToken(
      {
        email: user.email,
        id: user.id,
        isVerified: user.isVerified,
        username: user.username,
      },
      { expiresIn: "7d" },
    );
    const newRefreshToken = await this.generateJwtToken(
      {
        email: user.email,
        id: user.id,
        isVerified: user.isVerified,
        username: user.username,
      },
      { expiresIn: "30d" },
    );

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      message: "Token refreshed successfully",
    };
  }

  private async hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
  }

  private async comparePassword(password: string, hashedPassword: string) {
    return await bcrypt.compare(password, hashedPassword);
  }

  private async generateJwtToken(
    payload: JwtPayload,
    options?: JwtSignOptions,
  ) {
    return await this.jwtService.signAsync(payload, options);
  }

  async loginWithGoogle(data: GoogleLoginDto) {
    const { idToken } = data;
    const { email, sub, name, picture } =
      await this.googleAuthService.verifyIdToken(idToken);

    if (!email || !sub || !name)
      throw new UnauthorizedException("Invalid Google ID token");

    const existingUser = await this.userRepository.findByEmail(email);

    let payload: JwtPayload;

    if (existingUser) {
      payload = {
        email: existingUser.email,
        id: existingUser.id,
        isVerified: existingUser.isVerified,
        username: existingUser.username,
      };

      const accessToken = await this.generateJwtToken(payload, {
        expiresIn: "7d",
      });
      const refreshToken = await this.generateJwtToken(payload, {
        expiresIn: "30d",
      });

      return {
        accessToken,
        refreshToken,
        message: `Welcome back ${existingUser.username}!`,
      };
    } else {
      const newUser = await this.userRepository.create({
        email,
        username: name,
        isVerified: true,
        avatarUrl: picture ?? null,
        accounts: {
          create: {
            provider: "google",
            providerAccountId: sub,
          },
        },
      });

      payload = {
        email,
        id: newUser.id,
        isVerified: true,
        username: name,
      };
      const accessToken = await this.generateJwtToken(payload, {
        expiresIn: "7d",
      });
      const refreshToken = await this.generateJwtToken(payload, {
        expiresIn: "30d",
      });
      return {
        accessToken,
        refreshToken,
        message: `Welcome aboard ${newUser.username}!`,
      };
    }
  }
}
