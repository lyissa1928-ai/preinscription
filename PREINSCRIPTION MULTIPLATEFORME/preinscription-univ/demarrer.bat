@echo off
echo ============================================
echo   APPLICATION PREINSCRIPTION UNIVERSITAIRE
echo ============================================
echo.

echo [1/2] Installation des dependances Backend...
cd /d "%~dp0backend"
call npm install
if %errorlevel% neq 0 (echo ERREUR installation backend & pause & exit /b)

echo.
echo [2/2] Installation des dependances Frontend...
cd /d "%~dp0frontend"
call npm install
if %errorlevel% neq 0 (echo ERREUR installation frontend & pause & exit /b)

echo.
echo ============================================
echo   Demarrage des serveurs...
echo   Backend  : http://localhost:5000
echo   Frontend : http://localhost:5173
echo ============================================
echo.

cd /d "%~dp0backend"
start "Backend API" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

cd /d "%~dp0frontend"
start "Frontend React" cmd /k "npm run dev"

timeout /t 5 /nobreak >nul
start http://localhost:5173

echo Application lancee ! Appuyez sur une touche pour fermer ce script.
pause


