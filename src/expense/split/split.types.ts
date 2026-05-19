export interface CalculatedSplit {
  userId: string;
  amount: number;
}

export interface IParticipant {
  userId: string;
  percentage?: number;
  exactAmount?: number;
}

export interface SplitCalculationInput {
  amount: number;
  participants: IParticipant[];
}

export interface ISplitStrategy {
  calculate(input: SplitCalculationInput): CalculatedSplit[];
}
