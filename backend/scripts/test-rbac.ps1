<#
DEMS RBAC regression tests (through APIM).

Set tokens for each role:
  $env:APIM_BASE = "https://apim-dems1.azure-api.net/func-dems1"
  $env:TOKEN_ADMIN = "..."
  $env:TOKEN_DETECTIVE = "..."
  $env:TOKEN_CASE_OFFICER = "..."
  $env:TOKEN_PROSECUTOR = "..."

Optional (for scoped tests):
  $env:DEPARTMENT_ID = "<dept id assigned to case_officer>"
  $env:CASE_ID = "<case id inside that department>"

This script prints PASS/FAIL with expected HTTP codes.
#>

$ErrorActionPreference = "Stop"

$APIM_BASE = $env:APIM_BASE
if (-not $APIM_BASE) { throw "Set APIM_BASE" }

$TOKENS = @{
  admin = $env:TOKEN_ADMIN
  detective = $env:TOKEN_DETECTIVE
  case_officer = $env:TOKEN_CASE_OFFICER
  prosecutor = $env:TOKEN_PROSECUTOR
}

foreach ($k in $TOKENS.Keys) {
  if (-not $TOKENS[$k]) { Write-Warning "Missing token for role: $k" }
}

function Invoke-Req($token, $method, $url, $bodyJson=$null) {
  $args = @("-sS", "-o", "NUL", "-w", "%{http_code}", "-X", $method, "-H", "Authorization: Bearer $token")
  if ($bodyJson) {
    $args += @("-H", "Content-Type: application/json", "-d", $bodyJson)
  }
  $args += $url
  $code = & curl.exe @args
  return [int]$code
}

function Check($label, $got, $expected) {
  $ok = $expected -contains $got
  $tag = $ok ? "PASS" : "FAIL"
  Write-Host ("{0,-5} {1,-45} got={2} expected={3}" -f $tag, $label, $got, ($expected -join ","))
}

$DEPT = $env:DEPARTMENT_ID
$CASE = $env:CASE_ID

Write-Host "Testing /api/auth/me should be 200 for all roles" -ForegroundColor Cyan
foreach ($role in $TOKENS.Keys) {
  $t = $TOKENS[$role]
  if (-not $t) { continue }
  $c = Invoke-Req $t "GET" "$APIM_BASE/api/auth/me"
  Check "$role GET /auth/me" $c @(200)
}

Write-Host "\nInvestigative endpoints: admin must be blocked" -ForegroundColor Cyan
if ($TOKENS.admin) {
  $c1 = Invoke-Req $TOKENS.admin "GET" "$APIM_BASE/api/cases"
  Check "admin GET /cases" $c1 @(403)
  $c2 = Invoke-Req $TOKENS.admin "GET" "$APIM_BASE/api/evidence"
  Check "admin GET /evidence" $c2 @(403)
  $c3 = Invoke-Req $TOKENS.admin "GET" "$APIM_BASE/api/evidence/search?q=*"
  Check "admin GET /evidence/search" $c3 @(403)
}

Write-Host "\nProsecutor is read-only" -ForegroundColor Cyan
if ($TOKENS.prosecutor -and $DEPT) {
  $caseCreate = @{ department = $DEPT; title = "rbac test" } | ConvertTo-Json
  $c = Invoke-Req $TOKENS.prosecutor "POST" "$APIM_BASE/api/cases" $caseCreate
  Check "prosecutor POST /cases" $c @(403)
}

Write-Host "\nAdmin can manage departments, but deletes cascade" -ForegroundColor Cyan
if ($TOKENS.admin) {
  $deptCreate = @{ name = "temp-dept"; description = "rbac" } | ConvertTo-Json
  $c = Invoke-Req $TOKENS.admin "POST" "$APIM_BASE/api/departments" $deptCreate
  Check "admin POST /departments" $c @(201,200)
}

Write-Host "\nCase officer department scoping (requires DEPARTMENT_ID + CASE_ID env vars)" -ForegroundColor Cyan
if ($TOKENS.case_officer -and $DEPT) {
  $c = Invoke-Req $TOKENS.case_officer "GET" "$APIM_BASE/api/cases?department=$DEPT"
  Check "case_officer GET /cases?department=assigned" $c @(200)
}
if ($TOKENS.case_officer -and $CASE) {
  $c = Invoke-Req $TOKENS.case_officer "GET" "$APIM_BASE/api/cases/$CASE"
  Check "case_officer GET /cases/{caseId}" $c @(200)
}

Write-Host "\nDONE" -ForegroundColor Green
