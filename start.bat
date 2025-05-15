@echo off
echo 正在启动小蕾...
cd /d %~dp0
npm run electron:serve
pause 