#!/usr/bin/env python3
# =============================================================================
# HYDRA-UMC-STUDIO - generate_portable_works.py
# Generates deterministic Cartesian Work trajectories shared by every robot.
# Copyright (C) 2026 JuanenRac (Electro Hobby 3D)
# <electrohobby3d@gmail.com>
# GPL-3.0 - see LICENSE
# =============================================================================
"""Generate the portable A1-A8 Work catalogue.

The original files were a collection of joint angles.  Such angles have no
portable drawing meaning because A1-A8 use different kinematic models.  These
files deliberately contain only a Cartesian XZ path, centred in the same
workspace already validated with the A1 circle Work.  Studio resolves a path
for the selected model immediately before it is sent to Server.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Callable


ROOT = Path(__file__).resolve().parents[1]
WORKS_ROOT = ROOT / "public" / "WORKS"
ROBOTS = tuple(f"RobotA{number}" for number in range(1, 9))
FILES = (
    "aplicacion_pegamento.json",
    "escalera_dibujo.json",
    "impresion_espiral.json",
    "inspeccion_optica.json",
    "mover_objetos_palet.json",
    "pintado_panel.json",
    "silueta_arbol.json",
    "soldadura_chasis.json",
)


def point(x: float, z: float) -> dict[str, float]:
    """Create a stable, human-readable Cartesian point in the validated XZ plane."""
    return {"x": round(x, 2), "y": 0.0, "z": round(z, 2), "a": 0.0, "b": 0.0, "c": 0.0}


def interpolate(vertices: list[tuple[float, float]], count: int) -> list[dict[str, float]]:
    """Sample a polyline by distance without losing its intended outline."""
    if len(vertices) < 2:
        raise ValueError("a Work outline requires at least two vertices")
    lengths = [math.hypot(x2 - x1, z2 - z1) for (x1, z1), (x2, z2) in zip(vertices, vertices[1:])]
    total = sum(lengths)
    if total <= 0:
        raise ValueError("a Work outline must have a non-zero length")
    targets = [total * index / (count - 1) for index in range(count)]
    result: list[dict[str, float]] = []
    segment = 0
    travelled = 0.0
    for target in targets:
        while segment < len(lengths) - 1 and target > travelled + lengths[segment]:
            travelled += lengths[segment]
            segment += 1
        x1, z1 = vertices[segment]
        x2, z2 = vertices[segment + 1]
        ratio = 0.0 if lengths[segment] == 0 else (target - travelled) / lengths[segment]
        result.append(point(x1 + (x2 - x1) * ratio, z1 + (z2 - z1) * ratio))
    return result


def rounded_rectangle() -> list[dict[str, float]]:
    """Closed adhesive bead around a 100 x 80 mm panel, with rounded corners."""
    centre_x, centre_z, half_x, half_z, radius = 200.0, 20.0, 50.0, 40.0, 10.0
    corners = ((centre_x + half_x - radius, centre_z + half_z - radius, 0.0),
               (centre_x - half_x + radius, centre_z + half_z - radius, 90.0),
               (centre_x - half_x + radius, centre_z - half_z + radius, 180.0),
               (centre_x + half_x - radius, centre_z - half_z + radius, 270.0))
    values: list[dict[str, float]] = []
    for corner_x, corner_z, start in corners:
        for step in range(16):
            angle = math.radians(start + step * 90.0 / 16.0)
            values.append(point(corner_x + radius * math.cos(angle), corner_z + radius * math.sin(angle)))
    values.append(values[0])
    return values


def spiral() -> list[dict[str, float]]:
    """Three-turn Archimedean spiral from the centre to the safe outer radius."""
    values: list[dict[str, float]] = []
    for step in range(97):
        ratio = step / 96.0
        angle = math.radians(1080.0 * ratio)
        radius = 5.0 + 50.0 * ratio
        values.append(point(200.0 + radius * math.cos(angle), 20.0 + radius * math.sin(angle)))
    return values


def raster(rows: int, *, x_min: float = 150.0, x_max: float = 250.0, z_min: float = -25.0, z_max: float = 65.0) -> list[dict[str, float]]:
    """Continuous boustrophedon coverage path for inspection or painting."""
    vertices: list[tuple[float, float]] = []
    for row in range(rows):
        z = z_min + (z_max - z_min) * row / (rows - 1)
        vertices.append((x_min if row % 2 == 0 else x_max, z))
        vertices.append((x_max if row % 2 == 0 else x_min, z))
    return interpolate(vertices, rows * 10)


def pallet_route() -> list[dict[str, float]]:
    """Four placement cells joined in one visible pick-and-place demonstration path."""
    cells = ((165.0, 48.0), (215.0, 48.0), (165.0, -8.0), (215.0, -8.0))
    vertices: list[tuple[float, float]] = []
    for centre_x, centre_z in cells:
        vertices.extend(((centre_x - 16, centre_z - 13), (centre_x + 16, centre_z - 13),
                         (centre_x + 16, centre_z + 13), (centre_x - 16, centre_z + 13),
                         (centre_x - 16, centre_z - 13)))
    return interpolate(vertices, 85)


def tree_outline() -> list[dict[str, float]]:
    """Recognisable trunk and layered evergreen outline in the common XZ plane."""
    vertices = [(195, -35), (205, -35), (205, -8), (232, -8), (214, 13), (238, 13),
                (211, 39), (228, 39), (200, 75), (172, 39), (189, 39), (162, 13),
                (186, 13), (168, -8), (195, -8), (195, -35)]
    return interpolate(vertices, 61)


def chassis() -> list[dict[str, float]]:
    """Weld seam around a chassis frame followed by both structural diagonals."""
    vertices = [(150, -30), (250, -30), (250, 70), (150, 70), (150, -30),
                (250, 70), (150, 70), (250, -30)]
    return interpolate(vertices, 73)


CATALOGUE: dict[str, Callable[[], list[dict[str, float]]]] = {
    "aplicacion_pegamento.json": rounded_rectangle,
    "escalera_dibujo.json": lambda: interpolate([(155, -30), (155, 65), (245, 65), (245, 42), (155, 42), (155, 19), (245, 19), (245, -4), (155, -4), (155, -30)], 61),
    "impresion_espiral.json": spiral,
    "inspeccion_optica.json": lambda: raster(7),
    "mover_objetos_palet.json": pallet_route,
    "pintado_panel.json": lambda: raster(10),
    "silueta_arbol.json": tree_outline,
    "soldadura_chasis.json": chassis,
}


def validate(points: list[dict[str, float]], file_name: str) -> None:
    """Reject accidental joint-space regressions before a catalogue is written."""
    if len(points) < 2:
        raise ValueError(f"{file_name}: needs at least two points")
    for index, item in enumerate(points, start=1):
        if set(item) != {"x", "y", "z", "a", "b", "c"}:
            raise ValueError(f"{file_name}: point {index} is not a portable Cartesian point")
        if not all(isinstance(value, (int, float)) and math.isfinite(value) for value in item.values()):
            raise ValueError(f"{file_name}: point {index} contains a non-finite value")
        if item["y"] != 0.0:
            raise ValueError(f"{file_name}: point {index} left the validated XZ plane")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="validate the generated source catalogue without writing files")
    args = parser.parse_args()

    generated = {file_name: factory() for file_name, factory in CATALOGUE.items()}
    if set(generated) != set(FILES):
        raise ValueError("catalogue and declared Work files must match exactly")
    for file_name, points in generated.items():
        validate(points, file_name)

    if args.check:
        mismatches: list[str] = []
        for robot in ROBOTS:
            for file_name, points in generated.items():
                target = WORKS_ROOT / robot / file_name
                try:
                    actual = json.loads(target.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError) as exc:
                    mismatches.append(f"{robot}/{file_name}: unreadable ({exc})")
                    continue
                if actual != points:
                    mismatches.append(f"{robot}/{file_name}: differs from canonical Cartesian path")
        if mismatches:
            print(f"PORTABLE_WORK_CATALOG=FAIL files={len(generated)} robots={len(ROBOTS)} mismatches={len(mismatches)}")
            for mismatch in mismatches[:10]:
                print(mismatch)
            return 1
        print(f"PORTABLE_WORK_CATALOG=PASS files={len(generated)} robots={len(ROBOTS)} mode=check")
        return 0

    for robot in ROBOTS:
        target = WORKS_ROOT / robot
        for file_name, points in generated.items():
            (target / file_name).write_text(json.dumps(points, indent=2) + "\n", encoding="utf-8")
    print(f"PORTABLE_WORK_CATALOG=GENERATED files={len(generated)} robots={len(ROBOTS)} plane=XZ")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
