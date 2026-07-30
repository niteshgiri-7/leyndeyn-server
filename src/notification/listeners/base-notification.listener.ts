import { Logger } from "@nestjs/common";

export abstract class BaseEventListener {
  protected abstract readonly logger: Logger;

  protected async safeHandle(fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.error(
        `Failed to process event in ${this.constructor.name}`,
        err instanceof Error ? err.stack : err,
      );
    }
  }
}
