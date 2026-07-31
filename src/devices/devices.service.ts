import { Injectable } from "@nestjs/common";
import { RegisterDeviceDto } from "./dto/register-device.dto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}
  async upsertToken(data: RegisterDeviceDto) {
    const { platform, token, userId } = data;
    return this.prisma.deviceToken.upsert({
      where: { token },
      update: { userId, platform, updatedAt: new Date() },
      create: { userId, token, platform },
    });
  }
}
