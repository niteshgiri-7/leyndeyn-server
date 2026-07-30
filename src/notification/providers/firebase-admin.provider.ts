// notifications/providers/firebase-admin.provider.ts
import * as admin from "firebase-admin";
import { FactoryProvider, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FIREBASE_ADMIN } from "../notification.constants";

export const firebaseAdminProvider: FactoryProvider<admin.App> = {
  provide: FIREBASE_ADMIN,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const logger = new Logger("FirebaseAdmin");
    const projectId = config.get<string>("FIREBASE_PROJECT_ID");
    const clientEmail = config.get<string>("FIREBASE_CLIENT_EMAIL");
    const privateKey = config
      .get<string>("FIREBASE_PRIVATE_KEY")
      ?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      logger.error("Missing Firebase Admin credentials in environment");
      throw new Error(
        "Firebase Admin misconfigured — check FIREBASE_* env vars",
      );
    }

    return admin.initializeApp({
      credential: admin.cert({ projectId, clientEmail, privateKey }),
    });
  },
};
