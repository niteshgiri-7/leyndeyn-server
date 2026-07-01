# Leyndeyn Server — Progression Tracker

> Running tally of completed and incomplete features for the Leyndeyn backend service (NestJS + Prisma + PostgreSQL).

---

## ✅ Completed Features

### Infrastructure & Project Setup

| Item                                         | Notes                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| NestJS v11 project with TypeScript + Express | `nest-cli.json`, `tsconfig.json`                                                                             |
| PostgreSQL via Prisma ORM                    | 9 models across 10 schema files, 7 applied migrations                                                        |
| Docker Compose                               | Services: `app`, `postgres` (16), `redis` (7)                                                                |
| Dockerfile                                   | Multi‑stage Node 20 Alpine build                                                                             |
| Code quality tooling                         | ESLint (flat config), Prettier, Husky, lint‑staged                                                           |
| Response envelope interceptor                | `src/common/interceptors/transform.interceptor.ts` — wraps all responses in `{ success, data }`              |
| Global `ValidationPipe`                      | Whitelisting + transformation enabled in `main.ts`                                                           |
| `ClassSerializerInterceptor`                 | Registered globally for serialization                                                                        |
| Prisma exception filter                      | `src/prisma-client-exception/prisma-client-exception.filter.ts` — maps P2002→409, P2025→404, P2003→400, etc. |
| Repository pattern                           | `IRepository<T>` interface + `UserRepository` implementation                                                 |

### Authentication

| Endpoint                        | Status                                                        |
| ------------------------------- | ------------------------------------------------------------- |
| `POST /auth/signup`             | ✅ Done — bcrypt hashing, JWT access + refresh token issuance |
| `POST /auth/login`              | ✅ Done — credential validation, JWT pair returned            |
| JWT auth guard (`JwtAuthGuard`) | ✅ Done — validates Bearer token                              |
| `@CurrentUser()` decorator      | ✅ Done — extracts JWT payload into handler parameter         |

### User Management

| Endpoint        | Status                                            |
| --------------- | ------------------------------------------------- |
| `GET /user/all` | ✅ Done (no admin guard yet — see TODO)           |
| `GET /user/:id` | ✅ Done (no self/group validation yet — see TODO) |

### Groups & Members

| Endpoint                                      | Status                                             |
| --------------------------------------------- | -------------------------------------------------- |
| `POST /group`                                 | ✅ Done                                            |
| `GET /group/all`                              | ✅ Done — lists groups for authenticated user      |
| `GET /group/:groupId`                         | ✅ Done                                            |
| `PUT /group/:groupId`                         | ✅ Done (admin only)                               |
| `DELETE /group/:groupId`                      | ✅ Done (admin only)                               |
| `GET /group/:groupId/members`                 | ✅ Done                                            |
| `POST /group/:groupId/members`                | ⚠️ **Route conflict** — see Incomplete section     |
| `DELETE /group/:groupId/members/:userId`      | ✅ Done (admin only)                               |
| `POST /group/:groupId/members/:memberId/role` | ✅ Done (admin only)                               |
| Invitation code generation & join             | ✅ Done (service level, route blocked by conflict) |
| `GroupAdminGuard` + `@ALLOW_NON_ADMIN()`      | ✅ Done — flexible role‑based access               |

### Categories

| Endpoint                       | Status                               |
| ------------------------------ | ------------------------------------ |
| `POST /category/personal`      | ✅ Done                              |
| `POST /category/group`         | ✅ Done (admin/manager only)         |
| `GET /category/all`            | ✅ Done                              |
| `GET /category/:categoryId`    | ✅ Done                              |
| `PUT /category/:categoryId`    | ✅ Done (admin/manager only)         |
| `DELETE /category/:categoryId` | ✅ Done (admin/manager only)         |
| `GroupCategoryManagerGuard`    | ✅ Done — enforces group permissions |

### Budgets

| Endpoint                                        | Status                       |
| ----------------------------------------------- | ---------------------------- |
| `POST /category/:categoryId/budget`             | ✅ Done (admin/manager only) |
| `GET /category/:categoryId/budget/all`          | ✅ Done                      |
| `GET /category/:categoryId/budget/:budgetId`    | ✅ Done                      |
| `PUT /category/:categoryId/budget/:budgetId`    | ✅ Done (admin/manager only) |
| `DELETE /category/:categoryId/budget/:budgetId` | ✅ Done (admin/manager only) |
| `ManageBudgetGuard`                             | ✅ Done                      |
| Unique constraint `(categoryId, resetStrategy)` | ✅ Enforced at DB level      |

### Expenses (Split Strategies)

