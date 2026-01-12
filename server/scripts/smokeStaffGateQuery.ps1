# Smoke-test: staff verify-pin then gate query
# Run:
#   powershell -NoProfile -ExecutionPolicy Bypass -File server\scripts\smokeStaffGateQuery.ps1
#
# You can override defaults:
#   $env:PINCODE='123456'
#   $env:CARDID='CARD-38714'
#   $env:PLATE='ABC-1234'
#   $env:BASE_URL='http://localhost:3001'

$BASE_URL = if ($env:BASE_URL) { $env:BASE_URL } else { 'http://localhost:3001' }
$PINCODE  = if ($env:PINCODE)  { $env:PINCODE }  else { '000000' }
$CARDID   = if ($env:CARDID)   { $env:CARDID }   else { 'CARD-38714' }
$PLATE    = if ($env:PLATE)    { $env:PLATE }    else { 'ABC-1234' }

function Read-ErrorBody($err) {
  if ($err.Exception.Response -and $err.Exception.Response.GetResponseStream()) {
    $reader = New-Object System.IO.StreamReader($err.Exception.Response.GetResponseStream())
    return $reader.ReadToEnd()
  }
  return $err.Exception.Message
}

try {
  $loginBody = @{ PINCode = $PINCODE } | ConvertTo-Json
  $loginRes = Invoke-RestMethod -Method Post -Uri "$BASE_URL/api/staff-accounts/verify-pin" -ContentType 'application/json' -Body $loginBody

  $token = $loginRes.data.token
  if (-not $token) {
    throw "No token returned from verify-pin"
  }

  $headers = @{ Authorization = "Bearer $token" }
  $queryUrl = "$BASE_URL/api/entry-sessions/gate/query?cardId=$([uri]::EscapeDataString($CARDID))&licensePlate=$([uri]::EscapeDataString($PLATE))"
  $queryRes = Invoke-RestMethod -Method Get -Uri $queryUrl -Headers $headers

  Write-Output ($queryRes | ConvertTo-Json -Depth 20)
} catch {
  Write-Output (Read-ErrorBody $_)
  exit 1
}
