// =============================================================================
// HYDRA-UMC STUDIO - scripts/mesh_pack.mjs
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The 3D models (STL/GLB/AMF/3MF) can come from the working tree (default) or
// from ONE downloadable package whose SHA-256 and the SHA-256 of every file
// are pinned in meshes.pack.json inside this repository. Nothing the package
// holds is trusted until its hash matches the manifest; nothing is written
// outside public/models; a failed check installs nothing.
//
//   source = local     (default) never touches the network; the meshes of the tree are used.
//   source = auto      the local meshes are used when all are present; only the missing or
//                      changed ones are fetched from the package.
//   source = download  every mesh is verified by its hash and the wrong ones are replaced.
//
// Set it in mesh_pack.config.json or with HYDRA_UMC_MESH_SOURCE / HYDRA_UMC_MESH_URL.
//   node scripts/mesh_pack.mjs status | check | prepare | ensure [--source auto|download]
// Node standard library only.
// =============================================================================
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
export const MESH_DIR = path.join(ROOT, 'public', 'models');
export const MANIFEST_PATH = path.join(ROOT, 'meshes.pack.json');
export const CONFIG_PATH = path.join(ROOT, 'mesh_pack.config.json');
export const SOURCES = ['local', 'auto', 'download'];

const SHA = /^[0-9a-f]{64}$/;

