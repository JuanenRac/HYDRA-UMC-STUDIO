<!--
=============================================================================
HYDRA-UMC - The mesh package
Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
GPL-3.0 - see LICENSE
=============================================================================
-->

# The mesh package

The 3D models of the viewer (STL, GLB, AMF, 3MF) are the same files in HYDRA-UMC-STUDIO and in HYDRA-UMC-SUITE. They
are **not stored in the repository tree** (they weigh 221 MiB): they come from **one package** with a pinned checksum,
published as a release asset of HYDRA-UMC-MESHES, and are written into `public/models/` before the page is started or
built. The only models that stay in the tree are the ones only STUDIO has (the `.glb` files of `machine-pnp/lumenpnp`),
together with the `ATTRIBUTION.txt`, `metadata.json`, `manifest.json` and colour files of every model folder.

The first run downloads the package (45 MB, one time). **An internet connection is needed once**; after that the package
is kept in a cache folder and reused, and the page never downloads anything itself.

## Choosing the source

`mesh_pack.config.json` (at the root of the repository):

| Key | Default | Meaning |
| --- | --- | --- |
| `source` | `auto` | `auto`: use the local meshes when all are present and fetch only the missing ones. `download`: check every mesh by its SHA-256 and replace the wrong ones (what the CI does). `local`: never touch the network; the meshes of the working tree are used as they are. |
| `url` | empty | Address of the package. Empty means the address in `meshes.pack.json`. Only `https` is accepted (`http` only for `127.0.0.1` and `localhost`, which is what the tests use). |
| `timeout_seconds` | `60` | Network timeout. |
| `cache_dir` | empty | Folder that keeps the downloaded package. Empty means `~/.cache/hydra-umc/meshes`, outside the repository. |
| `package` | empty | An already downloaded package file (see "Working without a network"). |

The environment overrides the file: `HYDRA_UMC_MESH_SOURCE`, `HYDRA_UMC_MESH_URL`, `HYDRA_UMC_MESH_CACHE` and
`HYDRA_UMC_MESH_PACKAGE`. A damaged config file falls back to the defaults.

## Commands

```
npm run meshes -- status            # does the tree match the manifest (sizes)?
npm run meshes -- check             # the same, comparing the SHA-256 of every file
npm run meshes -- ensure            # bring the meshes to the state the source asks for
npm run meshes -- ensure --source download
npm run meshes -- prepare           # quiet when nothing is missing; what npm runs before dev and build
```

`npm run dev`, `npm run build` and the tests (`npm test`) run `prepare` first (the `predev` and `prebuild` steps, and the
test setup), so a fresh clone fetches the meshes before the first start. The messages follow `HYDRA_UMC_LANG` or `LANG`
in the eight languages of the application.

## What a fresh clone, a zip and an update do

- **A clone or a zip of the repository has no meshes.** The first `npm run dev`, `npm run build` or `npm test` downloads
  the package. If there is no network and no cached package, the command stops with a message that says what to do
  (below) instead of starting a viewer with no models.
- **An update** (`git pull`, the updater, a new zip) keeps the cache; the package is downloaded again only when a new
  revision is pinned in `meshes.pack.json`.
- **The production page** (`dist/`) contains the models, copied from `public/models/` by the build; HYDRA-UMC-SERVER
  serves them from there. Building is therefore the step that needs the package.

## Working without a network

1. On any computer with Internet, download the file named in `meshes.pack.json` (`pack.file`, from the address in
   `pack.url`). Check it with `sha256sum`: it must equal `pack.sha256`.
2. Copy it to `~/.cache/hydra-umc/meshes/` on the computer that builds (keep its name), **or** give its path:
   `HYDRA_UMC_MESH_PACKAGE=/path/to/hydra-umc-meshes-1.tgz npm run build`.
3. Run the command again. The file is verified against the pinned size and SHA-256 before anything is written; a file
   that does not match is refused and nothing is installed.

## Rebuilding the frontend on the CM5

The CM5 builds STUDIO next to HYDRA-UMC-SERVER (`build-frontend.sh` of the server runs `npm run build` here and copies
`dist/` into the server's `public/`). The build needs the package once, from the cache or from the network:

1. `git pull` of HYDRA-UMC-SDK, HYDRA-UMC-STUDIO, HYDRA-UMC-SERVER and HYDRA-UMC-OS.
2. `cd HYDRA-UMC-STUDIO && node scripts/mesh_pack.mjs ensure --source auto`. With Internet it downloads the package into
   `~/.cache/hydra-umc/meshes`. Without Internet, copy the package there first (or set `HYDRA_UMC_MESH_PACKAGE`).
3. Rebuild the frontend (`build-frontend.sh` of HYDRA-UMC-SERVER, which repeats step 2 and runs `npm run build`).
4. `install_server.sh --apply` of HYDRA-UMC-OS (it refuses to install a frontend without models) and restart the server.

The same order, with the checks, is in `provisioning/CM5_DEPLOYMENT_SEQUENCE.md` of HYDRA-UMC-OS.

## What is checked

`meshes.pack.json` is committed in this repository and pins:

- the size and SHA-256 of the package, checked while it is downloaded (an answer larger than the pinned size is cut off)
  and again when a cached or given file is reused;
- the path, size and SHA-256 of every mesh, checked again after extraction.

The package is a `.tgz` shared with HYDRA-UMC-SUITE (only the meshes that are byte-identical in both are in it; the
models only STUDIO has stay in `public/models/`) that keeps each distinct content once (`blobs/<sha256>`), so a model
that is the same in four machine folders is stored once. Nothing is written until the whole package has passed; every
path is checked to stay inside the mesh folder; files are written through a `.part` file and renamed. A package that does
not match installs nothing and says why. The downloaded file is kept in the cache through a `.part` file too, so an
interrupted download never leaves a half file that looks complete.

`public/models/**` is ignored by git except for the models only STUDIO has, so a download is never committed by mistake.

## Limits

- The first start, build or test needs the network once, or a package copied by hand (above).
- The cache and the package are verified by size and SHA-256 but not signed: the trust is in the pinned hash committed
  to this repository.
- Nothing warns at server start when the models are missing from a served frontend; the check is at build and install
  time.

## Tests

`tests/meshPack.test.ts` serves a small package from a local server and checks: the manifest tells the truth about
the tree; `local` never touches the network or the disk; `auto` fetches only what is missing; `download` repairs a
changed file; the package is kept in the cache and reused with no network, and a damaged cached package is fetched
again; a package given by path installs with no network and a wrong or missing one is refused; with no network and no
cache the failure carries the file, the address and the cache folder for the hint; a package with another hash, a blob
that does not match its name, an entry outside `blobs/`, a missing blob, an oversized answer, a path with `..` and a
non-`https` address are all refused without installing anything; the messages exist in the eight languages with the same
placeholders. `tests/setup/meshes.ts` brings the real meshes once before the whole suite.
