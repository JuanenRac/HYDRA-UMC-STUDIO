# Contributing to HYDRA-UMC-STUDIO 🖥️

## Technology Stack
- **Framework**: React 19 + Vite.
- **3D**: Three.js (`@react-three/fiber`).
- **State**: Custom Context Provider (`store.tsx`).

## Guidelines
1. **3D Performance**: Ensure any new mesh or geometry is properly disposed of using `.dispose()` to avoid VRAM leaks.
2. **Multi-Language**: Add new strings to all files in `src/locales/`.
3. **Re-renders**: Keep the global context light. Use local state for UI-only toggles.
