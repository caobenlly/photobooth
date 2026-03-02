@echo off
setlocal
title GlowBooth Portable Launcher

echo --------------------------------------------------
echo        DANG KHOI CHAY GLOWBOOTH PORTABLE
echo --------------------------------------------------

:: 1. Kiem tra Java
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Khong tim thay Java tren may nay!
    echo Vui long cai dat Java 17 hoac moi hon de chay ung dung.
    echo Ban co the tai tai: https://www.oracle.com/java/technologies/downloads/
    pause
    exit /b
)

:: 2. Chay ung dung
echo Dang khoi dong may chu...
start /b java -jar GlowBooth.jar

:: 3. Cho doi va mo cua so App
echo Dang cho ung dung san sang (5s)...
timeout /t 5 /nobreak > nul

echo Dang mo cua so Photo Booth...
:: Thu bat bang Edge App Mode
start msedge --app=http://localhost:8080 --window-size=1200,800

if %errorlevel% neq 0 (
    echo Khong tim thay Edge, dang thu mo bang trinh duyet mac dinh...
    start http://localhost:8080
)

echo.
echo [OK] Ung dung dang chay! 
echo Dung dong cua so nay cho den khi ban muon tat ung dung.
echo --------------------------------------------------
pause
