import { Exclude, Expose } from "class-transformer";
import { User } from "../../../generated/prisma/client/client";

export class UserResponseDto {
  @Expose() id!: string;
  @Expose() name!: string;
  @Expose() email!: string;
  @Expose() avatarUrl!: string | null;
  @Expose() username!: string;

  @Exclude() createdAt!: Date;
  @Exclude() updatedAt!: Date;
  @Exclude() isVerified!: boolean;
  @Exclude() passwordHash!: string | null;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
