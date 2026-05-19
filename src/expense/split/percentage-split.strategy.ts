import { BadRequestException, Injectable } from "@nestjs/common";
import {
  CalculatedSplit,
  ISplitStrategy,
  SplitCalculationInput,
} from "./split.types";

@Injectable()
export class PercentageSplitStrategy implements ISplitStrategy {
  calculate(input: SplitCalculationInput): CalculatedSplit[] {
    const { amount, participants } = input;

    const totalPercentage = participants?.reduce(
      (sum, participant) => sum + (participant?.percentage ?? 0),
      0,
    );

    if (totalPercentage !== 100)
      throw new BadRequestException(
        "Total percentage must be equal to 100 for percentage split strategy",
      );

    return participants.map((p) => ({
      userId: p.userId,
      amount: ((p.percentage ?? 0) * amount) / 100,
    }));
  }
}
