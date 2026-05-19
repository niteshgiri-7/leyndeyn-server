import { BadRequestException, Injectable } from "@nestjs/common";
import {
  CalculatedSplit,
  ISplitStrategy,
  SplitCalculationInput,
} from "./split.types";

@Injectable()
export class EqualSplitStrategy implements ISplitStrategy {
  calculate(input: SplitCalculationInput): CalculatedSplit[] {
    const { amount, participants } = input;

    if (participants?.length === 0)
      throw new BadRequestException(
        "Participants can't be empty for equal split strategy",
      );

    const splitAmount = amount / participants.length;

    return participants.map((p) => ({
      userId: p.userId,
      amount: splitAmount,
    }));
  }
}
