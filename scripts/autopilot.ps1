$ErrorActionPreference = "Stop"

Write-Host "[1/5] Install dependencies"
npm install

Write-Host "[2/5] Prisma migrate"
npx prisma migrate dev

Write-Host "[3/5] Seed database"
npm run db:seed

Write-Host "[4/5] Verify"
npm run test
npm run lint
npm run typecheck

Write-Host "[5/5] Build"
npm run build

Write-Host "Autopilot finished successfully"