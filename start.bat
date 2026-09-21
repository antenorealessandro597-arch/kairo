@echo off
cd /d "%~dp0"
if not exist node_modules echo Instalando dependencias... & npm install
npm run check
if errorlevel 1 pause & exit /b 1
npm start
pause
