@echo off
echo ===================================================
echo   LAUNCHING DRESS SHOP BILLING & INVENTORY SYSTEM
echo ===================================================
echo.

cd /d "%~dp0\.."

echo Starting Local Production Express Server...
set NODE_ENV=production
start "DressShopServer" cmd /k "cd backend && node src/server.js"

timeout /t 3 /nobreak >nul

echo Opening Dress Shop Billing Software in your Browser...
start http://localhost:5000

echo.
echo ===================================================
echo   APPLICATION IS RUNNING AT http://localhost:5000
echo   Default Credentials:
echo   - Admin: admin / admin123
echo   - Cashier: cashier / cashier123
echo ===================================================
