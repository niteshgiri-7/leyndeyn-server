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
- List categories by scope (PERSONAL, GROUP)

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

- show my total expenses all over the groups,friends and personal for this week, this month filtered by category,group,friend
- this also applies for the expenses where I am participant
- show budget vs actual expense graph
- show a graph based on budget and current expense so that user know if he is spending on balance and don't run out of budget at the end of month applies to both user and group.

- backend todo
- allow adding profile picture
- send email verification code

notification todo

- send notification on expense addition. (ask the participant to confirm the expense or raise dispute)
- send notification when friend request arrives.
- send notification when new user joins a group.
- App todo
- for client side, make the filters work. ........DONE
- show create category and track budget instead of currently showing directly create budget.......DONE
- create,update and delete personal category ............DONE.
- create, update and edit friend and group category ...........DONE
- add budget from the category card. ..............DONE
- create a notification page
- show no settlements pending in the settlements and balances card if net is 0 ....DONE
- check the graphpacecard.
- Oauth2

- read the notification and show the app pop up to add the expense form, if possible populate the form with the relevant data.

- add a profile picture

- last priority, make the app functional in offline
