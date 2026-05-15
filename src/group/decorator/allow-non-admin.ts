import { SetMetadata } from "@nestjs/common";

export const ALLOW_NON_ADMIN = () => SetMetadata("allow_non_admin", true);
