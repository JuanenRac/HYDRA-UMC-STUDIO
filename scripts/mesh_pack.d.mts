// Types of scripts/mesh_pack.mjs for the tests (the script itself stays plain JavaScript).
export const ROOT: string;
export const MESH_DIR: string;
export const MANIFEST_PATH: string;
export const CONFIG_PATH: string;
export const SOURCES: string[];
export const MESSAGES: Record<string, Record<string, string>>;
export interface MeshEntry {
  path: string;
  sha256: string;
  size: number;
}
export interface MeshManifest {
  schema: number;
  pack: { file?: string; url?: string; sha256: string; size: number };
  files: MeshEntry[];
}
export interface MeshSettings {
  source: string;
  url: string;
  timeout: number;
  cache?: string;
  package?: string;
}
export class MeshPackError extends Error {
  key: string;
  fields: Record<string, unknown>;
  constructor(key: string, fields?: Record<string, unknown>);
}
export function languageCode(env?: Record<string, string | undefined>): string;
export function say(key: string, lang?: string, fields?: Record<string, unknown>): string;
export function loadSettings(configPath?: string, env?: Record<string, string | undefined>): MeshSettings;
export function loadManifest(manifestPath?: string): MeshManifest;
export function scan(manifest: MeshManifest, meshDir?: string, deep?: boolean): MeshEntry[];
export function defaultCacheDir(): string;
export function packageMatches(file: string, pack: MeshManifest['pack']): boolean;
export function obtainPackage(
  settings: MeshSettings,
  pack: MeshManifest['pack'],
  url: string,
  workDir: string,
  log: (line: string) => void,
  lang?: string,
): Promise<string>;
export function checkUrl(url: string): void;
export function downloadPackage(url: string, pack: MeshManifest['pack'], dest: string, timeoutSeconds?: number): Promise<void>;
export function installFromPackage(packageFile: string, entries: MeshEntry[], meshDir?: string): Promise<number>;
export function ensure(options?: {
  settings?: MeshSettings;
  manifestPath?: string;
  meshDir?: string;
  log?: (line: string) => void;
  lang?: string;
  source?: string;
}): Promise<number>;
export function main(args?: string[]): Promise<number>;
