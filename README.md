# HYDRA-UMC STUDIO

**Copyright (C) 2026 JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>**  
**License:** GPL-3.0

HYDRA-UMC STUDIO is an advanced, centralized control dashboard for Robotics, CNC machines, 3D Printers, and Laser engravers. Built with modern web technologies, it provides real-time state management, trajectory playback, multi-device synchronization, and gamepad support.

## Features
- 🤖 **Multi-Robot Control**: Manage multiple 6-DOF robots (e.g., Parol6, Faze4) simultaneously.
- 🎮 **Gamepad Support**: USB and Bluetooth controller integrations with custom mappings.
- 📹 **Camera Integration**: Real-time Picture-in-Picture (PiP) surveillance and computer vision feeds.
- 💾 **Persistent State**: Fully synchronized back-end storage that saves all configurations, paths, and active machine states to the server disk.
- 🔄 **Works & Trajectories**: Load, edit, save, and playback complex multi-point movement paths (JSON), supporting combination movements across multiple robots.

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
