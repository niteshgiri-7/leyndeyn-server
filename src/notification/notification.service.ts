import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateNotificationDto } from "./dto/create-notification.dto";
import formatNotification from "./formatters/notification-formatter";
import type { NotificationSender } from "./interfaces/notification-sender.interface";
import { NOTIFICATION_SENDER } from "./notification.constants";
import { NotificationEventStatus } from "../../generated/prisma/client/enums";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Inject(NOTIFICATION_SENDER) private readonly sender: NotificationSender,
    private readonly prisma: PrismaService,
  ) {}

  async notifyUser(data: CreateNotificationDto, actorId: string) {
    if (data.receiptIds.length === 0)
      throw new BadRequestException("No receiptIds provided for notification");

    const { title, body } = formatNotification(data.type, data.payload);

    const event = await this.prisma.$transaction(async (tx) => {
      const created = await this.prisma.notificationEvent.create({
        data: {
          type: data.type,
          payload: data.payload,
          title,
          actorId,
          groupId: data.groupId,
        },
      });

      await tx.notification.createMany({
        data: data.receiptIds.map((userId) => ({
          eventId: created.id,
          userId,
          status: NotificationEventStatus.PENDING,
        })),
      });

      return created;
    });

    await this.dispatchPush(event.id, data.receiptIds, data.type, title, body);
  }

  async debugSend() {
    const response = await this.sender.debugSend();
    return response;
  }

  private async dispatchPush(
    eventId: string,
    userIds: string[],
    type: string,
    title: string,
    body: string,
  ) {
    const devices = await this.prisma.deviceToken.findMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    if (devices.length === 0) return;

    const tokenToUser = new Map(
      devices.map((device) => [device.token, device.userId]),
    );

    const result = await this.sender.send({
      tokens: devices.map((device) => device.token),
      title,
      body,
      data: {
        type,
        eventId,
      },
      imageUrl: null,
    });
    console.log("notification result:", result);
    if (result.failureCount > 0) {
      this.logger.warn(
        `Successfullly sent ${result.successCount}, ${result.failureCount} failed for event ${eventId} with errors: ${result.errors.join(", ")}`,
      );
    }

    const succeededUsers = [
      ...new Set(
        result.results
          .filter((r) => r.success)
          .map((r) => tokenToUser.get(r.token))
          .filter((id): id is string => id !== undefined),
      ),
    ];

    const failedUsers = [
      ...new Set(
        result.results
          .filter((r) => !r.success)
          .map((r) => tokenToUser.get(r.token))
          .filter((id): id is string => id !== undefined),
      ),
    ];

    await Promise.all([
      succeededUsers.length > 0 && this.markDelivered(eventId, succeededUsers),
      failedUsers.length > 0 && this.markFailed(eventId, failedUsers),
      result.invalidTokens.length > 0 &&
        this.cleanUpInvalidTokens(result.invalidTokens),
    ]);
  }

  private async markDelivered(eventId: string, succeededUsers: string[]) {
    await this.prisma.notification.updateMany({
      where: { eventId, userId: { in: [...succeededUsers] } },
      data: {
        status: NotificationEventStatus.DELIVERED,
      },
    });
  }

  private async markFailed(eventId: string, failedUsers: string[]) {
    await this.prisma.notification.updateMany({
      where: { eventId, userId: { in: [...failedUsers] } },
      data: {
        status: NotificationEventStatus.FAILED,
      },
    });
  }

  private async cleanUpInvalidTokens(invalidTokens: string[]) {
    await this.prisma.deviceToken.deleteMany({
      where: {
        token: { in: [...invalidTokens] },
      },
    });
  }
}
