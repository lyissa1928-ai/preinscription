# Smoke test : fonction "responsable d'etablissement" comme responsabilite supplementaire
# Scenario e2e : un COMPTABLE est designe responsable -> il obtient les droits responsable
# (dossiers, conditions d'admission) sans changer de role, et les perd au retrait.
# Usage : powershell -ExecutionPolicy Bypass -File .\scripts\smoke-responsable-fonction.ps1
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:5000'
$pass = 0
$fail = 0

function Check($name, $ok, $detail) {
    if ($ok) { Write-Host "[OK]   $name" -ForegroundColor Green; $script:pass++ }
    else     { Write-Host "[FAIL] $name -- $detail" -ForegroundColor Red; $script:fail++ }
}

function Req($method, $url, $headers, $bodyObj) {
    try {
        $params = @{ Uri = $url; Method = $method; UseBasicParsing = $true; TimeoutSec = 15 }
        if ($headers) { $params.Headers = $headers }
        if ($null -ne $bodyObj) {
            $params.Body = ($bodyObj | ConvertTo-Json -Depth 6)
            $params.ContentType = 'application/json'
        }
        $r = Invoke-WebRequest @params
        return @{ status = [int]$r.StatusCode; json = ($r.Content | ConvertFrom-Json) }
    } catch {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { -1 }
        $content = $null
        try {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $content = $reader.ReadToEnd() | ConvertFrom-Json
        } catch { }
        return @{ status = $code; json = $content }
    }
}

Write-Host ""
Write-Host "=== Smoke : fonction responsable d'etablissement ===" -ForegroundColor Cyan

# 0. Login admin
$r = Req 'Post' "$base/api/auth/connexion" $null @{ email = 'admin@universite.sn'; mot_de_passe = 'Admin123!' }
$adminToken = $r.json.token
Check "Login admin" ($null -ne $adminToken) "status=$($r.status)"
if (-not $adminToken) { Write-Host "Abandon : login admin impossible." -ForegroundColor Red; exit 1 }
$ha = @{ Authorization = "Bearer $adminToken" }

$etabId = 1
$stamp = Get-Date -Format 'HHmmss'
$emailTest = "smoke.fonction.$stamp@test.sn"
$pwd1 = 'SmokeTest123!'
$pwd2 = 'SmokeTest456!'

# 1. Creer un membre COMPTABLE de test dans l'etablissement 1
$r = Req 'Post' "$base/api/etablissements/$etabId/membres" $ha @{
    prenom = 'Smoke'; nom = 'Fonction'; email = $emailTest
    mot_de_passe = $pwd1; mot_de_passe_confirmation = $pwd1
    role = 'comptable'; date_naissance = '1990-01-01'; telephone = "77$stamp$stamp".Substring(0, 12)
}
$memberId = $r.json.id
$memberMatricule = $r.json.matricule
Check "Creation membre comptable de test (201)" ($r.status -eq 201 -and $memberId) "status=$($r.status) msg=$($r.json.message)"
if (-not $memberId) { Write-Host "Abandon." -ForegroundColor Red; exit 1 }

# 2. Login comptable + changement de mot de passe obligatoire
$r = Req 'Post' "$base/api/auth/connexion" $null @{ email = $emailTest; mot_de_passe = $pwd1 }
$tokenTmp = $r.json.token
Check "Login comptable initial" ($null -ne $tokenTmp) "status=$($r.status)"
$r = Req 'Post' "$base/api/auth/changer-mot-de-passe-obligatoire" @{ Authorization = "Bearer $tokenTmp" } @{
    matricule = $memberMatricule; ancien_mot_de_passe = $pwd1; nouveau_mot_de_passe = $pwd2; confirmation = $pwd2
}
Check "Changement mot de passe obligatoire" ($r.status -eq 200) "status=$($r.status) msg=$($r.json.message)"
$r = Req 'Post' "$base/api/auth/connexion" $null @{ email = $emailTest; mot_de_passe = $pwd2 }
$cToken = $r.json.token
$fonctionsAvant = $r.json.utilisateur.fonctions
Check "Re-login comptable" ($null -ne $cToken) "status=$($r.status)"
$hc = @{ Authorization = "Bearer $cToken" }

