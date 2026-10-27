# Transaction Ledger API

A backend API for a simple transaction ledger system built with **NestJS**, **TypeORM**, and **SQLite**.

## Tech Stack

- **Framework**: NestJS (Node.js + TypeScript)
- **ORM**: TypeORM
- **Database**: SQLite (via better-sqlite3)
- **Validation**: class-validator + class-transformer
- **API Docs**: Swagger / OpenAPI (`@nestjs/swagger`)

## Prerequisites

- Node.js >= 18
- npm >= 9

## Setup & Run

```bash
# Install dependencies
npm install

# Copy the example env file (defaults work out of the box for local/SQLite)
cp .env.example .env

# Run in development mode (with hot-reload)
npm run start:dev

# Run in production mode
npm run build
npm run start:prod
```

### Environment variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port the API listens on |
| `DATABASE_PATH` | `database.sqlite` | Path to the SQLite database file |

`.env` is gitignored since it's meant to hold environment-specific/secret values (e.g. a different `DATABASE_PATH` per environment). `.env.example` is committed as the template.

The server starts at `http://localhost:3000/api`

Interactive Swagger docs: `http://localhost:3000/api/docs`
Raw OpenAPI JSON: `http://localhost:3000/api/docs-json`
Health check: `http://localhost:3000/api/health`

The SQLite database file (`database.sqlite`) is created automatically on first run.

## Project Structure

```
src/
├── main.ts                          # App bootstrap with validation pipes
├── app.module.ts                    # Root module: loads ConfigModule + TypeOrmModule via db.config.ts
├── config/
│   └── db.config.ts                 # Builds TypeOrmModuleOptions from ConfigService (.env)
├── entities/
│   ├── account.entity.ts            # Account entity
│   └── transaction.entity.ts        # Transaction entity with unique constraint
├── accounts/
│   ├── accounts.module.ts
│   ├── accounts.controller.ts       # POST /accounts, GET /accounts/:id, GET /accounts/:id/balance
│   ├── accounts.service.ts
│   └── dto/
│       └── create-account.dto.ts
├── transactions/
│   ├── transactions.module.ts
│   ├── transactions.controller.ts   # POST /transactions, GET /transactions/account/:accountId
│   ├── transactions.service.ts      # Atomic balance update + transaction insert, race-safe
│   └── dto/
│       ├── create-transaction.dto.ts
│       └── get-transactions.dto.ts
├── transfers/
│   ├── transfers.module.ts
│   ├── transfers.controller.ts      # POST /transfers
│   ├── transfers.service.ts         # Atomic transfer between accounts
│   └── dto/
│       └── create-transfer.dto.ts
├── health/
│   ├── health.module.ts
│   └── health.controller.ts         # GET /health (checks DB connectivity)
└── filters/
    └── http-exception.filter.ts     # Global exception filter
```

## API Documentation

### 1. Create Account

**POST** `/api/accounts`

