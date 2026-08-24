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
    $msg = $null
    try {
      $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $msg = ($sr.ReadToEnd() | ConvertFrom-Json)
    } catch {}
    return @{ s = $c; j = $msg }
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

$fo = Req Get "$base/api/formations?etablissement_id=1" $h $null
$form = ($fo.j | Where-Object { $_.actif -ne $false } | Select-Object -First 1)
Check "Formation disponible" ($null -ne $form) "s=$($fo.s)"

if ($form) {
  $c = Req Post "$base/api/responsable/demandes-proforma/creer" $h @{
    formation_id = $form.id
    prenom = 'Moussa'
    nom = 'Ba'
    telephone = '771112233'
    email = 'moussa.ba.walkin@test.sn'
    remise = 5000
  }
  Check "Saisie libre sans etudiant_id (201)" ($c.s -eq 201 -and $c.j.demande.facture.numero -and $null -eq $c.j.demande.etudiant_id) "s=$($c.s) msg=$($c.j.message) eid=$($c.j.demande.etudiant_id)"
  Check "Rattachee etablissement formation" ($c.j.demande.etablissement_id -eq $form.etablissement_id) "etab=$($c.j.demande.etablissement_id)"
  Check "Remise appliquee" ($c.j.demande.facture.remise -eq 5000) "remise=$($c.j.demande.facture.remise)"
  if ($c.j.demande.id) {
    $del = Req Post "$base/api/admin/demandes-proforma/delete-batch" $h @{ ids = @($c.j.demande.id) }
    Check "Nettoyage" ($del.s -eq 200) "s=$($del.s)"
  }
}

# Refuse sans nom
$bad = Req Post "$base/api/responsable/demandes-proforma/creer" $h @{ formation_id = $form.id; prenom = ''; nom = ''; telephone = '771112233' }
Check "Refuse sans nom/prenom (400)" ($bad.s -eq 400) "s=$($bad.s)"

Write-Host "=== $ok OK, $fail FAIL ===" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
