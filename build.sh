#!/bin/bash
# =============================================================================
# HYDRA-UMC STUDIO - Build and Compile Script
# Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
# GPL-3.0 - see LICENSE
# =============================================================================

echo "========================================"
echo " HYDRA-UMC STUDIO"
echo " Build and Compile Script - installs dependencies and compiles the app"
echo " Author: JuanenRac (Electro Hobby 3D)"
echo " E-mail: electrohobby3d@gmail.com"
echo " License: GPL-3.0 - see LICENSE"
echo "========================================"
echo ""

echo "========================================"
echo " Installing dependencies... "
echo "========================================"
npm install
npm install-scripts approve --all

echo "========================================"
echo " Compiling HYDRA-UMC STUDIO (Prod Mode) "
echo "========================================"
npm run build
echo ""
echo "Build complete! You can now start the production server with:"
echo "npm start"
read -p "Press Enter to close..."