| Endpoint                                           | Status                               |
| -------------------------------------------------- | ------------------------------------ |
| `POST /expense/personal`                           | ✅ Done                              |
| `GET /expense/personal`                            | ✅ Done                              |
| `PUT /expense/personal/:expenseId`                 | ✅ Done                              |
| `POST /expense/group/:groupId`                     | ✅ Done                              |
| `PUT /expense/:expenseId/group/:groupId`           | ✅ Done                              |
| `GET /expense/group/:groupId`                      | ✅ Done                              |
| `GET /expense/group/:groupId/category/:categoryId` | ✅ Done                              |
| `GET /expense/:expenseId`                          | ✅ Done                              |
| `DELETE /expense/:expenseId`                       | ✅ Done                              |
| `GET /expense` (all user expenses)                 | ✅ Done                              |
| Split strategy: **EQUAL**                          | ✅ Done — divides amount equally     |
| Split strategy: **EXACT**                          | ✅ Done — validates sum equals total |
| Split strategy: **PERCENTAGE**                     | ✅ Done — validates sum equals 100%  |
| Strategy pattern via `SplitStrategyFactory`        | ✅ Done                              |
| `ManageExpenseGuard` + `@CheckAccess()`            | ✅ Done                              |
| Optional date‑range filtering                      | ✅ Done via `DateRangeDto`           |

### Expense Settlement (Debt Repayment)

| Endpoint                                               | Status                                               |
| ------------------------------------------------------ | ---------------------------------------------------- |
| `GET /settlement/group/:groupId`                       | ✅ Done — calculates simplified net debt settlements |
| `POST /settlement/group/:groupId/`                     | ✅ Done — records a new settlement transaction       |
| `GET /settlement/group/:groupId/recent-transactions`   | ✅ Done — list recent settlements (opt. filter)      |
| `POST /settlement/group/:groupId/:settlementId/status` | ✅ Done — update status (receiver only)              |
| Balance calculation (`calculateBalances`)              | ✅ Done — net balance per user from expenses         |
| Debt simplification (`simplifyDebts`)                  | ✅ Done — greedy matching debtors → creditors        |
| Tests for settlements                                  | ✅ Done                                              |

### Tests

| Area            | Count                                                              |
| --------------- | ------------------------------------------------------------------ |
| Unit test files | 16 files covering controllers, services, filters, repository       |
| E2E test files  | 1 (`test/app.e2e-spec.ts`)                                         |
| Test utilities  | Mock factories for `PrismaService`, `UserRepository`, `JwtService` |
| Coverage script | `npm run test:cov` configured                                      |

---

## ❌ Incomplete / Missing Features

### Route Conflict in GroupMemberController — BUG

**File:** `src/group/group-member.controller.ts:25` and `:37`

Two `@Post()` handlers are mapped to the same path `/group/:groupId/members`:

1. `addMemberToGroup()` — expects `{ userId, role }`
2. `joinGroupByInvitationCode()` — expects `{ invitationCode }`

The second handler is **unreachable**. One of them needs a distinct route (e.g., `POST /group/:groupId/members/join-by-code`).

### Refresh Token Rotation — NOT STARTED

- ✅ Refresh tokens are generated on login (7d) and signup (14d)
- ❌ No `POST /auth/refresh` endpoint to rotate tokens
- ❌ No token blacklist / revocation mechanism

### OAuth / Social Login — NOT STARTED

- ✅ `Account` Prisma model exists for provider‑linked accounts
- ✅ `GoogleLoginDto` defined in `src/user/dto/user.dto.ts`
- ❌ No OAuth strategy or login flow implemented

### Email Verification — NOT STARTED

- ✅ `isVerified` field on `User` model (defaults to `false`)
- ❌ No verification email sending
- ❌ No email verification endpoint

### Redis Integration — NOT STARTED

- ✅ Redis container in `docker-compose.yml` (port 6379)
- ✅ `REDIS_URL` in `.env.example`
- ❌ Redis not imported or used anywhere in application code
- ❌ No caching, session store, rate limiting, or token blacklist using Redis

### User Endpoint Access Control — TODO

**File:** `src/user/user.controller.ts`

| Line                      | TODO                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| `GET /user/all` (line 8)  | `//TODO: add admin validation here later`                                                     |
| `GET /user/:id` (line 14) | `//TODO: add validation(must be self or same group member) before returning the user details` |

### Missing Unit Tests

The following guards, strategies, and interceptors lack dedicated unit tests:

| File                                                 | Tests   |
| ---------------------------------------------------- | ------- |
| `src/group/guard/group-admin.guard.ts`               | ❌ None |
| `src/expense/guard/manage-expense.guard.ts`          | ❌ None |
| `src/budget/guard/manage-budget.guard.ts`            | ❌ None |
| `src/category/guard/group-category-manager.guard.ts` | ❌ None |
| `src/expense/split/equal-split.strategy.ts`          | ❌ None |
| `src/expense/split/exact-split.strategy.ts`          | ❌ None |
| `src/expense/split/percentage-split.strategy.ts`     | ❌ None |
| `src/expense/split/split-strategy.factory.ts`        | ❌ None |
| `src/common/interceptors/transform.interceptor.ts`   | ❌ None |
| `src/auth/guards/jwt-auth.guard.ts`                  | ❌ None |
