@echo off
REM =============================================================================
REM HYDRA-UMC STUDIO - Development Server Start Script
REM Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
REM GPL-3.0 - see LICENSE
REM =============================================================================

echo ========================================
echo  Installing dependencies... 
echo ========================================
call npm install
call npm install-scripts approve --all
call npm audit fix

echo ========================================
echo  Starting HYDRA-UMC STUDIO (Dev Mode) 
echo ========================================
call npm run dev
pause