Request:
```json
{
  "name": "John Doe"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "balance": 0,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

- `name` is required
- `balance` is always initialized to 0 (client cannot set it)
- Extra fields are rejected (`forbidNonWhitelisted`)

### 2. Get Account

**GET** `/api/accounts/:id`

Response (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "balance": 100,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Get Account Balance

**GET** `/api/accounts/:id/balance`

Response (200):
```json
{
  "success": true,
  "data": {
    "account_id": "uuid",
    "balance": 100
  }
}
```

### 4. Add Transaction

**POST** `/api/transactions`

Request:
```json
{
  "account_id": "uuid",
  "type": "credit",
  "amount": 100,
  "description": "Salary deposit",
  "reference_id": "TXN001"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "account_id": "uuid",
    "type": "credit",
    "amount": 100,
    "description": "Salary deposit",
    "reference_id": "TXN001",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

**Transaction Rules:**
- `type` must be `"credit"` or `"debit"`
- `amount` must be greater than 0
- `reference_id` must be unique per account (same `reference_id` can be used across different accounts)
- Debit rejected if insufficient balance (400)
- Duplicate `reference_id` for same account returns 409 with existing transaction details
- Transaction creation and balance update are atomic

### 5. Get Transaction History

**GET** `/api/transactions/account/:accountId`

Query Parameters:
| Parameter | Type   | Default | Description                        |
|-----------|--------|---------|------------------------------------|
| `type`    | string | —       | Filter by `credit` or `debit`      |
| `page`    | number | 1       | Page number (min: 1)               |
| `limit`   | number | 10      | Items per page (min: 1)            |

Response (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "account_id": "uuid",
      "type": "credit",
      "amount": 100,
      "description": "Deposit",
      "reference_id": "TXN001",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "page_size": 10,
    "total_records": 4,
    "total_pages": 1
  }
}
```

- Sorted by `created_at` in **descending** order (latest first)
- Supports filtering by transaction type
- Returns pagination metadata

### 6. Money Transfer (Bonus)

**POST** `/api/transfers`

Request:
```json
{
  "from_account_id": "uuid",
  "to_account_id": "uuid",
  "amount": 30,
  "description": "Payment",
  "reference_id": "TRANSFER001"
}
```

Response (201):
```json
{
  "success": true,
  "message": "Transfer completed successfully",
  "data": {
    "from_account": { "id": "uuid", "balance": 70 },
    "to_account": { "id": "uuid", "balance": 80 },
    "debit_transaction": { "id": "uuid", "amount": 30, "reference_id": "TRANSFER001" },
    "credit_transaction": { "id": "uuid", "amount": 30, "reference_id": "TRANSFER001" }
  }
}
```

**Transfer Rules:**
- Source and destination must be different accounts
- Both accounts must exist
- Source must have sufficient balance
- Debit + credit + balance updates are **atomic** (all-or-nothing)
- Duplicate `reference_id` check on both accounts

## Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Description of the error"
}
```

| Status Code | Scenario                                          |
|-------------|---------------------------------------------------|
| 400         | Validation error, insufficient balance, bad input |
| 404         | Account not found                                 |
| 409         | Duplicate reference_id for same account           |
| 500         | Internal server error                             |

## Data Integrity

- **Atomicity**: Transaction creation and balance updates happen in a single database transaction. If either fails, both are rolled back.
- **Immutability**: Transactions cannot be edited or deleted via the API. Only `POST` (create) and `GET` (read) endpoints exist for transactions.
- **Balance Consistency**: Account balance always equals the sum of all successful credit and debit transactions.
- **Unique Constraints**: Database-level unique constraint on `(account_id, reference_id)` prevents duplicate transactions.
- **Concurrency safety**: balance changes use a single atomic conditional `UPDATE` — e.g. `UPDATE accounts SET balance = balance - :amount WHERE id = :id AND balance >= :amount` — instead of the classic "read balance in app code, decide, write it back" pattern. The sufficiency check and the write happen in one SQL statement, so there is no gap between reading and writing for a concurrent request to interleave a stale value into (a lost update). `result.affected === 0` reliably distinguishes "insufficient balance" from a no-op. No application-level locking is used. The duplicate-`reference_id` check has the same shape: an app-level check gives a fast, friendly 409 in the common case, backstopped by the database's own `UNIQUE(account_id, reference_id)` constraint, which is caught and translated to the same 409 response if two requests ever race past the app-level check. Verified with live concurrency tests: 15 concurrent credits on one account all applied correctly (balance exactly `sum`); two concurrent debits/transfers that together exceed the balance resulted in exactly one success and one clean `400`, never a corrupted balance; two concurrent requests with the same `reference_id` resulted in exactly one `201` and one `409`.

## Assumptions

1. Account IDs are auto-generated UUIDs (v4).
2. Transaction amounts support up to 2 decimal places (currency-level precision).
3. The initial balance of every new account is 0 and cannot be overridden by the client.
4. SQLite is used for simplicity — suitable for local development and assessment purposes. For production, swap to PostgreSQL/MySQL by changing the TypeORM config.
5. Pagination defaults to page 1 with 10 items per page if not specified.
6. For the money transfer feature, the same `reference_id` is used for both the debit and credit transactions created during the transfer.
7. Transactions are immutable — there are no PUT/PATCH/DELETE endpoints for transactions.
