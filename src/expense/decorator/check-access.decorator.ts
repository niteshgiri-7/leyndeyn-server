import { SetMetadata } from "@nestjs/common";
import { RESOURCE_KEY, ResourceType } from "../guard/manage-expense.guard";

export const CheckAccess = (resource: ResourceType) =>
  SetMetadata(RESOURCE_KEY, resource);
