# Transaction Ledger API Documentation

Base URL: `http://localhost:3000/api`

All requests/responses are JSON. Run the curl examples in a POSIX shell (Git Bash, WSL, macOS, Linux). On Windows PowerShell use `curl.exe` and escape quotes, or use Postman.

Interactive, always-in-sync docs are also available via Swagger once the server is running:

- Swagger UI: `http://localhost:3000/api/docs`
- Raw OpenAPI 3.0 spec (JSON): `http://localhost:3000/api/docs-json`

## Setup variables for testing

```bash
BASE=http://localhost:3000/api

# Create two accounts and capture their IDs
ACC_A=$(curl -s -X POST $BASE/accounts -H "Content-Type: application/json" -d '{"name":"Alice"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).data.id")
ACC_B=$(curl -s -X POST $BASE/accounts -H "Content-Type: application/json" -d '{"name":"Bob"}'   | node -pe "JSON.parse(require('fs').readFileSync(0)).data.id")
echo $ACC_A $ACC_B
```

## Standard error format

Every error has this shape:

```json
{ "success": false, "statusCode": 400, "error": "Bad Request", "message": "..." }
```

`message` is a string, or an array of strings for validation errors.

| Status | Meaning |
|--------|---------|
| 400 | Validation error, malformed UUID, insufficient balance, same-account transfer |
| 404 | Account not found / unknown route |
| 409 | Duplicate `reference_id` for the same account |
| 500 | Unexpected server error |
| 503 | Health check: database unreachable |

---

## Routes at a glance

| # | Method | Path | Purpose |
|---|--------|------|---------|
| 1 | POST | `/accounts` | Create account |
| 2 | GET | `/accounts/:id` | Get account |
| 3 | GET | `/accounts/:id/balance` | Get balance |
| 4 | POST | `/transactions` | Add credit/debit transaction |
| 5 | GET | `/transactions/account/:accountId` | Transaction history (filter, paginate) |
| 6 | POST | `/transfers` | Transfer between accounts |
| 7 | GET | `/health` | Service + database health check |

There are intentionally no PUT/PATCH/DELETE routes: transactions are immutable (those methods return 404).

---

## 1. Create Account

**POST** `/accounts`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | yes | Non-empty |

`balance`, `id`, `created_at` are system-generated. Sending any other field (e.g. `balance`) is rejected.

```bash
curl -X POST $BASE/accounts \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe"}'
```

**201 response**
```json
{
  "success": true,
  "data": { "id": "43463094-b3b9-4233-a8ca-e2c82b2b01c0", "name": "John Doe", "balance": 0, "created_at": "2026-10-27T14:58:06.000Z" }
}
```

**Error cases**
```bash
# Missing name -> 400 ["Account name is required","name must be a string"]
curl -X POST $BASE/accounts -H "Content-Type: application/json" -d '{}'

# Empty name -> 400
curl -X POST $BASE/accounts -H "Content-Type: application/json" -d '{"name":""}'

# Client tries to set balance -> 400 ["property balance should not exist"]
curl -X POST $BASE/accounts -H "Content-Type: application/json" -d '{"name":"Alice","balance":1000}'

# Non-string name -> 400
curl -X POST $BASE/accounts -H "Content-Type: application/json" -d '{"name":123}'
```

---

## 2. Get Account

**GET** `/accounts/:id`

```bash
curl $BASE/accounts/$ACC_A
```

**200 response**
```json
{
  "success": true,
  "data": { "id": "...", "name": "Alice", "balance": 0, "created_at": "..." }
}
```

**Error cases**
```bash
# Valid UUID, no such account -> 404
curl $BASE/accounts/11111111-1111-4111-8111-111111111111

# Malformed id -> 400 "Validation failed (uuid v 4 is expected)"
curl $BASE/accounts/not-a-uuid
```

---

## 3. Get Account Balance

**GET** `/accounts/:id/balance`

```bash
curl $BASE/accounts/$ACC_A/balance
```

**200 response**
```json
{ "success": true, "data": { "account_id": "...", "balance": 100 } }
```

**Error cases**
```bash
# Unknown account -> 404
curl $BASE/accounts/11111111-1111-4111-8111-111111111111/balance

# Malformed id -> 400
curl $BASE/accounts/not-a-uuid/balance
```

---

## 4. Add Transaction

