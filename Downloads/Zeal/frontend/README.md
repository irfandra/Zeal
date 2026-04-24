# The Digital Seal

Blockchain-based luxury product authentication platform. Physical luxury items are represented as ERC-721 NFTs (Digital Seals), enabling brands to mint, sell, and track provenance — and buyers to verify authenticity and claim ownership via QR scan.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Backend Setup](#backend-setup)
3. [Environment Variables](#environment-variables)
4. [Docker / Database](#docker--database)
5. [API Reference](#api-reference)
6. [Smart Contract](#smart-contract)
7. [IPFS / Pinata](#ipfs--pinata)
8. [Security](#security)
9. [Production Deployment](#production-deployment)

---

## Architecture

| Layer | Technology |
|---|---|
| Backend API | Spring Boot 3.2, Java 21 |
| Database | MySQL 8.0 (Docker) |
| Security | Spring Security + JWT |
| Blockchain | Web3j → Hardhat local / Polygon |
| ORM / Migration | Hibernate JPA + Flyway |
| Smart Contract | Solidity 0.8, ERC-721 |
| IPFS | Pinata |

---

## Backend Setup

### Prerequisites

- Java 21+
- Maven 3.6+
- MySQL 8.0+ (or Docker)

### Quick Start

```bash
# 1. Start MySQL via Docker
cd backend
docker-compose up -d

# 2. Copy and configure environment
cp .env.example .env
# Edit .env — set DB_PASSWORD, JWT_SECRET, CONTRACT_ADDRESS, etc.

# 3. Build and run
mvn clean install
mvn spring-boot:run
```

The server starts at `http://localhost:8080`. Swagger UI: `http://localhost:8080/api/v1/swagger-ui.html`

### Build a JAR

```bash
mvn clean package -DskipTests
java -jar target/backend-1.0.0.jar
```

### Run Tests

```bash
mvn test
```

### Database Migrations

Flyway migrations apply automatically on startup from `src/main/resources/db/migration/`.

---

## Environment Variables

Create `backend/.env` (never commit it):

```properties
DB_USERNAME=root
DB_PASSWORD=your_password
DATABASE_MODE=validate

JWT_SECRET=your-256-bit-secret-key-minimum-32-chars

POLYGON_LIKE_RPC_URL=http://127.0.0.1:8545
POLYGON_LIKE_CHAIN_ID=80002
POLYGON_LIKE_INITIAL_BASE_FEE_WEI=30000000000
POLYGON_LIKE_MINING_INTERVAL_MS=2000
POLYGON_LIKE_BLOCK_GAS_LIMIT=30000000
CONTRACT_ADDRESS=0x...

CORS_ORIGINS=http://localhost:3000,http://localhost:8081
```

### `DATABASE_MODE` Options

| Value | Behaviour | When to use |
|---|---|---|
| `create` | Drop + recreate schema | First-time setup only ⚠️ destroys data |
| `validate` | Validate schema, no changes | Normal development & production |
| `update` | Auto-update schema | Use with caution |
| `none` | JPA does nothing | When Flyway manages everything |

Workflow: set `create` once → start app → stop → change to `validate`.

---

## Docker / Database

The `docker-compose.yml` in `backend/` starts **MySQL only**; the Spring Boot app runs locally.

```bash
# Start MySQL
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f mysql

# Stop (keeps data)
docker-compose down

# Stop and wipe data
docker-compose down -v

# MySQL CLI
docker-compose exec mysql mysql -u root -p

# Dump DB
docker-compose exec mysql mysqldump -u root -p${DB_PASSWORD} digital_seal > backup.sql
```

MySQL is accessible at `localhost:3306`, database `digital_seal`.

---

## API Reference

Base URL: `http://localhost:8080/api/v1`

Interactive docs: `http://localhost:8080/api/v1/swagger-ui.html`  
OpenAPI JSON: `http://localhost:8080/api/v1/v3/api-docs`

### Authentication Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/auth/register` | Email registration | No |
| POST | `/auth/login` | Email login | No |
| GET | `/auth/wallet/nonce` | Get wallet nonce | No |
| POST | `/auth/wallet/register` | Wallet registration | No |
| POST | `/auth/wallet/login` | Wallet login | No |
| POST | `/auth/refresh` | Refresh access token | No |
| POST | `/auth/logout` | Revoke refresh token | No |

### Email Registration

```bash
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "OWNER"
  }'
```

Response `201 Created`:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "...",
    "tokenType": "Bearer",
    "expiresIn": 86400000,
    "user": { "id": 1, "email": "user@example.com", "role": "OWNER", "authType": "EMAIL" }
  },
  "message": "Registration successful"
}
```

### Email Login

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "SecurePass123!"}'
```

### Wallet Nonce → Register

```bash
# Step 1: get nonce
curl "http://localhost:8080/api/v1/auth/wallet/nonce?address=0x742d35..."

# Step 2: sign the returned message with MetaMask / WalletConnect

# Step 3: register
curl -X POST http://localhost:8080/api/v1/auth/wallet/register \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0x742d35...",
    "signature": "0xabc...",
    "message": "Sign this message to authenticate with Digital Seal: <nonce>",
    "firstName": "John",
    "role": "OWNER"
  }'
```

### Using Protected Endpoints

```bash
curl -H "Authorization: Bearer <accessToken>" \
  http://localhost:8080/api/v1/some/protected/endpoint
```

In Swagger UI: click **Authorize**, enter `Bearer <accessToken>`.

### Token Refresh / Logout

```bash
# Refresh
curl -X POST http://localhost:8080/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<token>"}'

# Logout
curl -X POST http://localhost:8080/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<token>"}'
```

### Standard Response Format

Success:
```json
{ "success": true, "data": { ... }, "message": "...", "timestamp": "..." }
```

Error:
```json
{ "success": false, "error": { "code": "INVALID_CREDENTIALS", "message": "..." }, "timestamp": "..." }
```

### Common Error Codes

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Bad request body |
| 401 | `INVALID_CREDENTIALS` | Wrong email/password or invalid signature |
| 409 | `EMAIL_ALREADY_EXISTS` | Duplicate registration |
| 423 | `ACCOUNT_LOCKED` | 5 consecutive failed logins |

### Password Requirements

- Minimum 8 characters
- At least one uppercase, lowercase, digit, and special character (`@#$%^&+=!`)

### User Roles

- `OWNER` — luxury product buyer/owner
- `BRAND` — brand representative managing products

---

## Smart Contract

Located in `smartcontract/` (Truffle, LuxuryDigitalTwin ERC-721 on Polygon) and `blockchain/` (Hardhat, DigitalSeal — active deployment).

Deployed contract address: set `CONTRACT_ADDRESS` in `.env`.

### LuxuryDigitalTwin Features

- Authorized brands mint Digital Twins for luxury products
- Unique serial number per NFT → on-chain authenticity verification
- IPFS metadata storage for decentralized access
- Transfer history tracking (repairs, appraisals, ownership)

### Compile & Deploy (Truffle)

```bash
cd smartcontract
npm install
npm install -g truffle
truffle compile
truffle migrate --network <network-name>
truffle test
```
# 1. Go to blockchain folder
cd /Users/irfanrahmanindra/Documents/GitHub/The-Digital-Seal/blockchain

# 2. Clear old files
rm -rf node_modules package-lock.json

# 3. Install dependencies
npm install

# 4. Verify
npx hardhat --version
# Should show: hardhat/X.X.X

# 5. Run hardhat node
npx hardhat node
# Should start on http://127.0.0.1:8545
---

## IPFS / Pinata

NFT metadata is stored on IPFS via Pinata.

### Setup

1. Go to https://app.pinata.cloud → sign up (free, 1 GB)
2. **API Keys** → **New Key** → Admin permissions → copy the JWT
3. Add to `smartcontract/.env`:
   ```env
   PINATA_JWT=eyJhbGci...
   ```

### Upload Metadata

```bash
node smartcontract/ipfs-utils/pinata-upload.js
```

Or programmatically:

```javascript
const { uploadNFT } = require('./ipfs-utils/pinata-upload');

const product = {
  name: 'Rolex Submariner #12345',
  brand: 'Rolex',
  model: 'Submariner Date',
  serialNumber: '12345',
  year: '2020',
  condition: 'Excellent'
};

const result = await uploadNFT(product, './product-photo.jpg');
// result.metadataURI → ipfs://QmXxxxxx
```

---

## Security

| Feature | Implementation |
|---|---|
| Password hashing | BCrypt cost factor 12 |
| Account lockout | 5 failed logins → locked (requires password reset) |
| JWT access token | HS256, 24-hour expiry |
| JWT refresh token | 30-day expiry, rotation on refresh |
| Wallet auth | Web3j signature recovery + nonce replay protection |
| CORS | Configurable via `CORS_ORIGINS` env var |

---

## Production Deployment

```bash
# Build
mvn clean package -DskipTests

# Required environment variables
export JWT_SECRET=<min-32-char-random-secret>
export DB_USERNAME=<db-user>
export DB_PASSWORD=<secure-password>
export DATABASE_MODE=validate
export CORS_ORIGINS=https://yourdomain.com
export CONTRACT_ADDRESS=0x...
export POLYGON_LIKE_RPC_URL=https://polygon-amoy.infura.io/v3/<key>
export POLYGON_LIKE_CHAIN_ID=80002

# Run
java -jar target/backend-1.0.0.jar
```

Disable debug logging in `application.yml`:
```yaml
logging:
  level:
    com.digitalseal: INFO
    org.springframework.security: WARN
```

### Troubleshooting

| Problem | Fix |
|---|---|
| Port in use | Change `server.port` in `application.yml` |
| DB connection error | Verify MySQL running, check credentials, ensure `digital_seal` DB exists |
| JWT errors | Ensure `JWT_SECRET` ≥ 32 characters |
| CORS errors | Add frontend URL to `CORS_ORIGINS` |
