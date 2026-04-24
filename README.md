# The Digital Seal

## Prerequisites

- Docker Desktop
- Node.js 20+
- npm 10+
- Java 17 (only needed if you run backend outside Docker)

## Start backend stack

```bash
cd backend
cp .env.example .env
```

Set at least `JWT_SECRET` in `backend/.env`.

Then run:

```bash
docker compose up -d mysql hardhat
docker compose --profile manual run --rm contract-deployer
docker compose up -d backend
```

Backend API: http://localhost:8080/api/v1

Database init is handled by one Flyway file:

- `backend/src/main/resources/db/migration/V1__create_users_table.sql`

## Run frontend

```bash
cd frontend
npm install
npx expo start
```

## ngrok for MetaMask

Use ngrok so your frontend has HTTPS for MetaMask.

Expose the frontend dev server:

```bash
ngrok http 8081
```

If the app talks to the backend directly, expose the backend too:

```bash
ngrok http 8080
```