// The eight languages of the application, so the command line speaks the chosen one.
export const MESSAGES = {
  en: {
    local: 'Mesh package: source is local, the meshes of the working tree are used; nothing is downloaded.',
    complete: 'All {count} meshes are present and their hashes match.',
    needed: '{count} meshes are missing or changed.',
    downloading: 'Downloading the mesh package ({size} MiB) from {url}',
    package_ok: 'Package checksum verified.',
    package_bad: 'The package does not match the pinned manifest ({reason}); nothing was installed.',
    installed: 'Installed {count} meshes.',
    differ: '{count} meshes differ from the manifest: {names}',
    no_url: 'No package address is set (key url in mesh_pack.config.json or HYDRA_UMC_MESH_URL).',
    bad_source: 'Unknown source {value}; use local, auto or download.',
    failed: 'Download failed: {error}',
    insecure: 'Only https addresses are accepted (http only for 127.0.0.1 and localhost).',
  },
  es: {
    local: 'Paquete de mallas: el origen es local, se usan las mallas del árbol de trabajo; no se descarga nada.',
    complete: 'Las {count} mallas están y sus hashes coinciden.',
    needed: 'Faltan o han cambiado {count} mallas.',
    downloading: 'Descargando el paquete de mallas ({size} MiB) de {url}',
    package_ok: 'Suma de verificación del paquete correcta.',
    package_bad: 'El paquete no coincide con el manifiesto fijado ({reason}); no se instaló nada.',
    installed: 'Instaladas {count} mallas.',
    differ: '{count} mallas difieren del manifiesto: {names}',
    no_url: 'No hay dirección del paquete (clave url en mesh_pack.config.json o HYDRA_UMC_MESH_URL).',
    bad_source: 'Origen desconocido {value}; usa local, auto o download.',
    failed: 'Falló la descarga: {error}',
    insecure: 'Solo se aceptan direcciones https (http solo para 127.0.0.1 y localhost).',
  },
  de: {
    local: 'Netzpaket: Quelle ist lokal, die Netze des Arbeitsverzeichnisses werden verwendet; es wird nichts heruntergeladen.',
    complete: 'Alle {count} Netze sind vorhanden und ihre Hashes stimmen.',
    needed: '{count} Netze fehlen oder wurden geändert.',
    downloading: 'Das Netzpaket ({size} MiB) wird von {url} heruntergeladen',
    package_ok: 'Prüfsumme des Pakets bestätigt.',
    package_bad: 'Das Paket passt nicht zum festgelegten Manifest ({reason}); es wurde nichts installiert.',
    installed: '{count} Netze installiert.',
    differ: '{count} Netze weichen vom Manifest ab: {names}',
    no_url: 'Keine Paketadresse gesetzt (Schlüssel url in mesh_pack.config.json oder HYDRA_UMC_MESH_URL).',
    bad_source: 'Unbekannte Quelle {value}; verwende local, auto oder download.',
    failed: 'Download fehlgeschlagen: {error}',
    insecure: 'Nur https-Adressen werden akzeptiert (http nur für 127.0.0.1 und localhost).',
  },
  fr: {
    local: "Paquet de maillages : la source est locale, les maillages de l'arborescence sont utilisés ; rien n'est téléchargé.",
    complete: 'Les {count} maillages sont présents et leurs empreintes correspondent.',
    needed: '{count} maillages manquent ou ont changé.',
    downloading: 'Téléchargement du paquet de maillages ({size} Mio) depuis {url}',
    package_ok: 'Somme de contrôle du paquet vérifiée.',
    package_bad: "Le paquet ne correspond pas au manifeste fixé ({reason}) ; rien n'a été installé.",
    installed: '{count} maillages installés.',
    differ: '{count} maillages diffèrent du manifeste : {names}',
    no_url: 'Aucune adresse de paquet (clé url dans mesh_pack.config.json ou HYDRA_UMC_MESH_URL).',
    bad_source: 'Source inconnue {value} ; utilisez local, auto ou download.',
    failed: 'Échec du téléchargement : {error}',
    insecure: 'Seules les adresses https sont acceptées (http uniquement pour 127.0.0.1 et localhost).',
  },
  it: {
    local: "Pacchetto di mesh: la sorgente è locale, si usano le mesh dell'albero di lavoro; non viene scaricato nulla.",
    complete: 'Tutte le {count} mesh sono presenti e gli hash corrispondono.',
    needed: '{count} mesh mancano o sono cambiate.',
    downloading: 'Download del pacchetto di mesh ({size} MiB) da {url}',
    package_ok: 'Checksum del pacchetto verificato.',
    package_bad: 'Il pacchetto non corrisponde al manifesto fissato ({reason}); non è stato installato nulla.',
    installed: '{count} mesh installate.',
    differ: '{count} mesh differiscono dal manifesto: {names}',
    no_url: 'Nessun indirizzo del pacchetto (chiave url in mesh_pack.config.json o HYDRA_UMC_MESH_URL).',
    bad_source: 'Sorgente sconosciuta {value}; usa local, auto o download.',
    failed: 'Download non riuscito: {error}',
    insecure: 'Sono accettati solo indirizzi https (http solo per 127.0.0.1 e localhost).',
  },
  ja: {
    local: 'メッシュパッケージ：ソースはローカルです。作業ツリーのメッシュを使用し、ダウンロードは行いません。',
    complete: '{count} 個のメッシュがすべて存在し、ハッシュが一致しています。',
    needed: '{count} 個のメッシュが不足または変更されています。',
    downloading: 'メッシュパッケージ（{size} MiB）を {url} からダウンロードしています',
    package_ok: 'パッケージのチェックサムを確認しました。',
    package_bad: 'パッケージが固定されたマニフェストと一致しません（{reason}）。何もインストールされていません。',
    installed: '{count} 個のメッシュをインストールしました。',
    differ: '{count} 個のメッシュがマニフェストと異なります：{names}',
    no_url: 'パッケージのアドレスが設定されていません（mesh_pack.config.json の url キーまたは HYDRA_UMC_MESH_URL）。',
    bad_source: '不明なソース {value}。local、auto、download のいずれかを指定してください。',
    failed: 'ダウンロードに失敗しました：{error}',
    insecure: 'https のアドレスのみ使用できます（http は 127.0.0.1 と localhost のみ）。',
  },
  zh: {
    local: '网格包：来源为本地，使用工作树中的网格；不会下载任何内容。',
    complete: '全部 {count} 个网格都存在，且哈希值一致。',
    needed: '有 {count} 个网格缺失或已更改。',
    downloading: '正在从 {url} 下载网格包（{size} MiB）',
    package_ok: '已验证包的校验和。',
    package_bad: '该包与固定的清单不一致（{reason}）；未安装任何内容。',
    installed: '已安装 {count} 个网格。',
    differ: '有 {count} 个网格与清单不一致：{names}',
    no_url: '未设置包的地址（mesh_pack.config.json 中的 url 键或 HYDRA_UMC_MESH_URL）。',
    bad_source: '未知来源 {value}；请使用 local、auto 或 download。',
    failed: '下载失败：{error}',
    insecure: '只接受 https 地址（仅 127.0.0.1 和 localhost 可用 http）。',
  },
  pt: {
    local: 'Pacote de malhas: a origem é local, usam-se as malhas da árvore de trabalho; não se transfere nada.',
    complete: 'As {count} malhas estão presentes e os hashes coincidem.',
    needed: 'Faltam ou foram alteradas {count} malhas.',
    downloading: 'A transferir o pacote de malhas ({size} MiB) de {url}',
    package_ok: 'Soma de verificação do pacote confirmada.',
    package_bad: 'O pacote não coincide com o manifesto fixado ({reason}); não foi instalado nada.',
    installed: '{count} malhas instaladas.',
    differ: '{count} malhas diferem do manifesto: {names}',
    no_url: 'Não há endereço do pacote (chave url em mesh_pack.config.json ou HYDRA_UMC_MESH_URL).',
    bad_source: 'Origem desconhecida {value}; use local, auto ou download.',
    failed: 'A transferência falhou: {error}',
    insecure: 'Só são aceites endereços https (http apenas para 127.0.0.1 e localhost).',
  },
};