**POST** `/transactions`

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| account_id | string (UUID v4) | yes | Account must exist |
| type | `"credit"` \| `"debit"` | yes | |
| amount | number | yes | > 0, max 2 decimal places |
| description | string | yes | Non-empty |
| reference_id | string | yes | Unique per account |

The transaction insert and balance update happen in one database transaction. Debits fail if balance is insufficient; failed requests never change the balance.

**Credit**
```bash
curl -X POST $BASE/transactions \
  -H "Content-Type: application/json" \
  -d "{\"account_id\":\"$ACC_A\",\"type\":\"credit\",\"amount\":100,\"description\":\"Deposit\",\"reference_id\":\"REF001\"}"
```

**201 response**
```json
{
  "success": true,
  "data": {
    "id": "07919881-a51d-49ad-b63d-1f302460a379",
    "account_id": "...", "type": "credit", "amount": 100,
    "description": "Deposit", "reference_id": "REF001",
    "created_at": "2026-10-27T14:59:44.000Z"
  }
}
```

**Debit**
```bash
curl -X POST $BASE/transactions \
  -H "Content-Type: application/json" \
  -d "{\"account_id\":\"$ACC_A\",\"type\":\"debit\",\"amount\":30,\"description\":\"Purchase\",\"reference_id\":\"REF002\"}"
```

**Error cases**
```bash
# Insufficient balance -> 400 "Insufficient balance. Current balance: 70, attempted debit: 500"
curl -X POST $BASE/transactions -H "Content-Type: application/json" \
  -d "{\"account_id\":\"$ACC_A\",\"type\":\"debit\",\"amount\":500,\"description\":\"Too much\",\"reference_id\":\"REF003\"}"

# Duplicate reference_id, same account -> 409 (no new row, balance unchanged)
curl -X POST $BASE/transactions -H "Content-Type: application/json" \
  -d "{\"account_id\":\"$ACC_A\",\"type\":\"credit\",\"amount\":10,\"description\":\"Dupe\",\"reference_id\":\"REF001\"}"

# Same reference_id on a DIFFERENT account -> 201 (allowed)
curl -X POST $BASE/transactions -H "Content-Type: application/json" \
  -d "{\"account_id\":\"$ACC_B\",\"type\":\"credit\",\"amount\":200,\"description\":\"Deposit\",\"reference_id\":\"REF001\"}"

# Invalid type -> 400 'Transaction type must be either "credit" or "debit"'
curl -X POST $BASE/transactions -H "Content-Type: application/json" \
  -d "{\"account_id\":\"$ACC_A\",\"type\":\"refund\",\"amount\":10,\"description\":\"x\",\"reference_id\":\"R1\"}"

# Zero / negative amount -> 400 "Amount must be greater than 0"
curl -X POST $BASE/transactions -H "Content-Type: application/json" \
  -d "{\"account_id\":\"$ACC_A\",\"type\":\"credit\",\"amount\":0,\"description\":\"x\",\"reference_id\":\"R2\"}"
curl -X POST $BASE/transactions -H "Content-Type: application/json" \
  -d "{\"account_id\":\"$ACC_A\",\"type\":\"credit\",\"amount\":-10,\"description\":\"x\",\"reference_id\":\"R3\"}"

# Too many decimals -> 400
curl -X POST $BASE/transactions -H "Content-Type: application/json" \
  -d "{\"account_id\":\"$ACC_A\",\"type\":\"credit\",\"amount\":1.234,\"description\":\"x\",\"reference_id\":\"R4\"}"

# Amount as string -> 400
curl -X POST $BASE/transactions -H "Content-Type: application/json" \
  -d "{\"account_id\":\"$ACC_A\",\"type\":\"credit\",\"amount\":\"abc\",\"description\":\"x\",\"reference_id\":\"R5\"}"

# Missing reference_id -> 400 ["reference_id is required","reference_id must be a string"]
curl -X POST $BASE/transactions -H "Content-Type: application/json" \
  -d "{\"account_id\":\"$ACC_A\",\"type\":\"credit\",\"amount\":10,\"description\":\"x\"}"

# Valid UUID, account does not exist -> 404
curl -X POST $BASE/transactions -H "Content-Type: application/json" \
  -d '{"account_id":"11111111-1111-4111-8111-111111111111","type":"credit","amount":10,"description":"x","reference_id":"R6"}'

# Malformed account_id -> 400 "account_id must be a valid UUID"
curl -X POST $BASE/transactions -H "Content-Type: application/json" \
  -d '{"account_id":"abc","type":"credit","amount":10,"description":"x","reference_id":"R7"}'

# Malformed JSON body -> 400
curl -X POST $BASE/transactions -H "Content-Type: application/json" -d '{bad json'

# Unknown field -> 400 "property foo should not exist"
curl -X POST $BASE/transactions -H "Content-Type: application/json" \
  -d "{\"account_id\":\"$ACC_A\",\"type\":\"credit\",\"amount\":10,\"description\":\"x\",\"reference_id\":\"R8\",\"foo\":1}"
```

