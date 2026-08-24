# Smoke test Lot 2 durcissement (rate limit global, endpoints reset limites)
# Usage : powershell -ExecutionPolicy Bypass -File .\scripts\smoke-lot2-durcissement.ps1
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:5000'
$pass = 0
$fail = 0

function Check($name, $ok, $detail) {
    if ($ok) { Write-Host "[OK]   $name" -ForegroundColor Green; $script:pass++ }
    else { Write-Host "[FAIL] $name -- $detail" -ForegroundColor Red; $script:fail++ }
}

Write-Host ""
Write-Host "=== Smoke Lot 2 durcissement ===" -ForegroundColor Cyan

# 1. Health jamais rate-limite (probes) : 50 appels rapides -> tous 200
$allOk = $true
for ($i = 0; $i -lt 50; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "$base/api/health" -UseBasicParsing -TimeoutSec 5
        if ([int]$r.StatusCode -ne 200) { $allOk = $false; break }
    } catch { $allOk = $false; break }
}
Check "/api/health exempt de rate limit (50 appels -> 200)" $allOk "un appel a echoue"

# 2. Rate limit global actif : rafale rapide (HttpClient) -> au moins un 429
#    (plafond global 300/min/IP ; on envoie 360 requetes le plus vite possible)
Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromSeconds(5)
$got429 = $false
$retryAfterPresent = $false
for ($i = 0; $i -lt 360; $i++) {
    try {
        $resp = $client.GetAsync("$base/api/formations").GetAwaiter().GetResult()
        if ([int]$resp.StatusCode -eq 429) {
            $got429 = $true
            $retryAfterPresent = $resp.Headers.Contains('Retry-After')
            break
        }
    } catch { }
}
$client.Dispose()
Check "Rate limit global renvoie 429 sur rafale (>300/min)" $got429 "aucun 429 recu"
if ($got429) {
    Check "En-tete Retry-After present sur 429" $retryAfterPresent "absent"
} else {
    Write-Host "[SKIP] Retry-After (pas de 429 obtenu)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Note : attendre ~60s avant de relancer (fenetre du rate limit global)." -ForegroundColor DarkGray
Write-Host "=== Resultat : $pass OK, $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
