# Ledger POS

Complete POS application: Express + Prisma + PostgreSQL backend and the Ledger POS web frontend served by the same server.

## Run everything with one command

Install Docker Desktop, extract this folder, open a terminal in the project directory, and run:

```bash
docker compose up --build
```

Then open **http://localhost:4000**.

The first startup creates the database schema and seed data automatically. PostgreSQL data is persisted in the `ledger_pgdata` Docker volume.

## Demo login

- Store Admin — PIN `1234`
- Cashier One — PIN `1111`

## Included

- PIN login with JWT and bcrypt
- PostgreSQL persistence through Prisma
- Products, barcodes, stock and stock movement history
- Cash/Card/Mobile checkout
- Transaction-safe stock deduction
- Sales history and reports
- Admin staff management
- Store settings
- Camera barcode scanning when supported by the browser
- Same-origin frontend/API, so no separate frontend server is required

## Stop

Press `Ctrl+C`. To stop and remove containers while keeping database data:

```bash
docker compose down
```

To reset the database completely, also remove the volume:

```bash
docker compose down -v
```

For production, change `JWT_SECRET` in the environment and change the demo PINs.