**Duplicate (409) response**
```json
{
  "success": false, "statusCode": 409, "error": "Conflict",
  "message": "Transaction with reference_id 'REF001' already exists for this account",
  "existing_transaction": { "id": "...", "reference_id": "REF001", "type": "credit", "amount": 100, "created_at": "..." }
}
```

**Immutability check** (all return 404, no such routes)
```bash
curl -X PUT    $BASE/transactions/some-id
curl -X PATCH  $BASE/transactions/some-id
curl -X DELETE $BASE/transactions/some-id
```

---

## 5. Get Transaction History

**GET** `/transactions/account/:accountId`

| Query param | Type | Default | Rules |
|-------------|------|---------|-------|
| type | `credit` \| `debit` | both | Optional filter |
| page | integer | 1 | >= 1 |
| limit | integer | 10 | >= 1 |

Results are ordered by `created_at` descending (latest first).

```bash
# All transactions
curl "$BASE/transactions/account/$ACC_A"

# Only credits / only debits
curl "$BASE/transactions/account/$ACC_A?type=credit"
curl "$BASE/transactions/account/$ACC_A?type=debit"

# Pagination
curl "$BASE/transactions/account/$ACC_A?page=1&limit=2"
curl "$BASE/transactions/account/$ACC_A?page=2&limit=2"

# Filter + pagination combined
curl "$BASE/transactions/account/$ACC_A?type=debit&page=1&limit=5"

# Page beyond the last -> 200 with empty data array
curl "$BASE/transactions/account/$ACC_A?page=999"
```

**200 response**
```json
{
  "success": true,
  "data": [
    { "id": "...", "account_id": "...", "type": "debit", "amount": 30, "description": "Purchase", "reference_id": "REF002", "created_at": "..." }
  ],
  "pagination": { "current_page": 1, "page_size": 10, "total_records": 2, "total_pages": 1 }
}
```

**Error cases**
```bash
# Invalid type -> 400 'type must be either "credit" or "debit"'
curl "$BASE/transactions/account/$ACC_A?type=invalid"

# page/limit < 1 or non-integer -> 400
curl "$BASE/transactions/account/$ACC_A?page=0"
curl "$BASE/transactions/account/$ACC_A?limit=-5"
curl "$BASE/transactions/account/$ACC_A?page=abc"
curl "$BASE/transactions/account/$ACC_A?limit=1.5"

# Unknown account (valid UUID) -> 404
curl "$BASE/transactions/account/11111111-1111-4111-8111-111111111111"

# Malformed account id -> 400
curl "$BASE/transactions/account/not-a-uuid"
```

---

## 6. Money Transfer (Bonus)

**POST** `/transfers`

| Field | Type | Required | Rules |
|-------|------|----------|-------|
| from_account_id | UUID v4 | yes | Must exist, differ from destination |
| to_account_id | UUID v4 | yes | Must exist |
| amount | number | yes | > 0, max 2 decimals |
| description | string | yes | Non-empty |
| reference_id | string | yes | Must be unused on both accounts |

Creates a debit on the source and a credit on the destination (same `reference_id`) and updates both balances in a single database transaction. Any failure rolls everything back.

```bash
# Fund A first, then transfer 30 from A to B
curl -X POST $BASE/transactions -H "Content-Type: application/json" \
  -d "{\"account_id\":\"$ACC_A\",\"type\":\"credit\",\"amount\":100,\"description\":\"Seed\",\"reference_id\":\"SEED1\"}"

curl -X POST $BASE/transfers \
  -H "Content-Type: application/json" \
  -d "{\"from_account_id\":\"$ACC_A\",\"to_account_id\":\"$ACC_B\",\"amount\":30,\"description\":\"Payment\",\"reference_id\":\"TRANSFER001\"}"

# Verify both balances
curl $BASE/accounts/$ACC_A/balance
curl $BASE/accounts/$ACC_B/balance
```

