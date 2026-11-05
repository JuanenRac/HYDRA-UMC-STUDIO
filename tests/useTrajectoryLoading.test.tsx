// @vitest-environment jsdom
// =============================================================================
// HYDRA-UMC STUDIO - tests/useTrajectoryLoading.test.tsx
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0-or-later - see LICENSE
//
// Loading a saved Work or an example into a robot and uploading a Work file: which folder is read, what is sent and what
// is kept when the server does not answer.
// =============================================================================
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useTrajectoryLoading, worksFolderFor } from '../src/hooks/useTrajectoryLoading';
import { examples } from '../src/examples/kinematics';
import { defaultControllers, type RobotState } from '../src/store';

const okResult = { ok: true, status: 200, code: null, detail: null, serverCode: null, warnings: [] };
const robotA = { ...(defaultControllers[0].robots[0] as RobotState), id: 1, name: 'Arm One' } as RobotState;
const robotB = { ...robotA, id: 2, name: 'Arm Two' } as RobotState;

function setup(over: Partial<Parameters<typeof useTrajectoryLoading>[0]> = {}) {
  const sendRobotCommand = vi.fn(async () => okResult);
  const updateRobot = vi.fn();
  const sendUnlessUnreachable = vi.fn(async (_r: unknown, _d: unknown, send: () => Promise<unknown>) => { await send(); });
  const fetchWorks = vi.fn(async () => undefined);
  const setSelectedWorkFile = vi.fn();
  const setSelectedExample = vi.fn();
  const uploadWorkFileRef = { current: { value: 'x' } as unknown as HTMLInputElement };
  const view = renderHook(() => useTrajectoryLoading({
    robot: robotA, robots: [robotA, robotB], worksPaths: undefined, authToken: null,
    sendRobotCommand: sendRobotCommand as never, updateRobot, sendUnlessUnreachable: sendUnlessUnreachable as never,
    fetchWorks, setSelectedWorkFile, setSelectedExample, uploadWorkFileRef, ...over,
  }));
  return { ...view, sendRobotCommand, updateRobot, sendUnlessUnreachable, fetchWorks, setSelectedWorkFile, setSelectedExample, uploadWorkFileRef };
}

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('the folder of the Works of a robot', () => {
  it('uses the configured folder, or WORKS plus the name without blanks', () => {
    expect(worksFolderFor({ id: 1, name: 'Arm One' }, undefined)).toBe('WORKS/ArmOne');
    expect(worksFolderFor({ id: 1, name: 'Arm One' }, { 1: 'MY/FOLDER' })).toBe('MY/FOLDER');
    expect(worksFolderFor({ id: 2, name: 'Arm One' }, { 1: 'MY/FOLDER' })).toBe('WORKS/ArmOne');
  });
});

describe('loading an example', () => {
  it('keeps the choice and sends nothing when the example does not exist', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const h = setup();
    await act(() => h.result.current.loadExample('no-such-example'));
    expect(h.setSelectedExample).toHaveBeenCalledWith('no-such-example');
    expect(h.updateRobot).toHaveBeenCalledWith(1, { selectedExample: 'no-such-example' });
    expect(h.sendUnlessUnreachable).not.toHaveBeenCalled();
  });

  it('goes through the reach gate and sends the trajectory command of the robot shown', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const h = setup();
    await act(() => h.result.current.loadExample(examples[0].id));
    expect(h.setSelectedExample).toHaveBeenCalledWith(examples[0].id);
    expect(h.sendUnlessUnreachable).toHaveBeenCalledTimes(1);
    expect(h.sendRobotCommand).toHaveBeenCalledTimes(1);
    expect((h.sendRobotCommand.mock.calls[0] as unknown[])[0]).toBe(1);
  });

  it('restores the previous choice when the reach gate declines', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const sendUnlessUnreachable = vi.fn(async (_r: unknown, decline: () => void) => { decline(); });
    const h = setup({ sendUnlessUnreachable: sendUnlessUnreachable as never });
    await act(() => h.result.current.loadExample(examples[0].id));
    expect(h.setSelectedExample).toHaveBeenLastCalledWith(robotA.selectedExample || '');
    expect(h.sendRobotCommand).not.toHaveBeenCalled();
  });
});

