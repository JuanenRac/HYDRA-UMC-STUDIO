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


PICTURE_CHECKS = (
    ("make_architecture.py", "architecture.json", ["--check"]),
    ("make_structure.py", "structure.json", ["--check", "--readmes"]),
)


def check(root: Path) -> list[str]:
    """Keep all model-independent Work files as the checked-in Cartesian source, and the two pictures of the README in step with their JSON and the file tree."""
    problems: list[str] = []
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
        problems.append(f"portable Work catalogue validation failed: {detail}")
    for script, spec, arguments in PICTURE_CHECKS:
        path = root / "tools" / script
        if not path.is_file() or not (root / "docs" / spec).is_file():
            continue
        picture = subprocess.run([sys.executable, "-I", str(path), *arguments], cwd=root, text=True, encoding="utf-8", errors="replace",
                                 capture_output=True, check=False)
        if picture.returncode != 0:
            problems.append(f"tools/{script} {' '.join(arguments)}: " + (picture.stdout + picture.stderr).strip().splitlines()[-1][:300])
    return problems