/** A refusal with a message key; nothing was installed. */
export class MeshPackError extends Error {
  constructor(key, fields = {}) {
    super(key);
    this.key = key;
    this.fields = fields;
  }
}

export function languageCode(env = process.env) {
  const raw = (env.HYDRA_UMC_LANG || env.LC_ALL || env.LANG || 'en').toLowerCase();
  const code = raw.replace('-', '_').split('_')[0].split('.')[0];
  return code in MESSAGES ? code : 'en';
}

export function say(key, lang, fields = {}) {
  const table = MESSAGES[lang || languageCode()] || MESSAGES.en;
  const text = table[key] || MESSAGES.en[key];
  return text.replace(/\{([a-z_]+)\}/g, (_m, name) => String(fields[name] ?? ''));
}

export function loadSettings(configPath = CONFIG_PATH, env = process.env) {
  let data = { source: 'local', url: '', timeout_seconds: 60 };
  try {
    const loaded = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (loaded && typeof loaded === 'object' && !Array.isArray(loaded)) data = { ...data, ...loaded };
  } catch {
    // a missing or damaged file falls back to the conservative default
  }
  const source = String(env.HYDRA_UMC_MESH_SOURCE || data.source || 'local').trim().toLowerCase();
  const url = String(env.HYDRA_UMC_MESH_URL || data.url || '').trim();
  const timeout = Number(data.timeout_seconds) > 0 ? Number(data.timeout_seconds) : 60;
  return { source, url, timeout };
}

function safeRelative(rel) {
  const parts = String(rel).split('/');
  if (parts.some((p) => p === '' || p === '.' || p === '..' || p.includes('\\') || p.includes(':'))) {
    throw new MeshPackError('package_bad', { reason: 'path' });
  }
  return path.join(...parts);
}

export function loadManifest(manifestPath = MANIFEST_PATH) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const pack = manifest.pack;
  if (!pack || !SHA.test(String(pack.sha256)) || !Number.isInteger(pack.size)) {
    throw new MeshPackError('package_bad', { reason: 'manifest' });
  }
  for (const entry of manifest.files) {
    safeRelative(entry.path);
    if (!SHA.test(String(entry.sha256))) throw new MeshPackError('package_bad', { reason: 'manifest' });
  }
  return manifest;
}

