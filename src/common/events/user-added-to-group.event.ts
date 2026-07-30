export class UserAddedToGroupEvent {
  constructor(
    public readonly userIds: string[],
    public readonly groupId: string,
    public readonly groupName: string,
    public readonly actorId: string,
    public readonly actorName: string,
  ) {}
}
