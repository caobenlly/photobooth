@echo off
set "JAVA_HOME=C:\Program Files\Java\jdk-17"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo --------------------------------------------------
echo        DANG KHOI CHAY GLOWBOOTH DESKTOP
echo --------------------------------------------------

:: Khoi chay backend trong mot cua so an hoac chay ngam
start /b java -jar target\photobooth-app-0.0.1-SNAPSHOT.jar

echo Dang cho ung dung san sang...
timeout /t 5 /nobreak > nul

:: Mo ung dung duoi dang cua so App doc lap (khong co thanh dia chi)
echo Dang mo cua so ung dung...
start msedge --app=http://localhost:8080 --window-size=1280,800

echo Hoan tat! Ban co the dong cua so den nay sau khi dung xong.
pause
