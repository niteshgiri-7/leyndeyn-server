import { JwtPayload } from "../auth/jwt-payload.type";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export {};
