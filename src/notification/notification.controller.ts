import { Controller, Post } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AppEvents } from "../common/events/all-app.events";
import { NotificationDebugEvent } from "../common/events/notification-debug.event";

@Controller("notification")
export class NotificationController {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  @Post("debug")
  sendDebugNotification() {
    this.eventEmitter.emit(
      AppEvents.DEBUG_NOTIFIATION,
      new NotificationDebugEvent(),
    );
    return {
      message: "Debug notification sent successfully",
    };
  }
}
