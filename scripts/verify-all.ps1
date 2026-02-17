$ErrorActionPreference = "Stop"

function Invoke-WithRetry {
  param(
    [Parameter(Mandatory = $true)]
    [scriptblock]$Action,
    [int]$MaxAttempts = 3,
    [int]$DelaySeconds = 2,
    [string]$Label = "command"
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    & $Action
    if ($LASTEXITCODE -eq 0) {
      return
    }

    if ($attempt -eq $MaxAttempts) {
      throw "$Label failed after $MaxAttempts attempts."
    }

    Write-Host "[verify-all] Retry $attempt/$MaxAttempts failed for $Label. Waiting $DelaySeconds s..."
    Start-Sleep -Seconds $DelaySeconds
  }
}

Write-Host "[verify-all] Preparing deterministic test environment"
Invoke-WithRetry -Label "prisma migrate reset" -Action { npx prisma migrate reset --force --skip-generate --skip-seed }
Invoke-WithRetry -Label "db seed" -Action { npm run db:seed }

Write-Host "[verify-all] Running unit/integration quality gates"
npm run test
npm run lint
npm run typecheck
npm run build

Write-Host "[verify-all] Running live smoke test against local app"
$devLog = Join-Path $PSScriptRoot "..\\dev-server.log"
if (Test-Path $devLog) {
  Remove-Item $devLog -Force -ErrorAction SilentlyContinue
}

$devProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev > dev-server.log 2>&1" -WorkingDirectory (Resolve-Path (Join-Path $PSScriptRoot "..")) -PassThru

try {
  Invoke-WithRetry -Label "smoke test" -MaxAttempts 4 -DelaySeconds 3 -Action { npm run smoke }
}
finally {
  if ($devProcess -and -not $devProcess.HasExited) {
    taskkill /PID $devProcess.Id /T /F | Out-Null
  }
}

Write-Host "[verify-all] All checks passed"
