# Smoke test Lot 1 securite (reset matricule, uploads, etablissements, chat)
# Usage : powershell -ExecutionPolicy Bypass -File .\scripts\smoke-lot1-securite.ps1
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:5000'
$pass = 0
$fail = 0

function Check($name, $ok, $detail) {
    if ($ok) {
        Write-Host "[OK]   $name" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "[FAIL] $name -- $detail" -ForegroundColor Red
        $script:fail++
    }
}

function GetStatus($url, $headers) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10 -Headers $headers
        return [int]$r.StatusCode
    } catch {
        if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }
        return -1
    }
}

Write-Host ""
Write-Host "=== Smoke Lot 1 securite ===" -ForegroundColor Cyan

# 0. Health
$s = GetStatus "$base/api/health" @{}
Check "API /api/health repond 200" ($s -eq 200) "status=$s"

# 1. /uploads : document de dossier sans auth -> 401
$s = GetStatus "$base/uploads/1774287072389-380388601.pdf" @{}
Check "Upload dossier sans auth -> 401" ($s -eq 401) "status=$s"

# 2. /uploads : justificatif proforma sans auth -> 401
$s = GetStatus "$base/uploads/proforma-justificatifs/x.pdf" @{}
Check "Justificatif proforma sans auth -> 401" ($s -eq 401) "status=$s"

# 3. /uploads : logo etablissement public -> 200
$s = GetStatus "$base/uploads/etablissements/1774191655638-logo.jpg" @{}
Check "Logo etablissement public -> 200" ($s -eq 200) "status=$s"

# 4. /uploads : traversal -> 400/404 (jamais 200)
$s = GetStatus "$base/uploads/..%2Fdatabase%2Fpreinscription.json" @{}
Check "Path traversal bloque" ($s -ne 200) "status=$s"

# 5. Reset matricule : ne change plus le mot de passe directement
try {
    $body = @{ matricule = 'ZZZ-000000'; nouveau_mot_de_passe = 'Hack12345!'; confirmation = 'Hack12345!' } | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "$base/api/auth/reinitialiser-mot-de-passe-matricule" -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 10
    $json = $r.Content | ConvertFrom-Json
    $ok = ($json.message -notmatch 'Mot de passe mis a jour|mis à jour')
    Check "Reset matricule -> message generique (pas de changement direct)" $ok "message=$($json.message)"
} catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { -1 }
    # 503 = EMAIL_RESET_DISABLED (SMTP non configure) : acceptable, le mot de passe n'est pas change
    Check "Reset matricule -> refus/generique (503 si SMTP off)" ($code -eq 503 -or $code -eq 400) "status=$code"
}

# 6. GET /api/etablissements sans auth : pas de champs bancaires
try {
    $r = Invoke-WebRequest -Uri "$base/api/etablissements" -UseBasicParsing -TimeoutSec 10
    $ok = ($r.Content -notmatch 'compte_bancaire') -and ($r.Content -notmatch '"iban"') -and ($r.Content -notmatch '"swift"')
    Check "Etablissements (public) sans champs bancaires" $ok "champ bancaire present"
} catch {
    Check "Etablissements (public) accessible" $false "erreur requete"
}

# 7. Login admin puis liste : l'admin voit encore les champs bancaires
$adminToken = $null
try {
    $body = @{ email = 'admin@universite.sn'; mot_de_passe = 'Admin123!' } | ConvertTo-Json
    $r = Invoke-WebRequest -Uri "$base/api/auth/connexion" -Method Post -Body $body -ContentType 'application/json' -UseBasicParsing -TimeoutSec 10
    $adminToken = ($r.Content | ConvertFrom-Json).token
} catch { }
if ($adminToken) {
    $h = @{ Authorization = "Bearer $adminToken" }
    $r = Invoke-WebRequest -Uri "$base/api/etablissements" -Headers $h -UseBasicParsing -TimeoutSec 10
    Check "Etablissements (admin) contient compte_bancaire" ($r.Content -match 'compte_bancaire') "champ absent pour admin"

    # 8. Admin accede a un upload de dossier avec token en query
    $s = GetStatus "$base/uploads/1774287072389-380388601.pdf?token=$adminToken" @{}
    Check "Upload dossier avec token admin (query) -> 200" ($s -eq 200) "status=$s"

    # 9. Chat : PJ pointant hors chat-attachments -> rejetee (403 chat admin exclu = OK aussi)
    try {
        $body = @{ body = 'test'; attachment = @{ url = '/uploads/1774287072389-380388601.pdf'; name = 'vol.pdf' } } | ConvertTo-Json -Depth 4
        $r = Invoke-WebRequest -Uri "$base/api/chat/peer/1/messages" -Method Post -Body $body -ContentType 'application/json' -Headers $h -UseBasicParsing -TimeoutSec 10
        Check "Chat PJ url arbitraire rejetee" $false "message accepte (status $([int]$r.StatusCode))"
    } catch {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { -1 }
        Check "Chat PJ url arbitraire rejetee (400/403)" ($code -eq 400 -or $code -eq 403) "status=$code"
    }
} else {
    Write-Host "[SKIP] Login admin impossible (mot de passe modifie ?) -- tests 7-9 sautes" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Resultat : $pass OK, $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
