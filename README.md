# Demo Credit Wallet Service

A RESTful API for a mobile lending app wallet service, built with **Node.js**, **TypeScript**, **KnexJS**, and **MySQL**.

Users can create accounts, fund their wallets, transfer funds to other users, and withdraw funds. The Lendsqr Adjutor Karma blacklist is enforced during onboarding.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [E-R Diagram](#e-r-diagram)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Setup & Installation](#setup--installation)
- [Running Tests](#running-tests)
- [Design Decisions](#design-decisions)

---

## Tech Stack

| Technology   | Purpose              |
| ------------ | -------------------- |
| Node.js (LTS)| Runtime              |
| TypeScript   | Type safety          |
| Express.js   | HTTP framework       |
| KnexJS       | SQL query builder/ORM|
| MySQL        | Production database  |
| SQLite       | Test database (in-memory) |
| Jest         | Testing framework    |
| Supertest    | HTTP integration tests|
| bcryptjs     | Password hashing     |
| axios        | HTTP client (Adjutor API) |

---

## E-R Diagram

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────────┐
│      users       │       │     wallets      │       │    transactions      │
├──────────────────┤       ├──────────────────┤       ├──────────────────────┤
│ id (PK)          │──1:1──│ id (PK)          │──1:N──│ id (PK)              │
│ email (UNIQUE)   │       │ user_id (FK, UQ) │       │ wallet_id (FK)       │
│ first_name       │       │ balance (15,2)   │       │ type (ENUM)          │
│ last_name        │       │ created_at       │       │ amount (15,2)        │
│ password         │       │ updated_at       │       │ reference (UNIQUE)   │
│ created_at       │       └──────────────────┘       │ balance_before (15,2)│
│ updated_at       │                                  │ balance_after (15,2) │
└──────────────────┘                                  │ metadata (JSON)      │
                                                      │ created_at           │
                                                      └──────────────────────┘
```

**Relationships:**
- `users` → `wallets` : **One-to-One** (each user has exactly one wallet)
- `wallets` → `transactions` : **One-to-Many** (each wallet can have many transactions)

---

## Database Schema

### users
| Column     | Type          | Constraints          |
| ---------- | ------------- | -------------------- |
| id         | INT (auto)    | PRIMARY KEY          |
| email      | VARCHAR(255)  | NOT NULL, UNIQUE     |
| first_name | VARCHAR(100)  | NOT NULL             |
| last_name  | VARCHAR(100)  | NOT NULL             |
| password   | VARCHAR(255)  | NOT NULL             |
| created_at | TIMESTAMP     | DEFAULT NOW          |
| updated_at | TIMESTAMP     | DEFAULT NOW          |

### wallets
| Column     | Type          | Constraints                    |
| ---------- | ------------- | ------------------------------ |
| id         | INT (auto)    | PRIMARY KEY                    |
| user_id    | INT (unsigned)| NOT NULL, UNIQUE, FK → users   |
| balance    | DECIMAL(15,2) | NOT NULL, DEFAULT 0.00         |
| created_at | TIMESTAMP     | DEFAULT NOW                    |
| updated_at | TIMESTAMP     | DEFAULT NOW                    |

### transactions
| Column         | Type           | Constraints                    |
| -------------- | -------------- | ------------------------------ |
| id             | INT (auto)     | PRIMARY KEY                    |
| wallet_id      | INT (unsigned) | NOT NULL, FK → wallets         |
| type           | ENUM           | 'funding', 'transfer', 'withdrawal' |
| amount         | DECIMAL(15,2)  | NOT NULL                       |
| reference      | VARCHAR(255)   | NOT NULL, UNIQUE               |
| balance_before | DECIMAL(15,2)  | NOT NULL                       |
| balance_after  | DECIMAL(15,2)  | NOT NULL                       |
| metadata       | JSON           | NULLABLE                       |
| created_at     | TIMESTAMP      | DEFAULT NOW                    |

---

## API Endpoints

### Authentication

| Method | Endpoint            | Description      | Auth Required |
| ------ | ------------------- | ---------------- | ------------- |
| POST   | `/api/auth/register`| Create account   | No            |
| POST   | `/api/auth/login`   | Login            | No            |

### Wallet

| Method | Endpoint                 | Description           | Auth Required |
| ------ | ------------------------ | --------------------- | ------------- |
| POST   | `/api/wallet/fund`       | Fund wallet           | Yes           |
| POST   | `/api/wallet/transfer`   | Transfer to user      | Yes           |
| POST   | `/api/wallet/withdraw`   | Withdraw funds        | Yes           |
| GET    | `/api/wallet/balance`    | Get wallet balance    | Yes           |
| GET    | `/api/wallet/transactions`| Get transaction history| Yes          |

### Request/Response Examples

#### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "password": "securePassword123"
}
```
```json
{
  "status": "success",
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": 1,
      "email": "john@example.com",
      "first_name": "John",
      "last_name": "Doe"
    },
    "token": "eyJhbGciOi..."
  }
}
```

#### Fund Wallet
```bash
POST /api/wallet/fund
Authorization: Bearer <token>
Content-Type: application/json

{ "amount": 5000 }
```

#### Transfer
```bash
POST /api/wallet/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "recipient_email": "jane@example.com",
  "amount": 2000
}
```

#### Withdraw
```bash
POST /api/wallet/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{ "amount": 1000 }
```

---

## Project Structure

```
democredits/
├── src/
│   ├── controllers/          # Request handlers
│   │   ├── auth.controller.ts
│   │   └── wallet.controller.ts
│   ├── database/
│   │   ├── connection.ts     # Knex DB instance
│   │   └── migrations/       # DB migration files
│   ├── helpers/
│   │   ├── errors.ts         # Custom error classes
│   │   └── response.ts       # Response formatters
│   ├── interfaces/
│   │   └── index.ts          # TypeScript interfaces & DTOs
│   ├── middlewares/
│   │   ├── auth.middleware.ts     # JWT verification
│   │   ├── error.middleware.ts    # Global error handler
│   │   └── validate.middleware.ts # Request validation
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   └── wallet.routes.ts
│   ├── services/             # Business logic (OOP)
│   │   ├── auth.service.ts
│   │   ├── karma.service.ts
│   │   ├── user.service.ts
│   │   └── wallet.service.ts
│   ├── app.ts                # Express app config
│   └── server.ts             # Entry point
├── __tests__/
│   ├── setup.ts              # Test DB helpers
│   ├── controllers/
│   │   ├── auth.controller.test.ts
│   │   └── wallet.controller.test.ts
│   └── services/
│       ├── auth.service.test.ts
│       ├── user.service.test.ts
│       └── wallet.service.test.ts
├── knexfile.ts
├── jest.config.ts
├── tsconfig.json
├── .env.example
└── package.json
```

---

## Setup & Installation

### Prerequisites
- Node.js (LTS version)
- MySQL server
- npm

### Steps

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd democredits
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your MySQL credentials and Adjutor API key
   ```

4. **Create the database**
   ```sql
   CREATE DATABASE democredit;
   ```

5. **Run migrations**
   ```bash
   npm run migrate
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`.

---

## Running Tests

Tests use an **in-memory SQLite** database, so no MySQL setup is needed.

```bash
npm test
```

**Test coverage:** 65 tests across 5 test suites covering:
- **UserService**: account creation, duplicate handling, lookups
- **WalletService**: funding, transfers (positive & negative), withdrawals, transaction history
- **AuthService**: registration, karma blacklist rejection, login, token generation/verification
- **Auth Controller**: registration validation, duplicate emails, login flows
- **Wallet Controller**: fund/transfer/withdraw/balance/transactions with auth enforcement

---

## Design Decisions

### Architecture
- **Service-oriented OOP** - Business logic lives in service classes (`UserService`, `WalletService`, `AuthService`, `KarmaService`), keeping controllers thin and testable.
- **Dependency injection** - Services accept dependencies via constructor for easy mocking in tests.

### Transaction Scoping
- All financial operations (`fund`, `transfer`, `withdraw`) are wrapped in **Knex database transactions** to ensure atomicity.
- **Row-level locking** (`forUpdate()`) prevents concurrent balance mutation.
- Transfer operations acquire wallet locks in **user ID order** to prevent deadlocks.

### Authentication
- Faux JWT tokens using **HMAC-SHA256** signatures - not a production JWT library, but functionally equivalent for this MVP.
- Token verification includes signature validation and expiration checks.

### Karma Blacklist
- Checked during registration via the Lendsqr Adjutor API.
- **Fail-open strategy**: if the API is unreachable, registration proceeds (so network issues don't block legitimate users).

### Error Handling
- Custom error class hierarchy (`AppError` → `NotFoundError`, `ValidationError`, `InsufficientFundsError`, etc.)
- Global error middleware maps errors to consistent JSON responses with appropriate HTTP status codes.

### Testing Strategy
- **In-memory SQLite** for tests - fast, isolated, no external dependencies.
- Both **unit tests** (service layer) and **integration tests** (HTTP endpoints via Supertest).
- Karma service is **mocked** in tests to avoid external API calls.
