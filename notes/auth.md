# 🔐 OAuth — Complete Concept Note

## 1. What OAuth actually is (core idea)

OAuth is **NOT login by itself**.

👉 OAuth = a **delegated authorization framework**

It lets an app access a user’s data on another service **without knowing the user’s password**.

---

### Simple analogy

Think of OAuth like a **hotel key card system**:

- You don’t give the hotel your house key (password)
- Instead, you get a **temporary access card**
- That card only allows specific actions (room access, gym, etc.)

---

## 2. Who is involved in OAuth

There are 4 main actors:

### 1. User (Resource Owner)
The person who owns the data.

### 2. Client (Your App)
Example:
- your NestJS backend
- your frontend app

### 3. Authorization Server
Example:
- Google
- GitHub
- Facebook

This handles login + consent.

### 4. Resource Server
API that holds user data (Google Drive, GitHub API, etc.)

---

## 3. OAuth flow (Authorization Code Flow)

## Step 1: User clicks “Login with Google”

Redirect to:  https://accounts.google.com/o/oauth2/auth


---

## Step 2: User logs in

Google authenticates the user.

---

## Step 3: User consent

Example:
> “This app wants access to your email”

---

## Step 4: Redirect back to app
https://yourapp.com/callback?code=abc123


---

## Step 5: Exchange code for tokens

Backend sends code → Google

Response:

```json
{
  "access_token": "xyz",
  "id_token": "jwt_here"
}
Step 6: Extract user identity

From id_token:

Example payload:

{
  "sub": "1049283749283",
  "email": "user@gmail.com",
  "name": "John"
}

👉 sub = unique user ID inside Google

4. OAuth vs Authentication
Concept	Meaning
OAuth	Authorization (access delegation)
OpenID Connect (OIDC)	Authentication (who user is)

👉 “Login with Google” = OAuth + OIDC

5. What YOU build in real apps

OAuth does NOT create users in your DB.

You must map it manually.

6. Prisma schema
model User {
  id       String   @id @default(cuid())
  email    String   @unique
  accounts Account[]
}
model Account {
  id                String @id @default(cuid())
  provider          String
  providerAccountId String

  userId            String
  user              User   @relation(fields: [userId], references: [id])

  @@unique([provider, providerAccountId])
}
7. How you identify the same user

Each provider gives a unique ID:

Provider	Unique ID
Google	sub
GitHub	id
Step 1: Check Account table
(provider + providerAccountId)

If found:
👉 Same user → login

Step 2: If not found

Check email:

If email matches existing user → link account
Else → create new user
8. Full login flow
OAuth login starts
        ↓
Get (provider, providerAccountId, email)
        ↓
Check Account table
        ↓
FOUND → login existing user
        ↓
NOT FOUND
        ↓
Check email in User table
        ↓
MATCH → link account
        ↓
NO MATCH → create new user + account
9. Security concepts
1. Never trust OAuth alone

Always verify tokens.

2. Provider ID is the real identity

Not email.

3. Account linking is sensitive

Wrong linking = security issue.

10. Tokens
Access Token
short-lived
used for API calls
ID Token
JWT
contains user identity
11. Real-world usage in your app

OAuth helps you:

avoid passwords
enable Google/GitHub login
unify identity

But YOU handle:

user creation
account linking
session/JWT creation
12. Mental model
OAuth Provider (Google)
        ↓
Identity Proof (sub, email)
        ↓
Backend (NestJS)
        ↓
User + Account tables
        ↓
App Identity System
13. Final summary

OAuth is:

A secure way to authenticate users via external providers without sharing passwords.

But your backend must:

create users
link accounts
manage identity mapping
