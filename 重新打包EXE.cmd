@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js，再重新运行此文件。
  pause
  exit /b 1
)
if not exist "node_modules\electron-builder\package.json" (
  call npm ci
  if errorlevel 1 goto failed
)
call npm test
if errorlevel 1 goto failed
call npm run build:exe
if errorlevel 1 goto failed
echo 打包完成，EXE 位于 release 文件夹。
explorer "%~dp0release"
pause
exit /b 0
:failed
echo 打包失败，请查看上方错误信息。
pause
exit /b 1
