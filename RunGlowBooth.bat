@echo off
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo --------------------------------------------------
echo        DANG KHOI CHAY TINIIBOOTH DESKTOP
echo --------------------------------------------------

:: Khoi chay backend trong mot cua so an hoac chay ngam
start /b java -jar target\photobooth-app-0.0.1-SNAPSHOT.jar --server.port=8081 --dslr.capture.folder=C:/Users/Admin/Pictures

echo Dang cho ung dung san sang...
timeout /t 5 /nobreak > nul

:: Mo ung dung duoi dang cua so App doc lap (khong co thanh dia chi)
echo Dang mo cua so ung dung...
start msedge --app=http://localhost:8081 --window-size=1280,800

echo Hoan tat! Ban co the dong cua so den nay sau khi dung xong.
pause
