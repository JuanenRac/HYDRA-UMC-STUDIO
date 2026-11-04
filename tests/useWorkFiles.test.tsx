// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/useWorkFiles.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// The WORKS folder of a robot (listing, save) and the G-code text of a recorded trajectory.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useWorkFiles } from '../src/hooks/useWorkFiles';
import { buildGCode, gcodeFileName } from '../src/lib/gcodeExport';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const base = {
  robotId: 3,
  robotName: 'Arm One',
  worksPaths: undefined as Record<number, string> | undefined,
  authToken: 'tok' as string | null,
  recordedPoints: [{ x: 1, y: 2, z: 3 }],
  selectedWorkFile: '',
  t: (_key: string, fallback: string) => fallback,
};

describe('the listing', () => {
  it('reads the index of the default folder (the robot name without spaces) and keeps only the names', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, ['a.json', 7, 'b.json']));
    const { result } = renderHook(() => useWorkFiles({ ...base, onSaved: () => undefined }));
    await waitFor(() => expect(result.current.workFiles).toEqual(['a.json', 'b.json']));
    expect(result.current.worksFolderPath).toBe('WORKS/ArmOne');
    expect(String(spy.mock.calls[0][0])).toContain('/WORKS/ArmOne/index.json');
  });

  it('uses the folder of the settings when there is one, and an empty list when the answer is not good', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(404, {}));
    const { result } = renderHook(() => useWorkFiles({ ...base, worksPaths: { 3: 'MY/FOLDER' }, onSaved: () => undefined }));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(String(spy.mock.calls[0][0])).toContain('/MY/FOLDER/index.json');
    expect(result.current.workFiles).toEqual([]);
  });
});

describe('the save', () => {
  it('does nothing without recorded points', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, []));
    const { result } = renderHook(() => useWorkFiles({ ...base, recordedPoints: [], onSaved: () => undefined }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    await act(async () => { await result.current.saveWorkFile(); });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('posts the points with the bearer token, adds .json and reports the name after reading the listing again', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('route_1');
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => (String(input).includes('upload-work') ? json(200, { ok: true }) : json(200, ['route_1.json'])));
    const saved: string[] = [];
    const { result } = renderHook(() => useWorkFiles({ ...base, onSaved: (name) => saved.push(name) }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    await act(async () => { await result.current.saveWorkFile(); });
    const post = spy.mock.calls.find((c) => String(c[0]).includes('upload-work'))!;
    expect((post[1]?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(JSON.parse(String(post[1]?.body))).toEqual({ folderPath: 'WORKS/ArmOne', fileName: 'route_1.json', content: base.recordedPoints });
    expect(saved).toEqual(['route_1.json']);
    expect(result.current.workFiles).toEqual(['route_1.json']);
  });

  it('keeps the name when the person cancels the prompt', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(200, []));
    const saved: string[] = [];
    const { result } = renderHook(() => useWorkFiles({ ...base, onSaved: (name) => saved.push(name) }));
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    await act(async () => { await result.current.saveWorkFile(); });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(saved).toEqual([]);
  });
});

describe('the G-code', () => {
  it('writes the header, one G1 line per point and the end of the program', () => {
    const text = buildGCode('Arm One', [{ x: 1, y: 2.5, z: 3, a: 10, b: 20, c: 30 }, { x: 4, y: 5, z: 6 }]);
    const lines = text.split('\n');
    expect(lines[0]).toBe('; HYDRA-UMC STUDIO - G-code export');
    expect(lines[1]).toBe('; Robot: Arm One');
    expect(lines[2]).toBe('; Points: 2');
    expect(text).toContain('G1 X1.000 Y2.500 Z3.000 A10.000 B20.000 C30.000 ; point 1');
    expect(text).toContain('G1 X4.000 Y5.000 Z6.000');
    expect(text.endsWith('M2 ; end of program\n')).toBe(true);
  });

  it('names the file after the robot with underscores', () => {
    expect(gcodeFileName('Arm  One')).toBe('Arm_One.gcode');
  });
});
