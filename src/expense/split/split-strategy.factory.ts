import { BadRequestException, Injectable } from "@nestjs/common";
import { SplitStrategy } from "../../../generated/prisma/client/enums";
import { EqualSplitStrategy } from "./equal-split.strategy";
import { ExactSplitStrategy } from "./exact-split.strategy";
import { PercentageSplitStrategy } from "./percentage-split.strategy";

@Injectable()
export class SplitStrategyFactory {
  constructor(
    private readonly equalSplitStrategy: EqualSplitStrategy,
    private readonly exactSplitStrategy: ExactSplitStrategy,
    private readonly percentageSplitStrategy: PercentageSplitStrategy,
  ) {}

  getStrategy(type: SplitStrategy) {
    if (!type) throw new BadRequestException("Split strategy type is required");

    switch (type) {
      case "EQUAL":
        return this.equalSplitStrategy;
      case "EXACT":
        return this.exactSplitStrategy;
      case "PERCENTAGE":
        return this.percentageSplitStrategy;
      default:
        throw new BadRequestException(`Invalid split strategy type: ${type}`);
    }
  }
}
