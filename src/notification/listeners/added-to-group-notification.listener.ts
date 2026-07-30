import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { UserAddedToGroupEvent } from "../../common/events/user-added-to-group.event";
import { NotificationService } from "../notification.service";
import { AppEvents } from "../../common/events/all-app.events";
import { BaseEventListener } from "./base-notification.listener";

@Injectable()
export class AddedToGroupNotificationListener extends BaseEventListener {
  protected readonly logger = new Logger(AddedToGroupNotificationListener.name);
  constructor(private readonly notification: NotificationService) {
    super();
  }

  @OnEvent(AppEvents.GROUP_MEMBER_ADDED)
  async handleUserAddedToGroup(event: UserAddedToGroupEvent) {
    await this.safeHandle(() =>
      this.notification.notifyUser(
        {
          type: "ADDED_TO_GROUP",
          groupId: event.groupId,
          receiptIds: event.userIds,
          payload: {
            groupName: event.groupName,
            actorName: event.actorName,
          },
        },
        event.actorId,
      ),
    );
  }

  @OnEvent(AppEvents.FRIEND_ADDED)
  async handleFriendAdded(event: UserAddedToGroupEvent) {
    await this.safeHandle(() =>
      this.notification.notifyUser(
        {
          type: "FRIEND_ADDED",
          groupId: event.groupId,
          receiptIds: event.userIds,
          payload: {
            groupName: event.groupName,
            actorName: event.actorName,
          },
        },
        event.actorId,
      ),
    );
  }
}
