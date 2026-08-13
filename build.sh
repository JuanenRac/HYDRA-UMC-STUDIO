#!/bin/bash
# =============================================================================
# HYDRA-UMC STUDIO - Build and Compile Script
# Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
# GPL-3.0 - see LICENSE
# =============================================================================

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