**201 response**
```json
{
  "success": true,
  "message": "Transfer completed successfully",
  "data": {
    "from_account": { "id": "...", "balance": 70 },
    "to_account":   { "id": "...", "balance": 30 },
    "debit_transaction":  { "id": "...", "amount": 30, "reference_id": "TRANSFER001" },
    "credit_transaction": { "id": "...", "amount": 30, "reference_id": "TRANSFER001" }
  }
}
```

**Error cases** (none of these change any balance)
```bash
# Same account -> 400 "Cannot transfer to the same account"
curl -X POST $BASE/transfers -H "Content-Type: application/json" \
  -d "{\"from_account_id\":\"$ACC_A\",\"to_account_id\":\"$ACC_A\",\"amount\":10,\"description\":\"Self\",\"reference_id\":\"T2\"}"

# Insufficient balance -> 400
curl -X POST $BASE/transfers -H "Content-Type: application/json" \
  -d "{\"from_account_id\":\"$ACC_A\",\"to_account_id\":\"$ACC_B\",\"amount\":5000,\"description\":\"Big\",\"reference_id\":\"T3\"}"

# Duplicate reference_id -> 409
curl -X POST $BASE/transfers -H "Content-Type: application/json" \
  -d "{\"from_account_id\":\"$ACC_A\",\"to_account_id\":\"$ACC_B\",\"amount\":5,\"description\":\"Dupe\",\"reference_id\":\"TRANSFER001\"}"

# Source account missing -> 404 "Source account with id '...' not found"
curl -X POST $BASE/transfers -H "Content-Type: application/json" \
  -d "{\"from_account_id\":\"11111111-1111-4111-8111-111111111111\",\"to_account_id\":\"$ACC_B\",\"amount\":5,\"description\":\"x\",\"reference_id\":\"T4\"}"

# Destination account missing -> 404 "Destination account with id '...' not found"
curl -X POST $BASE/transfers -H "Content-Type: application/json" \
  -d "{\"from_account_id\":\"$ACC_A\",\"to_account_id\":\"11111111-1111-4111-8111-111111111111\",\"amount\":5,\"description\":\"x\",\"reference_id\":\"T5\"}"

# Invalid amount -> 400
curl -X POST $BASE/transfers -H "Content-Type: application/json" \
  -d "{\"from_account_id\":\"$ACC_A\",\"to_account_id\":\"$ACC_B\",\"amount\":-5,\"description\":\"x\",\"reference_id\":\"T6\"}"

# Malformed UUID / missing fields -> 400
curl -X POST $BASE/transfers -H "Content-Type: application/json" \
  -d '{"from_account_id":"abc","to_account_id":"def","amount":5}'
```

---

## 7. Health Check

**GET** `/health`

Pings the SQLite connection (`SELECT 1`) and reports service uptime. Use this for container/orchestration liveness or readiness probes.

```bash
curl $BASE/health
```

**200 response** (database reachable)
```json
{
  "success": true,
  "status": "ok",
  "uptime": 12.345,
  "timestamp": "2026-10-27T15:00:00.000Z",
  "database": "up"
}
```

**503 response** (database unreachable — e.g. file locked, disk full, connection pool exhausted)
```json
{
  "success": false,
  "status": "error",
  "uptime": 12.345,
  "timestamp": "2026-10-27T15:00:00.000Z",
  "database": "down"
}
```

---

## End-to-end consistency scenario

Expected final balance of `ACC_A` is 100 (0 + 100 + 50 − 30 − 20); rejected/duplicate requests must not change it.

```bash
ACC=$(curl -s -X POST $BASE/accounts -H "Content-Type: application/json" -d '{"name":"Scenario"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).data.id")
tx() { curl -s -X POST $BASE/transactions -H "Content-Type: application/json" -d "{\"account_id\":\"$ACC\",\"type\":\"$1\",\"amount\":$2,\"description\":\"d\",\"reference_id\":\"$3\"}"; echo; }

tx credit 100 S1
tx credit 50  S2
tx debit  30  S3
tx debit  20  S4
tx debit  500 S5   # rejected
tx credit 10  S1   # duplicate, rejected

curl $BASE/accounts/$ACC/balance   # -> 100
```
