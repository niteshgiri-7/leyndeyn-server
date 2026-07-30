import { NotificationType } from "../../../generated/prisma/client/enums";

interface Formatted {
  title: string;
  body: string;
}

const formatNotification = (
  type: NotificationType,
  payload: Record<string, string>,
): Formatted => {
  switch (type) {
    case "EXPENSE_ADDED":
      return {
        title: "New expense",
        body: `${payload.amount} added ₨${payload.amount}${payload.groupName ? ` in ${payload.groupName}` : ""}`,
      };
    case "EXPENSE_UPDATED":
      return {
        title: "Expense updated",
        body: `${payload.actorName} updated an expense in ${payload.groupName ?? "a group"}`,
      };
    case "EXPENSE_DELETED":
      return {
        title: "Expense deleted",
        body: `${payload.actorName} removed an expense in ${payload.groupName ?? "a group"}`,
      };
    case "ADDED_TO_GROUP":
      return {
        title: "Added to group",
        body: `${payload.actorName} added you to ${payload.groupName}`,
      };
    case "FRIEND_ADDED":
      return {
        title: "New friend",
        body: `${payload.actorName} added you as a friend`,
      };
    case "SETTLEMENT_RECORDED":
      return {
        title: "Settlement recorded",
        body: `${payload.actorName} settled ₨${payload.amount} with you`,
      };
  }
};

export default formatNotification;
