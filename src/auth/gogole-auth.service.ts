import { Injectable, UnauthorizedException } from "@nestjs/common";
import { LoginTicket, OAuth2Client, TokenPayload } from "google-auth-library";

@Injectable()
export class GoogleAuthService {
  private readonly client: OAuth2Client;

  constructor() {
    this.client = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);
  }

  async verifyIdToken(idToken: string): Promise<TokenPayload> {
    let ticket: LoginTicket;
    try {
      ticket = await this.client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_WEB_CLIENT_ID,
      });
    } catch {
      throw new UnauthorizedException("Invalid Google ID token");
    }
    const payload = ticket.getPayload();

    if (
      !payload ||
      !payload.email ||
      !payload.name ||
      !payload.email_verified
    ) {
      throw new UnauthorizedException("Invalid Google ID token");
    }
    return payload;
  }
}
