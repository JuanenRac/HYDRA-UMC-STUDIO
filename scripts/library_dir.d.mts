// Types of scripts/library_dir.mjs for the Vite config and the tests (the script itself stays plain JavaScript).
export const LIBRARY_DIR_ENV: string;
export function sharedDir(env?: Record<string, string | undefined>): string | null;
export function meshRoot(fallback: string, env?: Record<string, string | undefined>): string;
export function resolveModelFile(root: string, requestPath: string): string | null;
