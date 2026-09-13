# Ledger POS — Free Render Deployment

## 1. Test locally
```bash
npm install
npx prisma generate
npm start
```

Open http://localhost:4000 (or the port printed by the server).

## 2. Put the project on GitHub
Create a new GitHub repository and upload the contents of this project.

Do NOT upload `.env` or real passwords/secrets.

## 3. Deploy on Render
1. Sign in at https://render.com/
2. Choose **New + → Blueprint**.
3. Connect the GitHub repository.
4. Render detects `render.yaml`.
5. Create the services.
6. Wait for the web service to finish deploying.
7. Open the generated `https://....onrender.com` address.

The blueprint creates:
- one Node/Express web service
- one PostgreSQL database
- DATABASE_URL connected automatically

## 4. If Render asks for environment variables
At minimum:
- NODE_ENV=production
- DATABASE_URL=<Render PostgreSQL connection string>

If your application uses JWT/auth secrets, also set the exact secret variable names expected by the server (for example JWT_SECRET).

## 5. Prisma
The build command runs:
```bash
npx prisma generate
npx prisma migrate deploy
```

This applies existing production migrations. If this project has no Prisma migration files, create a migration locally before deploying:
```bash
npx prisma migrate dev --name init
```
Then commit the generated `prisma/migrations` directory.

## Important
The free database/web-service availability and limits on Render can change over time. Treat this deployment as a testing/demo environment, not production hosting for important business data.
