@echo off
set "JAVA_HOME=C:\Program Files\Java\jdk-17"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo Đang khởi động GlowBooth...
echo Vui lòng đợi trong giây lát để Maven tự động tải về (chỉ lần đầu)...
.\mvnw spring-boot:run
pause
