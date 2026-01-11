# Smoke-test: call staff verify-pin endpoint
# Run:
#   powershell -NoProfile -ExecutionPolicy Bypass -File server\scripts\smokeStaffVerifyPin.ps1

$body = @{ PINCode = '000000' } | ConvertTo-Json

try {
  $res = Invoke-WebRequest -Method Post -Uri 'http://localhost:3001/api/staff-accounts/verify-pin' -ContentType 'application/json' -Body $body -UseBasicParsing
  $res.Content
} catch {
  if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $reader.ReadToEnd()
  } else {
    $_.Exception.Message
  }
}
