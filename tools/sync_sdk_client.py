#!/usr/bin/env python3
# =============================================================================
# HYDRA-UMC-STUDIO - tools/sync_sdk_client.py
# Copyright (C) 2026 JuanenRac (Electro Hobby 3D)
# GPL-3.0-or-later - see LICENSE
# =============================================================================
"""Keeps src/generated/hydra-server-client.ts identical to the typed server client the SDK generates from the server contract.

    python tools/sync_sdk_client.py            # copy the SDK file over the vendored one
    python tools/sync_sdk_client.py --check    # fail when the vendored copy differs; skipped when no SDK checkout is found

The only change made to the file is its constructor: this app compiles with `erasableSyntaxOnly`, which refuses a parameter property, so
`constructor(private readonly transport: HydraTransport) {}` is written as a field and an assignment (same behaviour).

The SDK is the folder named by HYDRA_UMC_SDK_DIR (the continuous integration fetches the pinned tag there) or the one next to this repository.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENDORED = ROOT / "src" / "generated" / "hydra-server-client.ts"
RELATIVE = Path("generated") / "hydra-server-client.ts"


def _source() -> Path:
    env = os.environ.get("HYDRA_UMC_SDK_DIR")
    return (Path(env) if env else ROOT.parent / "HYDRA-UMC-SDK") / RELATIVE


def _text(path: Path) -> bytes:
    return path.read_bytes().replace(b"\r\n", b"\n")


PARAMETER_PROPERTY = b"  constructor(private readonly transport: HydraTransport) {}"
ERASABLE = b"  private readonly transport: HydraTransport;\n  constructor(transport: HydraTransport) {\n    this.transport = transport;\n  }"


def _for_app(source: Path) -> bytes:
    """The SDK file with the constructor written without a parameter property."""
    text = _text(source)
    if PARAMETER_PROPERTY not in text:
        raise SystemExit("FAIL: the constructor of the SDK client changed; update tools/sync_sdk_client.py")
    return text.replace(PARAMETER_PROPERTY, ERASABLE)


def main(argv: list[str]) -> int:
    source = _source()
    if not source.is_file():
        print("SKIP: no HYDRA-UMC-SDK checkout with the generated server client was found")
        return 0
    if "--check" in argv:
        if not VENDORED.is_file() or _text(VENDORED) != _for_app(source):
            print("FAIL: src/generated/hydra-server-client.ts differs from the SDK file; run python tools/sync_sdk_client.py", file=sys.stderr)
            return 1
        print("PASS: the vendored server client equals the SDK file")
        return 0
    VENDORED.parent.mkdir(parents=True, exist_ok=True)
    VENDORED.write_bytes(_for_app(source))
    print("copied the SDK server client")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
