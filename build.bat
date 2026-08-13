@echo off
REM =============================================================================
REM HYDRA-UMC STUDIO - Build and Compile Script
REM Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
REM GPL-3.0 - see LICENSE
REM =============================================================================

echo ========================================
echo  Installing dependencies... 
echo ========================================
call npm install
call npm install-scripts approve --all

echo ========================================
echo  Compiling HYDRA-UMC STUDIO (Prod Mode) 
echo ========================================
call npm run build
echo.
echo Build complete! You can now start the production server with:
echo npm start
pause
