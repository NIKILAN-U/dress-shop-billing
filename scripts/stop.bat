@echo off
echo Stopping Dress Shop Billing Server background processes...
taskkill /FI "WINDOWTITLE eq DressShopServer*" /F
echo Application stopped successfully.
pause
