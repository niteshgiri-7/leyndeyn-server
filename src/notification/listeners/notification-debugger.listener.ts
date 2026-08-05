import { Injectable, Logger } from "@nestjs/common";
import { NotificationService } from "../notification.service";
import { BaseEventListener } from "./base-notification.listener";
import { OnEvent } from "@nestjs/event-emitter";
import { AppEvents } from "../../common/events/all-app.events";

@Injectable()
export class NotificationDebuggerListener extends BaseEventListener {
  protected readonly logger = new Logger(NotificationDebuggerListener.name);
  constructor(private readonly notification: NotificationService) {
    super();
  }

  @OnEvent(AppEvents.DEBUG_NOTIFIATION)
  async handleDebugNotification() {
    await this.safeHandle(() => this.notification.debugSend());
  }
}
