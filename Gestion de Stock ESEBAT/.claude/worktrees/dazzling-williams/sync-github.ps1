# Script de synchronisation vers GitHub
# Exécutez : .\sync-github.ps1

Set-Location $PSScriptRoot

Write-Host ""
Write-Host "========================================"
Write-Host "  Synchronisation vers GitHub"
Write-Host "========================================"
Write-Host ""

git add .
git status

$msg = Read-Host "Message du commit (ou Entree pour 'Mise a jour')"
if ([string]::IsNullOrWhiteSpace($msg)) { $msg = "Mise a jour" }

git commit -m $msg
if ($LASTEXITCODE -eq 0) {
    git push origin main
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Synchronisation terminee !" -ForegroundColor Green
    } else {
        Write-Host "Erreur: Push echoue." -ForegroundColor Red
    }
} else {
    Write-Host "Aucun changement a committer." -ForegroundColor Yellow
    git push origin main
}