describe('loading an example into another robot of a group', () => {
  it('does nothing for an unknown example or robot', async () => {
    const h = setup();
    await act(() => h.result.current.loadExampleForRobot(2, 'no-such-example'));
    await act(() => h.result.current.loadExampleForRobot(99, examples[0].id));
    expect(h.sendUnlessUnreachable).not.toHaveBeenCalled();
  });

  it('sends the trajectory command to the target robot', async () => {
    const h = setup();
    await act(() => h.result.current.loadExampleForRobot(2, examples[0].id));
    expect(h.sendRobotCommand).toHaveBeenCalledTimes(1);
    expect((h.sendRobotCommand.mock.calls[0] as unknown[])[0]).toBe(2);
  });
});

describe('loading a saved Work', () => {
  it('an empty name only clears the selection', async () => {
    const h = setup();
    await act(() => h.result.current.loadWorkFile(''));
    expect(h.setSelectedWorkFile).toHaveBeenCalledWith('');
    expect(h.updateRobot).toHaveBeenCalledWith(1, { selectedWorkFile: '' });
  });

  it('reads the file from the folder of the robot and sends its points', async () => {
    const fetchMock = vi.fn(async (_url: string) => ({ ok: true, json: async () => examples[0].points }));
    vi.stubGlobal('fetch', fetchMock);
    const h = setup();
    await act(() => h.result.current.loadWorkFile('a.json'));
    expect(String(fetchMock.mock.calls[0][0])).toContain('/WORKS/ArmOne/a.json');
    expect(h.sendUnlessUnreachable).toHaveBeenCalledTimes(1);
    expect(h.sendRobotCommand).toHaveBeenCalledTimes(1);
  });

  it('keeps the selection when the file cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
    const h = setup();
    await act(() => h.result.current.loadWorkFile('a.json'));
    expect(h.updateRobot).toHaveBeenCalledWith(1, { selectedWorkFile: 'a.json' });
    expect(h.sendRobotCommand).not.toHaveBeenCalled();
  });

  it('keeps the selection when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down'); }));
    const h = setup();
    await act(() => h.result.current.loadWorkFile('a.json'));
    expect(h.updateRobot).toHaveBeenCalledWith(1, { selectedWorkFile: 'a.json' });
  });
});

describe('uploading a Work file', () => {
  const pick = (name: string, text: string) => ({ target: { files: [new File([text], name, { type: 'application/json' })] } }) as never;

  it('posts the parsed content with the bearer token, reads the listing again and loads the file', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: unknown) => (String(url).includes('/api/upload-work') ? { ok: true } : { ok: false }));
    vi.stubGlobal('fetch', fetchMock);
    const h = setup({ authToken: 'tok' });
    act(() => h.result.current.handleUploadWorkFile(pick('up.json', '[1,2]')));
    await waitFor(() => expect(h.fetchWorks).toHaveBeenCalled());
    const init = fetchMock.mock.calls[0][1] as { method: string; headers: Record<string, string>; body: string };
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(init.body)).toEqual({ folderPath: 'WORKS/ArmOne', fileName: 'up.json', content: [1, 2] });
    await waitFor(() => expect(h.setSelectedWorkFile).toHaveBeenCalledWith('up.json'));
    expect(h.uploadWorkFileRef.current.value).toBe('');
  });

  it('does not read the listing again when the server refuses', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn(async () => ({ ok: false }));
    vi.stubGlobal('fetch', fetchMock);
    const h = setup();
    act(() => h.result.current.handleUploadWorkFile(pick('up.json', '{}')));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(h.fetchWorks).not.toHaveBeenCalled();
  });

  it('ignores a file that is not JSON and an empty selection', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const h = setup();
    act(() => h.result.current.handleUploadWorkFile(pick('bad.json', 'not json')));
    act(() => h.result.current.handleUploadWorkFile({ target: { files: [] } } as never));
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
