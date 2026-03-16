param(
  [Parameter(Mandatory = $true)]
  [string]$SqlFile
)

$envFile = ".env.production.vercel"

if (-not (Test-Path $envFile)) {
  Write-Error "Missing $envFile"
  exit 1
}

if (-not (Test-Path $SqlFile)) {
  Write-Error "Missing $SqlFile"
  exit 1
}

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*([^#=]+)=(.*)$') {
    $name = $matches[1].Trim()
    $value = $matches[2].Trim().Trim('"')
    Set-Item -Path ("Env:" + $name) -Value $value
  }
}

npx.cmd prisma db execute --file $SqlFile --schema prisma/schema.prisma
