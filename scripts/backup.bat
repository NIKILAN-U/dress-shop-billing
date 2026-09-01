@echo off
echo ===================================================
echo   CREATING DRESS SHOP DATABASE BACKUP
echo ===================================================
echo.

cd /d "%~dp0\..\backend"
node -e "import('./src/controllers/backupController.js').then(m => m.createBackup({user:{name:'Script'}}, {json: (d)=>console.log(d.message)}))"

echo.
pause
