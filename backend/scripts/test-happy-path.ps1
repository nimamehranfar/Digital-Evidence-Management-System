<#
DEMS end-to-end happy path (through APIM).

Prereqs:
  - PowerShell 7+ (or Windows PowerShell)
  - curl.exe available (Windows ships it)
  - A valid Entra access token for scope: api://5c696d12-ced1-409f-bde9-5806053165b3/access_as_user

Usage:
  $env:APIM_BASE = "https://apim-dems1.azure-api.net/func-dems1"
  $env:TOKEN = "<paste_access_token>"
  $env:CASE_ID = "<existing_case_id>"
  $env:FILE_PATH = "C:\path\to\test.jpg"
  ./backend/scripts/test-happy-path.ps1

Notes:
  - This script assumes the Case already exists.
  - Evidence processing is asynchronous; we poll /status.
#>

$ErrorActionPreference = "Stop"

$APIM_BASE = $env:APIM_BASE
$TOKEN = $env:TOKEN
$CASE_ID = $env:CASE_ID
$FILE_PATH = $env:FILE_PATH

if (-not $APIM_BASE) { throw "Set APIM_BASE env var" }
if (-not $TOKEN) { throw "Set TOKEN env var" }
if (-not $CASE_ID) { throw "Set CASE_ID env var" }
if (-not (Test-Path $FILE_PATH)) { throw "FILE_PATH not found: $FILE_PATH" }

Write-Host "1) /api/auth/me" -ForegroundColor Cyan
curl.exe -sS -i -H "Authorization: Bearer $TOKEN" "$APIM_BASE/api/auth/me"

Write-Host "\n2) upload-init" -ForegroundColor Cyan
$fileName = [System.IO.Path]::GetFileName($FILE_PATH)
$fileSize = (Get-Item $FILE_PATH).Length
$initBody = @{ caseId = $CASE_ID; fileName = $fileName; fileSize = $fileSize } | ConvertTo-Json

$initResp = curl.exe -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d $initBody "$APIM_BASE/api/evidence/upload-init"
$initJson = $initResp | ConvertFrom-Json
$uploadUrl = $initJson.uploadUrl
$evidenceId = $initJson.evidenceId

Write-Host "upload-init response:" -ForegroundColor Yellow
$initJson | ConvertTo-Json -Depth 10

Write-Host "\n3) PUT blob to SAS URL" -ForegroundColor Cyan
curl.exe -sS -X PUT -H "x-ms-blob-type: BlockBlob" --data-binary "@$FILE_PATH" "$uploadUrl"

Write-Host "\n4) upload-confirm" -ForegroundColor Cyan
$confirmBody = @{ evidenceId = $evidenceId; caseId = $CASE_ID; description = "test upload"; userTags = @("demo") } | ConvertTo-Json
$confirmResp = curl.exe -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d $confirmBody "$APIM_BASE/api/evidence/upload-confirm"
$confirmJson = $confirmResp | ConvertFrom-Json
Write-Host "upload-confirm response:" -ForegroundColor Yellow
$confirmJson | ConvertTo-Json -Depth 10

Write-Host "\n5) Poll status" -ForegroundColor Cyan
$statusUrl = "$APIM_BASE/api/evidence/id/$evidenceId/status"
for ($i=0; $i -lt 30; $i++) {
  $s = curl.exe -sS -H "Authorization: Bearer $TOKEN" "$statusUrl" | ConvertFrom-Json
  Write-Host ("[{0}] status={1}" -f $i, $s.status)
  if ($s.status -eq "COMPLETED" -or $s.status -eq "FAILED") { break }
  Start-Sleep -Seconds 2
}

Write-Host "\n6) Search query" -ForegroundColor Cyan
$searchUrl = "$APIM_BASE/api/evidence/search?q=demo&top=5"
curl.exe -sS -H "Authorization: Bearer $TOKEN" "$searchUrl"

Write-Host "\nDONE" -ForegroundColor Green
