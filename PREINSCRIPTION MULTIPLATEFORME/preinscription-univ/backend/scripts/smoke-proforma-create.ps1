$ErrorActionPreference = 'Continue'
$base = 'http://localhost:5000'
function Req($m, $u, $h, $b) {
  try {
    $p = @{ Uri = $u; Method = $m; UseBasicParsing = $true; TimeoutSec = 15 }
    if ($h) { $p.Headers = $h }
    if ($null -ne $b) { $p.Body = ($b | ConvertTo-Json -Depth 5); $p.ContentType = 'application/json' }
    $r = Invoke-WebRequest @p
    return @{ s = [int]$r.StatusCode; j = ($r.Content | ConvertFrom-Json) }
  } catch {
    $c = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { -1 }
    return @{ s = $c; j = $null }
  }
}
$ok = 0; $fail = 0
function Check($n, $cond, $d) {
  if ($cond) { Write-Host "[OK] $n" -ForegroundColor Green; $script:ok++ }
  else { Write-Host "[FAIL] $n -- $d" -ForegroundColor Red; $script:fail++ }
}

$r = Req Post "$base/api/auth/connexion" $null @{ email = 'admin@universite.sn'; mot_de_passe = 'Admin123!' }
$token = $r.j.token
Check "Login admin" ($null -ne $token) "s=$($r.s)"
$h = @{ Authorization = "Bearer $token" }

$et = Req Get "$base/api/responsable/etudiants?etablissement_id=1" $h $null
$etu = $et.j.etudiants | Select-Object -First 1
Check "Recherche etudiants staff" ($null -ne $etu) "count=$($et.j.etudiants.Count)"

$fo = Req Get "$base/api/formations?etablissement_id=1" $h $null
$form = ($fo.j | Where-Object { $_.actif -ne $false } | Select-Object -First 1)
Check "Formations etab 1" ($null -ne $form) "s=$($fo.s)"

if ($etu -and $form) {
  $c = Req Post "$base/api/responsable/demandes-proforma/creer" $h @{ etudiant_id = $etu.id; formation_id = $form.id }
  Check "Admin cree proforma (201)" ($c.s -eq 201 -and $c.j.demande.facture.numero) "s=$($c.s) msg=$($c.j.message)"
  if ($c.j.demande.id) {
    $del = Req Post "$base/api/admin/demandes-proforma/delete-batch" $h @{ ids = @($c.j.demande.id) }
    Check "Nettoyage demande test" ($del.s -eq 200) "s=$($del.s)"
  }
}

$d = Req Get "$base/api/admin/dossiers?page=1&limit=5" $h $null
Check "API admin dossiers" ($d.s -eq 200) "s=$($d.s)"

Write-Host "=== $ok OK, $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