# 3. AVANT designation : zone responsable refusee (403), fonctions vides
$r = Req 'Get' "$base/api/responsable/dossiers" $hc $null
Check "Avant designation : /api/responsable/dossiers -> 403" ($r.status -eq 403) "status=$($r.status)"
Check "Avant designation : fonctions vides dans le login" (-not $fonctionsAvant -or $fonctionsAvant.Count -eq 0) "fonctions=$fonctionsAvant"

# 4. Validations de l'endpoint de designation
$r = Req 'Put' "$base/api/etablissements/$etabId/responsable" $ha @{ utilisateur_id = 999999 }
Check "Designer un utilisateur inexistant -> 404" ($r.status -eq 404) "status=$($r.status)"

# Trouver un etudiant pour verifier le refus
$r = Req 'Get' "$base/api/admin/utilisateurs?role=etudiant&limit=1" $ha $null
$etudiantId = $null
if ($r.json.items) { $etudiantId = ($r.json.items | Select-Object -First 1).id }
if ($etudiantId) {
    $r = Req 'Put' "$base/api/etablissements/$etabId/responsable" $ha @{ utilisateur_id = $etudiantId }
    Check "Designer un etudiant -> 400 (contrainte metier)" ($r.status -eq 400) "status=$($r.status)"
} else {
    Write-Host "[SKIP] Aucun etudiant trouve pour le test de refus" -ForegroundColor Yellow
}

# 5. Designer le COMPTABLE comme responsable (roles differents : c'est le point cle)
$r = Req 'Put' "$base/api/etablissements/$etabId/responsable" $ha @{ utilisateur_id = $memberId }
Check "Designation du comptable comme responsable -> 200" ($r.status -eq 200) "status=$($r.status) msg=$($r.json.message)"

# 6. APRES designation : droits responsable actifs, role principal conserve
$r = Req 'Get' "$base/api/auth/me" $hc $null
$roleApres = $r.json.role
$fonctionsApres = $r.json.fonctions
Check "Role principal conserve (comptable)" ($roleApres -eq 'comptable') "role=$roleApres"
Check "Fonction 'responsable' presente dans /me" ($fonctionsApres -contains 'responsable') "fonctions=$fonctionsApres"

$r = Req 'Get' "$base/api/responsable/dossiers" $hc $null
Check "Apres designation : /api/responsable/dossiers -> 200" ($r.status -eq 200) "status=$($r.status)"

$r = Req 'Get' "$base/api/conditions-admission/me" $hc $null
Check "Apres designation : conditions d'admission -> 200" ($r.status -eq 200) "status=$($r.status)"

$r = Req 'Get' "$base/api/responsable/demandes-proforma?limit=5" $hc $null
Check "Demandes proforma accessibles (decision facturation) -> 200" ($r.status -eq 200) "status=$($r.status)"

# 7. Scoping : pas d'acces pedagogique a un AUTRE etablissement
$r = Req 'Post' "$base/api/etablissements/2/filieres" $hc @{ nom = 'Intrusion' }
Check "Ecriture pedagogique sur un autre etablissement -> 403" ($r.status -eq 403) "status=$($r.status)"

# 8. Retrait de la designation : droits revoques immediatement
$r = Req 'Put' "$base/api/etablissements/$etabId/responsable" $ha @{ utilisateur_id = $null }
Check "Retrait de la designation -> 200" ($r.status -eq 200) "status=$($r.status)"
$r = Req 'Get' "$base/api/responsable/dossiers" $hc $null
Check "Apres retrait : /api/responsable/dossiers -> 403 (revocation immediate)" ($r.status -eq 403) "status=$($r.status)"

# 9. Nettoyage : suppression definitive du compte de test
$r = Req 'Post' "$base/api/etablissements/$etabId/membres/$memberId/supprimer-definitif" $ha @{ confirmation_email = $emailTest }
Check "Nettoyage : suppression du compte de test" ($r.status -eq 200) "status=$($r.status) msg=$($r.json.message)"

Write-Host ""
Write-Host "=== Resultat : $pass OK, $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
if ($fail -gt 0) { exit 1 }
