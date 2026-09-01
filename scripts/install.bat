@echo off
echo ===================================================
echo   DRESS SHOP BILLING SOFTWARE - ONE-CLICK INSTALLER
echo ===================================================
echo.

cd /d "%~dp0\.."

echo [1/3] Installing Backend dependencies...
cd backend
call npm install
cd ..

echo [2/3] Installing Frontend dependencies...
cd frontend
call npm install

echo [3/3] Building Production Frontend Bundle...
call npm run build
cd ..

echo.
echo ===================================================
echo   INSTALLATION COMPLETED SUCCESSFULLY!
echo   You can now run start.bat to launch the application.
echo ===================================================
pause
