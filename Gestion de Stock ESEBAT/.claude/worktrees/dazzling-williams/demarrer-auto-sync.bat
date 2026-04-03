@echo off
REM Lance la synchronisation automatique vers GitHub
REM Gardez cette fenetre ouverte - les changements seront push automatiquement

cd /d "%~dp0"

echo Installation des dependances (premiere fois uniquement)...
call npm install 2>nul

echo.
echo Demarrage de l'auto-sync...
echo.
node auto-sync.js

pause
