import type { App } from "firebase-admin";
import {
  NotificationSender,
  PushPayload,
  PushSendResult,
  TokenResult,
} from "../interfaces/notification-sender.interface";
import { FidMulticastMessage, getMessaging } from "firebase-admin/messaging";
import { Inject, Injectable } from "@nestjs/common";
import { FIREBASE_ADMIN } from "../notification.constants";

const UNREGISTERED_ERROR_CODES = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
]);

@Injectable()
export class FcmNotificationSender implements NotificationSender {
  constructor(@Inject(FIREBASE_ADMIN) private firebaseApp: App) {}

  async send(payload: PushPayload): Promise<PushSendResult> {
    if (payload.tokens.length === 0)
      return {
        successCount: 0,
        failureCount: 0,
        invalidTokens: [],
        results: [],
        errors: [],
      };
    const message: FidMulticastMessage = {
      fids: payload.tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl || undefined,
      },
      data: payload.data,
    };

    const response = await getMessaging(this.firebaseApp).sendEachForMulticast(
      message,
    );

    const invalidTokens: string[] = response.responses
      .map((res, i) =>
        !res.success && this.isUnregistered(res.error?.code)
          ? payload.tokens[i]
          : null,
      )
      .filter((token) => token !== null);

    const results: TokenResult[] = response.responses.map((res, i) => ({
      token: payload.tokens[i],
      success: res.success,
    }));

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      invalidTokens,
      results,
      errors: response.responses.map((res) => res.error?.message),
    };
  }

  private isUnregistered(code?: string): boolean {
    return !!code && UNREGISTERED_ERROR_CODES.has(code);
  }
}
