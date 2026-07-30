import { Module } from "@nestjs/common";
import { NotificationService } from "./notification.service";
import { ExpenseNotificationsListener } from "./listeners/expense-notification.listener";
import { firebaseAdminProvider } from "./providers/firebase-admin.provider";
import { NOTIFICATION_SENDER } from "./notification.constants";
import { FcmNotificationSender } from "./providers/fcm-notification-sender.provider";
import { AddedToGroupNotificationListener } from "./listeners/added-to-group-notification.listener";

@Module({
  providers: [
    firebaseAdminProvider,
    {
      provide: NOTIFICATION_SENDER,
      useClass: FcmNotificationSender,
    },
    NotificationService,
    ExpenseNotificationsListener,
    AddedToGroupNotificationListener,
  ],
})
export class NotificationModule {}
