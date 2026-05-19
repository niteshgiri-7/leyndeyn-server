# Data Modeling Review

This document reviews the Prisma schema data model for the application, highlighting the structure, strengths, and potential areas for improvement.

## Overview

The schema represents a finance and expense-sharing application (similar to Splitwise), supporting personal tracking, peer-to-peer (Friend) sharing, and Group sharing. The database of choice is PostgreSQL.

## Core Entities and Relationships

1.  **Users & Authentication (`user.prisma`, `account.prisma`)**
    - Standard user model with authentication capabilities via OAuth (`Account`) or traditional `passwordHash`.
    - **Strengths**: Clean separation of OAuth profiles from the core `User` profile. `cuid()` is used for IDs which is standard and safe.
2.  **Social connections (`friend.prisma`, `group.prisma`, `group-member.prisma`)**
    - **Friends**: Tracks peer-to-peer relationships between users via `requesterId` and `receiverId`. Proper `@@unique` constraints prevent duplicate friendships.
    - **Groups**: Users can form groups with metadata like `allowMembersToInvite`. Associated via `GroupMember` which includes roles (MEMBER, ADMIN).
    - **Strengths**: Explicit many-to-many relationship for Groups handles joining dates and roles perfectly.

3.  **Classification (`category.prisma`, `budget.prisma`)**
    - **Categories**: Used to group expenses. They're scoped via `CategoryScope` (PERSONAL, FRIENDSHIP, GROUP).
    - **Budgets**: Set against a `Category` with a reset strategy (DAILY, WEEKLY, MONTHLY).
    - **Strengths**: Using scopes for Categories is an elegant way to reuse the taxonomy engine across isolated contexts.

4.  **Expense Tracking (`expense.prisma`, `expense-participant.prisma`)**
    - **Expense**: Records a payment made by `spentById` linked to a `Category` and a `SplitStrategy` (EQUAL, EXACT, PERCENTAGE, NONE).
    - **ExpenseParticipant**: Granular tracking mapping the `userId` to the exact `amount` they owe back to `spentBy`.
    - **Strengths**: Calculating the exact `amount` at creation and persisting it as a `Float` in the participant model ensures historical accuracy if percentages or group memberships change later on.

5.  **Debt Resolution (`expense-settlement.prisma`)**
    - **Settlement**: Tracks debt repayments from one user to another within isolated contexts.

## Potential Areas of Concern / Improvements

### 1. The `ExpenseSettlement` Model is overly constrained

Currently, in `expense-settlement.prisma`, both `groupId` and `friendShipId` are mandatory:

```prisma
groupId String
group Group @relation(fields:[groupId],references: [id])

friendShipId String
friendShip Friend @relation(fields:[friendShipId],references:[id])
```
