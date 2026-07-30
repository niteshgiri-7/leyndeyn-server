import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationService } from "../notification.service";
import { ExpenseCreatedEvent } from "../../common/events/expense-created.event";
import { AppEvents } from "../../common/events/all-app.events";
import { BaseEventListener } from "./base-notification.listener";

@Injectable()
export class ExpenseNotificationsListener extends BaseEventListener {
  protected readonly logger = new Logger(ExpenseNotificationsListener.name);

  constructor(private readonly notification: NotificationService) {
    super();
  }

  @OnEvent(AppEvents.EXPENSE_CREATED)
  async handleExpenseCreated(event: ExpenseCreatedEvent) {
    await this.safeHandle(() =>
      this.notification.notifyUser(
        {
          type: "EXPENSE_ADDED",
          groupId: event.groupId,
          receiptIds: event.participantIds,
          payload: {
            amount: event.amount.toString(),
            groupName: event.groupName || "",
            actorName: event.payerName,
          },
        },
        event.payerId,
      ),
    );
  }
}
