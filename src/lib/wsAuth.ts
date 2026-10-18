// =============================================================================
// HYDRA-UMC STUDIO - how the WebSocket carries the token: wsAuth.ts
// Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
// GPL-3.0 - see LICENSE
//
// The token travels as a WebSocket subprotocol (`hydra.bearer`, <token>) so it stays out of the address that
// proxies and logs record. A server that does not answer the subprotocol closes the socket before it opens, and only
// then is the old form (`/ws?token=`) the right fallback. A socket that never opened is NOT proof of that: the
// server restarting, a Wi-Fi blip or a dropped link close it the same way, and falling back for those put the token
// into the address for good.
// =============================================================================

/**
 * Should the next attempt put the token in the address? Only for a socket that never opened while the server
 * answers plain HTTP - the combination a server without subprotocol support produces.
 */
export function shouldFallBackToQueryToken(socketEverOpened: boolean, serverAnsweredHttp: boolean): boolean {
  return !socketEverOpened && serverAnsweredHttp;
}
