import { IsEnum, IsNotEmpty, IsUUID } from "class-validator";
import { NotificationType } from "../../../generated/prisma/client/enums";

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsEnum(NotificationType)
  type!: NotificationType;
  @IsUUID()
  @IsNotEmpty()
  groupId!: string;
  @IsNotEmpty()
  receiptIds!: string[];
  @IsNotEmpty()
  payload!: Record<string, string>;
}
