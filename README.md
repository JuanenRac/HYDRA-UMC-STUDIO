# HYDRA-UMC STUDIO

**Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>**  
**License:** GPL-3.0

HYDRA-UMC STUDIO is an advanced, centralized control dashboard for Robotics, CNC machines, 3D Printers, and Laser engravers. Built with modern web technologies, it provides real-time state management, trajectory playback, multi-device synchronization, and gamepad support.

## Features
- 🤖 **Multi-Robot Control**: Manage multiple 6-DOF robots simultaneously. Parol6, Faze4, AR3, and AR4 are modeled with their real mesh geometry and their manufacturer's own joint kinematics (accurate forward/inverse kinematics, real joint limits where the robot defines any); a Generic simplified two-link arm is also available for any other rig.
- 🎯 **XY Table, ATC Tools, Rack Manager, Pick & Place, CNC, Laser, Vacuum Table, Heated Bed**: dedicated control panels for the machines and accessories that go alongside a robot cell.
- 🔄 **Works & Trajectories**: Load canned Examples, jog-and-record your own points, or load/save/edit/playback complex multi-point trajectories (JSON) per robot - portable between robot models, since each step is resolved through that robot's own real kinematics before it's drawn or played.
- 🎮 **Gamepad Support**: USB and Bluetooth controller integrations with custom mappings.
- 📹 **Camera Integration**: Up to eight simultaneous live feeds (USB vision or thermal MLX90640/41/42) with recording and inference status.
- 🛠️ **CAN-OTA Firmware Tools**: Flash and self-test a robot's own Controller Board and, relayed through it, its URTC Tool Head - over CAN-OTA only (no JTAG/SWD, no USB-CAN dongle), matching HYDRA-UMC's own CM5 → SPI → STM32H745 → FDCAN1 → Robot Controller Board → CAN → URTC chain (see `HYDRA-UMC/docs/architecture.md`). Runs against a full built-in simulation until real STM32H745 firmware exists to talk to (Config > CAN-OTA).
- 🌐 **Multi-language UI**: English, Spanish, German, French, and Italian, including a full in-app Help menu.
- 💾 **Persistent State**: Fully synchronized back-end storage that saves all configurations, paths, and active machine states to the server disk.

## Requirements
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm

## Installation

```bash
npm install
```

## Running the Application

### Development Mode
To run the application with live-reloading (ideal for editing code):
- **Windows:** Double-click `dev.bat` or run `npm run dev`
- **Linux/Mac:** Execute `./dev.sh` or run `npm run dev`

### Production Build
To compile the application into a highly optimized, single-file server deployment:
- **Windows:** Double-click `build.bat` or run `npm run build`
- **Linux/Mac:** Execute `./build.sh` or run `npm run build`

Once built, you can start the production server using:
```bash
npm start
```

The server will run on `http://localhost:3000` (or `http://<your-local-ip>:3000` across your local network). All state and data are stored persistently in the `data/` directory.