function sha256File(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

/** Entries whose file is missing or wrong. Quick mode compares sizes; deep compares SHA-256. */
export function scan(manifest, meshDir = MESH_DIR, deep = false) {
  const bad = [];
  for (const entry of manifest.files) {
    const target = path.join(meshDir, safeRelative(entry.path));
    let stat;
    try {
      stat = fs.statSync(target);
    } catch {
      bad.push(entry);
      continue;
    }
    if (!stat.isFile() || stat.size !== entry.size) bad.push(entry);
    else if (deep && sha256File(target) !== entry.sha256) bad.push(entry);
  }
  return bad;
}

export function checkUrl(url) {
  let parts;
  try {
    parts = new URL(url);
  } catch {
    throw new MeshPackError('insecure');
  }
  if (parts.protocol === 'https:') return;
  if (parts.protocol === 'http:' && (parts.hostname === '127.0.0.1' || parts.hostname === 'localhost')) return;
  throw new MeshPackError('insecure');
}

/** Stream the package to dest, refusing more bytes than the manifest declares, then check its SHA-256. */
export async function downloadPackage(url, pack, dest, timeoutSeconds = 60) {
  checkUrl(url);
  const hash = createHash('sha256');
  let got = 0;
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutSeconds * 1000) });
  } catch (error) {
    throw new MeshPackError('failed', { error: error instanceof Error ? error.message : String(error) });
  }
  if (!response.ok || !response.body) throw new MeshPackError('failed', { error: `HTTP ${response.status}` });
  const counter = async function* (source) {
    for await (const chunk of source) {
      got += chunk.length;
      if (got > pack.size) throw new MeshPackError('package_bad', { reason: 'size' });
      hash.update(chunk);
      yield chunk;
    }
  };
  try {
    await pipeline(Readable.fromWeb(response.body), counter, fs.createWriteStream(dest));
  } catch (error) {
    if (error instanceof MeshPackError) throw error;
    throw new MeshPackError('failed', { error: error instanceof Error ? error.message : String(error) });
  }
  if (got !== pack.size) throw new MeshPackError('package_bad', { reason: 'size' });
  if (hash.digest('hex') !== pack.sha256) throw new MeshPackError('package_bad', { reason: 'sha256' });
}

/** Yields { name, type, data } for each entry of a .tgz (ustar), reading the compressed stream once. */
async function* tarEntries(file) {
  const gunzip = fs.createReadStream(file).pipe(zlib.createGunzip());
  let buffer = Buffer.alloc(0);
  const need = async (n, iterator) => {
    while (buffer.length < n) {
      const { value, done } = await iterator.next();
      if (done) return;
      buffer = Buffer.concat([buffer, value]);
    }
  };
  const iterator = gunzip[Symbol.asyncIterator]();
  for (;;) {
    await need(512, iterator);
    if (buffer.length < 512) return;
    const header = buffer.subarray(0, 512);
    buffer = buffer.subarray(512);
    if (header.every((byte) => byte === 0)) return;
    const name = header.toString('utf8', 0, 100).replace(/\0.*$/s, '');
    const prefix = header.toString('utf8', 345, 500).replace(/\0.*$/s, '');
    const size = parseInt(header.toString('ascii', 124, 136).replace(/\0.*$/s, '').trim() || '0', 8);
    const type = String.fromCharCode(header[156] || 48);
    if (!Number.isFinite(size) || size < 0) throw new MeshPackError('package_bad', { reason: 'entry' });
    const padded = Math.ceil(size / 512) * 512;
    await need(padded, iterator);
    if (buffer.length < padded) throw new MeshPackError('package_bad', { reason: 'entry' });
    const data = Buffer.from(buffer.subarray(0, size));
    buffer = buffer.subarray(padded);
    yield { name: prefix ? `${prefix}/${name}` : name, type, data };
  }
}

/**
 * Write the wanted entries from a package already verified as a whole. Two phases so a refusal installs
 * nothing: every wanted blob is first hashed into a staging folder, and only when the whole package passed
 * are the files written (each through a .part file and a rename).
 */
