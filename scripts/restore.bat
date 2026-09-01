@echo off
echo ===================================================
echo   RESTORE DRESS SHOP DATABASE SNAPSHOT
echo ===================================================
echo.

set /p BACKUP_FILE="Enter backup filename to restore (e.g. backup-2026-09-01.json): "

cd /d "%~dp0\..\backend"
node -e "import('./src/controllers/backupController.js').then(m => m.restoreBackup({body:{filename:'%BACKUP_FILE%'}, user:{name:'Script'}}, {json: (d)=>console.log(d.message)}))"

echo.
pause
