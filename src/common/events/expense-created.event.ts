export class ExpenseCreatedEvent {
  constructor(
    public readonly expenseId: string,
    public readonly groupId: string,
    public readonly payerId: string,
    public readonly payerName: string,
    public readonly amount: number,
    public readonly participantIds: string[],
    public readonly groupName?: string,
  ) {}
}
