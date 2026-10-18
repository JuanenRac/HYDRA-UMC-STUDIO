#!/bin/bash
# =============================================================================
# HYDRA-UMC STUDIO - Development Server Start Script
# Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
# GPL-3.0 - see LICENSE
# =============================================================================

echo "========================================"
echo " HYDRA-UMC STUDIO"
echo " Development Server Start Script - installs dependencies and starts the dev server"
echo " Author: JuanenRac (Electro Hobby 3D)"
echo " E-mail: electrohobby3d@gmail.com"
echo " License: GPL-3.0 - see LICENSE"
echo "========================================"
echo ""

echo "========================================"
echo " Installing dependencies... "
echo "========================================"
npm install

echo "========================================"
echo " Starting HYDRA-UMC STUDIO (Dev Mode) "
echo "========================================"
npm run dev
if [ -t 0 ] && [ "${HYDRA_UMC_CI:-}" != "1" ] && [ -z "${CI:-}" ]; then read -r -p "Press Enter to close..." _ || true; fi
