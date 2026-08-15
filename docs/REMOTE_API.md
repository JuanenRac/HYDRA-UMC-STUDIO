# HYDRA-UMC STUDIO - Remote Control API

Reference for any client that talks to a running HYDRA-UMC STUDIO server
from *outside* its own browser tab: [HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)
(desktop swarm-control app), [HYDRA-UMC ANDROID CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL),
and [HYDRA-UMC IOS CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL).
Added 15 August 2026 specifically to support those 3 projects - the web
UI (`src/store.tsx`) is itself just another client of this same contract,
not a special case.

Everything here lives on the same host:port the web UI is already served
from (default `3000`) - one thing to discover, one port to open through a
firewall, both the REST endpoints and the WebSocket share it.

## 1. Discovery: `GET /api/hydra-info`

The first request any remote client should make to a candidate IP -
confirms it's actually a HYDRA-UMC STUDIO server before trying to talk
the real API to it. Deliberately cheap (answered from an in-memory cache,
no disk read), safe to fire at many IPs in parallel when scanning a
subnet for a swarm of controllers.

```json
{
  "product": "HYDRA-UMC STUDIO",
  "remoteApiVersion": 1,
  "appVersion": "1.0.0",
  "hostname": "JUANEN",
  "controllerCount": 1,
  "robotCount": 8,
  "uptimeSeconds": 22
}
```

- `remoteApiVersion` - bump this document's own contract number, independent
  of `appVersion` (the app's own `package.json` version). A remote client
  should check this field, not `appVersion`, before assuming a feature
  described here is actually present on an older server.
- `controllerCount`/`robotCount` - cheap headline numbers for a scan
  results list (e.g. SUITE's own server browser) without a client having
  to fetch and parse the full state via section 2 for every discovered IP.

A subnet scan is a plain, unauthenticated HTTP GET per candidate IP on the
known port - no mDNS/Bonjour service is advertised (yet; see "Future work"
at the end of this document).

**Remote-access gate:** if `SystemSettings.remoteAccess.enabled` is
explicitly `false` (set from the browser UI's own Settings -> Integrations
-> "Remote App Access" checkbox), this endpoint responds `404` instead -
the server becomes indistinguishable from "not running HYDRA-UMC STUDIO"
to a scanning remote client. The field defaults to enabled when absent, so
a `settings.json` predating this feature keeps working for everyone
already using SUITE/the mobile apps. This gate covers `/api/hydra-info`
only - `GET`/`POST /api/settings` and `/ws` stay open regardless, since
the browser UI's own tab depends on that exact same contract for its own
connection to its own server; disabling those would break the core web UI,
not just remote apps. In practice this means: a client that has already
discovered and connected to a server before the toggle is flipped off
keeps working normally (its open WebSocket isn't dropped); the toggle only
prevents *new* discovery.

## 2. Full state: `GET` / `POST /api/settings`

The same endpoint the web UI itself has always used - a remote client
reads and writes through this exact contract, not a separate one.

- `GET /api/settings` returns the full current state as one JSON object:
  `{ settings: SystemSettings, controllers: HydraController[], activeControllerId: string }`
  (see `src/store.tsx` for the real TypeScript shapes - this document
  doesn't restate every field, since that would drift out of sync with
  the actual source of truth).
- `POST /api/settings` (body: the same shape) overwrites the whole thing.
  There is no granular per-field PATCH - a client that wants to change
  one robot's one joint angle still has to read the full state, mutate
  its own local copy, and POST the whole object back. This matches how
  the web UI's own `RobotDetail.tsx` already works internally; a remote
  client should follow the same read-modify-write pattern rather than
  trying to invent a smaller payload.

**Race condition to know about:** two clients (a browser tab and SUITE, or
two SUITE instances) that both read, then both write moments apart, can
still clobber each other if their writes race outside the live-sync
window described in section 3. Section 3 mitigates this for anything
already connected over the WebSocket by pushing every write to every
other connected client immediately - but it does NOT queue or merge
concurrent writes. A remote client editing an existing job/parameter should
listen for and apply incoming WebSocket updates (section 3) for as long
as the user has that value on screen, not just do a one-shot GET at open
time, to keep the odds of stomping a concurrent edit as low as they
already are for two browser tabs open to the same server.

## 3. Live sync: `WebSocket /ws`

Connect with `ws://<host>:3000/ws` (or `wss://` if the server is proxied
behind TLS). On connect, the server immediately sends one message with
the current full state - no separate `GET /api/settings` call is needed
just to get a first real payload:

```json
{ "type": "settings", "payload": { "settings": {...}, "controllers": [...], "activeControllerId": "..." } }
```

After that, the server pushes the same message shape to **every**
connected client (the sender included) whenever the state changes, from
**either** of these triggers:
- a `POST /api/settings` from anyone (a browser tab, another remote
  client)
- a client sending `{ "type": "settings", "payload": {...} }` **over this
  same WebSocket** - functionally identical to a REST POST, offered as a
  convenience so a client that's already holding the socket open doesn't
  need a second HTTP round-trip to write a change

Only one message `type` exists today (`"settings"`) - the envelope
(`{type, payload}`) is deliberately generic so a future message type
(e.g. a lighter per-robot delta, or a live telemetry stream once real
STM32H745 firmware exists to source one from) can be added without
breaking a client that already knows to ignore an unrecognized `type`.

**Client responsibility:** the server broadcasts to the sender too rather
than tracking "who sent this" (simpler server-side). A client MUST
therefore guard against re-processing its own echo as if it were a fresh
external change - see `src/store.tsx`'s own `lastPayloadJsonRef` guard
(compares the incoming payload's JSON against the last payload it itself
applied/sent, skips if identical) for the reference approach. Skipping
this guard doesn't corrupt data, but does produce a wasteful, harmless
POST/broadcast ping-pong on every single change.

## 4. What this API does NOT cover (yet)

- **CAN-OTA firmware flashing/testing** - Flasher/Tester (`src/components/Flasher.tsx`/`Tester.tsx`)
  currently run entirely client-side against a simulated transport
  (`src/lib/canOta.ts`) - there is no server-side endpoint for it, so a
  remote client can't drive a real flash/test cycle through this API today.
  Revisit once real STM32H745 firmware exists on real hardware to talk to.
- **Authentication** - every endpoint above is open to anything that can
  reach the port, same as the web UI always has been. Fine for a trusted
  LAN; if HYDRA-UMC SUITE's own VPN-tunnel use case (reaching a HYDRA-UMC
  on a different physical network) is ever exposed beyond a private
  tunnel, this needs real auth before that's safe.
- **mDNS/Bonjour advertisement** - discovery today is "the client already
  knows or scans an IP range" (section 1), not "the server announces
  itself automatically." A `_hydra-umc._tcp` mDNS service would remove
  the need to scan at all on networks that support it - noted here as
  real future work, not implemented in this pass.

## 5. Where the server-side code lives

`server.ts` (repo root) - `GET /api/hydra-info`, the `WebSocketServer`
setup, and `broadcastSettings()`. `src/store.tsx`'s `HydraProvider` is the
reference CLIENT implementation of everything in this document - read it
alongside this file if a detail here is ambiguous, since the running code
is the actual source of truth and this document can drift.
