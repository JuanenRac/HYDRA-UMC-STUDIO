#!/usr/bin/env python3
# =============================================================================
# HYDRA-UMC-STUDIO - tools/extra_checks.py
# Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
# GPL-3.0-or-later - see LICENSE
# =============================================================================
"""The checks of this repository beyond the shared validator (tools/ci_validate.py runs check())."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def check(root: Path) -> list[str]:
    """Keep all model-independent Work files as the checked-in Cartesian source."""
    result = subprocess.run(
        (sys.executable, "tools/generate_portable_works.py", "--check"),
        cwd=root,
        text=True, encoding="utf-8", errors="replace",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stdout.strip().replace("\n", "; ")
        return [f"portable Work catalogue validation failed: {detail}"]
    return []
