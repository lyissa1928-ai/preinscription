@echo off
REM Script de synchronisation vers GitHub
REM Double-cliquez ou exécutez : sync-github.bat

cd /d "%~dp0"

echo.
echo ========================================
echo   Synchronisation vers GitHub
echo ========================================
echo.

git add .
git status

set /p msg="Message du commit (ou Entree pour 'Mise a jour'): "
if "%msg%"=="" set msg=Mise a jour

git commit -m "%msg%"
if errorlevel 1 (
    echo.
    echo Aucun changement a committer.
    goto :push
)

:push
git push origin main
if errorlevel 1 (
    echo.
    echo ERREUR: Push echoue. Verifiez votre connexion et vos identifiants GitHub.
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Synchronisation terminee !
echo ========================================
echo.
pause
