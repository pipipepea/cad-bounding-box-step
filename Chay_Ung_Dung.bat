@echo off
chcp 65001 >nul
echo ========================================================
echo   CAD STEP Bounding Box Inspector (Web_M)
echo   Dang khoi dong he thong...
echo ========================================================
echo.
cd /d "%~dp0web_m"
start "" http://localhost:5173/
npm run dev
pause