export async function installFromPackage(packageFile, entries, meshDir = MESH_DIR) {
  const wanted = new Map();
  for (const entry of entries) {
    if (!wanted.has(entry.sha256)) wanted.set(entry.sha256, []);
    wanted.get(entry.sha256).push(entry);
  }
  const root = path.resolve(meshDir);
  const targets = [];
  for (const [digest, group] of wanted) {
    for (const entry of group) {
      const target = path.resolve(meshDir, safeRelative(entry.path));
      if (!target.startsWith(root + path.sep)) throw new MeshPackError('package_bad', { reason: 'path' });
      targets.push([digest, target]);
    }
  }
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'hydra-stage-'));
  try {
    const staged = new Set();
    for await (const { name, type, data } of tarEntries(packageFile)) {
      if (type !== '0' || !name.startsWith('blobs/')) throw new MeshPackError('package_bad', { reason: 'entry' });
      const digest = name.slice('blobs/'.length);
      if (!SHA.test(digest)) throw new MeshPackError('package_bad', { reason: 'entry' });
      if (!wanted.has(digest)) continue;
      if (createHash('sha256').update(data).digest('hex') !== digest) {
        throw new MeshPackError('package_bad', { reason: 'blob' });
      }
      fs.writeFileSync(path.join(stage, digest), data);
      staged.add(digest);
    }
    if (staged.size !== wanted.size) throw new MeshPackError('package_bad', { reason: 'incomplete' });
    for (const [digest, target] of targets) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const tmp = `${target}.part`;
      fs.copyFileSync(path.join(stage, digest), tmp);
      fs.renameSync(tmp, target);
    }
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
  return targets.length;
}

/** Bring the meshes to the state the source asks for. Returns the number of meshes written. */
export async function ensure({
  settings = loadSettings(),
  manifestPath = MANIFEST_PATH,
  meshDir = MESH_DIR,
  log = console.log,
  lang,
  source,
} = {}) {
  const mode = String(source || settings.source).toLowerCase();
  if (!SOURCES.includes(mode)) throw new MeshPackError('bad_source', { value: mode });
  if (mode === 'local') {
    log(say('local', lang));
    return 0;
  }
  const manifest = loadManifest(manifestPath);
  const bad = scan(manifest, meshDir, mode === 'download');
  if (bad.length === 0) {
    log(say('complete', lang, { count: manifest.files.length }));
    return 0;
  }
  log(say('needed', lang, { count: bad.length }));
  const url = settings.url || manifest.pack.url || '';
  if (!url) throw new MeshPackError('no_url');
  const pack = manifest.pack;
  log(say('downloading', lang, { size: (pack.size / 2 ** 20).toFixed(1), url }));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hydra-meshes-'));
  try {
    const packageFile = path.join(tmp, 'package.tgz');
    await downloadPackage(url, pack, packageFile, settings.timeout);
    log(say('package_ok', lang));
    const count = await installFromPackage(packageFile, bad, meshDir);
    log(say('installed', lang, { count }));
    return count;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export async function main(args = process.argv.slice(2)) {
  const rest = [...args];
  const command = rest.length && !rest[0].startsWith('-') ? rest.shift() : 'status';
  const at = rest.indexOf('--source');
  const source = at >= 0 ? rest[at + 1] : undefined;
  const lang = languageCode();
  try {
    if (command === 'status' || command === 'check') {
      const settings = loadSettings();
      const manifest = loadManifest();
      const bad = scan(manifest, MESH_DIR, command === 'check');
      if (settings.source === 'local' && command === 'status') console.log(say('local', lang));
      if (bad.length) {
        const names = bad.slice(0, 5).map((e) => e.path).join(', ') + (bad.length > 5 ? ' ...' : '');
        console.log(say('differ', lang, { count: bad.length, names }));
        return 1;
      }
      console.log(say('complete', lang, { count: manifest.files.length }));
      return 0;
    }
    if (command === 'ensure') {
      await ensure({ source });
      return 0;
    }
    if (command === 'prepare') {
      // silent under the default source, so npm can call it before every dev run and build
      if (loadSettings().source !== 'local') await ensure();
      return 0;
    }
    console.log('usage: node scripts/mesh_pack.mjs status | check | prepare | ensure [--source auto|download]');
    return 2;
  } catch (error) {
    if (error instanceof MeshPackError) {
      console.error(say(error.key, lang, error.fields));
      return 1;
    }
    throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
