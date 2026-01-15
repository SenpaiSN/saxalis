param(
  [string]$ApiUrl = 'https://saxalis.free.nf/API/run_recurring_transactions.php'
)

if (-not $env:SAXALIS_CRON_SECRET) {
  Write-Error "SAXALIS_CRON_SECRET not set"
  exit 1
}

$body = @{ cron_secret = $env:SAXALIS_CRON_SECRET }
try {
  $res = Invoke-RestMethod -Uri $ApiUrl -Method Post -Body $body
  $res | ConvertTo-Json -Depth 4
} catch {
  Write-Error "Request failed: $_"
  exit 1
}