// =============================================================================
// HYDRA-UMC STUDIO - The WORKS folder of a robot: hooks/useWorkFiles.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The listing of the trajectory files of a robot (GET <folder>/index.json, an older answer never overwrites a newer one) and the save of the
// recorded points as a new file (POST /api/upload-work). Moved out of RobotDetail unchanged.
// =============================================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiUrl } from '../lib/apiBase';

export interface UseWorkFilesInput {
  robotId: number;
  robotName: string;
  worksPaths: Record<number, string> | undefined;
  authToken: string | null;
  recordedPoints: unknown[];
  selectedWorkFile: string;
  t: (key: string, fallback: string) => string;
  /** Called with the name of the file once the server has stored it and the listing was read again. */
  onSaved: (fileName: string) => void;
}

export function useWorkFiles({ robotId, robotName, worksPaths, authToken, recordedPoints, selectedWorkFile, t, onSaved }: UseWorkFilesInput) {
  const [workFiles, setWorkFiles] = useState<string[]>([]);
  // Guards against an out-of-order response: fetchWorks() is called both from
  // the effect below (whenever worksFolderPath changes) and manually after
  // save/upload - nothing stopped an OLDER in-flight request from resolving
  // AFTER a newer one and overwriting workFiles with stale data. Bumping this
  // ref on every call and checking it's still the latest call before each
  // setState turns a superseded response into a no-op instead of a race.
  const worksFetchIdRef = useRef(0);

  // Depends on the resolved PATH STRING for this one robot, not the whole settings.worksPaths object: that object is a fresh reference every time ANY
  // setting anywhere changes, so depending on it would re-run this network fetch (GET /${folderPath}/index.json) on every jog tick from ANY connected
  // client while a robot panel is open. A plain string only changes reference (and re-triggers fetchWorks, and thus the effect below) when this
  // robot's OWN folder path value actually changes.
  const worksFolderPath = worksPaths?.[robotId] || `WORKS/${robotName.replace(/\s+/g, '')}`;
  const fetchWorks = useCallback(async () => {
    const fetchId = ++worksFetchIdRef.current;
    try {
      const res = await fetch(apiUrl(`/${worksFolderPath}/index.json`));
      if (fetchId !== worksFetchIdRef.current) return;
      if (res.ok) {
        const files = await res.json();
        if (fetchId !== worksFetchIdRef.current) return;
        setWorkFiles(Array.isArray(files) ? files.filter((f): f is string => typeof f === "string") : []);
      } else {
        setWorkFiles([]);
      }
    } catch {
      if (fetchId === worksFetchIdRef.current) setWorkFiles([]);
    }
  }, [worksFolderPath]);

  // Genuine "synchronize with an external system" effect (a real fetch of
  // this robot's WORKS folder listing) - the sanctioned use the lint
  // rule's own text carves out, not the "derive local state" case it's
  // meant to catch.
  useEffect(() => {
    fetchWorks(); // eslint-disable-line -- real fetch, not a derived-state reset
  }, [fetchWorks]);

  const saveWorkFile = async () => {
    if (recordedPoints.length === 0) return;
    const defaultName = selectedWorkFile ? selectedWorkFile.replace('.json', '') : 'trayectoria_1';
    let fileName = window.prompt(t('robot_detail.save_filename', 'Nombre del archivo (sin .json):'), defaultName);
    if (!fileName) return;
    if (!fileName.endsWith('.json')) fileName += '.json';
    
    try {
      const folderPath = worksPaths?.[robotId] || `WORKS/${robotName.replace(/\s+/g, '')}`;
      // Server now requires a bearer token on this route (see server.ts's
      // own comment on POST /api/upload-work) - without this header every
      // save silently 401s for a logged-in user.
      const res = await fetch(apiUrl('/api/upload-work'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        body: JSON.stringify({
          folderPath,
          fileName: fileName,
          content: recordedPoints
        })
      });
      if (res.ok) {
        await fetchWorks();
        onSaved(fileName);
      } else {
        console.error('Failed to save work file');
      }
    } catch (err) {
      console.error('Error saving file', err);
    }
  };


  return { workFiles, fetchWorks, saveWorkFile, worksFolderPath };
}
