import { Body, Controller, Post } from "@nestjs/common";
import { DevicesService } from "./devices.service";
import { RegisterDeviceDto } from "./dto/register-device.dto";

@Controller("device")
export class DevicesController {
  constructor(private readonly deviceService: DevicesService) {}
  @Post("register")
  async registerDevice(@Body() data: RegisterDeviceDto) {
    return await this.deviceService.upsertToken(data);
  }
}
