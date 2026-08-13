#!/bin/bash
# =============================================================================
# HYDRA-UMC STUDIO - Development Server Start Script
# Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
# GPL-3.0 - see LICENSE
# =============================================================================

echo "========================================"
echo " Installing dependencies... "
echo "========================================"
npm install
npm install-scripts approve --all

echo "========================================"
echo " Starting HYDRA-UMC STUDIO (Dev Mode) "
echo "========================================"
npm run dev
