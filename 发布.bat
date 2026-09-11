@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在发布...
echo.
git add -A
git commit -m "update"
git push
echo.
echo ================================
echo  推送完成，等一分钟左右网站更新
echo  https://colorful-white.github.io
echo ================================
echo.
pause
