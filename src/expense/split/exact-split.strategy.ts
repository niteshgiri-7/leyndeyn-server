import { BadRequestException, Injectable } from "@nestjs/common";
import {
  CalculatedSplit,
  ISplitStrategy,
  SplitCalculationInput,
} from "./split.types";

@Injectable()
export class ExactSplitStrategy implements ISplitStrategy {
  calculate(input: SplitCalculationInput): CalculatedSplit[] {
    const { amount, participants } = input;

    const totalSplitAmount = participants.reduce(
      (total, participant) => total + (participant.exactAmount ?? 0),
      0,
    );

    if (totalSplitAmount !== amount)
      throw new BadRequestException(
        "Total split amount must be equal to the expense amount for exact split strategy",
      );

    return participants.map((p) => ({
      userId: p.userId,
      amount: p.exactAmount ?? 0,
    }));
  }
}
