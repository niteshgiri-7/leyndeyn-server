import { User } from "../../generated/prisma/client/client";

export type JwtPayload = Pick<User, "email" | "username" | "isVerified" | "id">;
