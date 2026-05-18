# Leyndeyn Server

Backend service for the Leyndeyn app built with NestJS and Prisma.

## Completed Features

### Authentication

- Email/password signup with hashed password storage
- Email/password login
- JWT access and refresh token issuance
- JWT guard for protected routes

### Users

- Fetch all users
- Fetch user by ID

### Friends

- Send friend request
- Cancel or reject friend request
- Accept friend request
- List all friends for a user
- List received friend requests by status

### Groups

- Create group
- Update group
- Delete group
- Get group by ID
- List all groups for a user

### Group Members

- Add member to group
- Remove member from group
- List all group members
- Admin and permission enforcement for group actions

### Categories

- Create category
- Update category
- Delete category
- Get category by ID with access checks
- List categories by scope (PERSONAL, FRIENDSHIP, GROUP)

### Budgets

- Create budget for a category
- Update budget
- Delete budget
- Get budget by ID
- List budgets for a category
- Access control for managing group budgets

### Expenses

- Create expense
- Update expense
- Delete expense
- Get expense by ID
- List expenses by category
- List personal expenses
- List group expenses
- List friendship expenses
- List all expenses for a user
- Optional date range filtering for expense queries

### API Infrastructure

- Global request validation with whitelisting and transformation
- Standardized response envelope via global interceptor
- Prisma exception filter

## Project Setup

```bash
npm install
```

## Run the Service

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

## Tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```
