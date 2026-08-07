# 🚀 Hydra-UMC Studio Robotic Arm Control Interface

Hydra-UMC Studio is a web-based, full-featured control panel designed to monitor and manage up to 8 robotic arms (Parol6, Faze4, Generic) concurrently. It supports assigning tools (e.g. CNC Spindles, Lasers, 3D Print Extruders), moving joints manually, configuring global XY tables, managing Automatic Tool Changers (ATC), monitoring camera feeds, and recording robotic trajectories.

## 🛠️ Features

- **Multi-Robot Dashboard:** Overview of up to 8 robotic arms with online/offline status, current roles, tools, and ATC configurations.
- **Virtual Kinematics:** 3D rendering of the robotic arm movements in real-time, showing visual representations of attached tools.
- **Joint Controls:** Granular jogging of individual joints with step sizes from 0.01° to 10.00°.
- **XY Table Configuration:** Fully interactive 3D setup for global XY stages, assignable to specific robots for advanced positioning.
- **Automatic Tool Changer (ATC):** Configure Vertical Panel, Horizontal Panel, or Revolver ATC types. Assign tools to slots and define pickup coordinates (XYZABC + XY Table).
- **Vision Matrix (Cameras):** Multi-camera view matrix with full-screen toggling. Picture-in-Picture (PiP) live view in individual robot dashboards.
- **Trajectory Management:** Record waypoints, load preset kinematic examples, and export trajectories as JSON.
- **System Configuration:** Manage network settings (CAN Bus Bitrate, Master IP), preferences (Telemetry interval, Theme), and execute emergency protocols (Global E-Stop, Controller Reboot).
- **I/O Control:** Monitor and actuate valves, pumps, and endstops directly from the robot detail view.

## 🚀 Installation & Setup

Ensure you have [Node.js](https://nodejs.org/) (version 18+) installed.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/JuanenRac/hydra-umc-studio.git
   cd hydra-umc-studio
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   *The application will be accessible at `http://localhost:3000` (or the port specified in your console).*

4. **Build for production:**
   ```bash
   npm run build
   ```

5. **Preview the production build:**
   ```bash
   npm run preview
   ```

## 💻 Tech Stack

- React 18+ (Vite)
- Tailwind CSS (Styling)
- Three.js / @react-three/fiber / @react-three/drei (3D Kinematics & Visualization)
- Lucide React (Icons)
- TypeScript

## 📜 License and Copyright Notices

This project is licensed under the GNU General Public License v3.0 (GPL-3.0). See the `LICENSE` file for more details.

## 👤 Author

**JuanenRac** (Electro Hobby 3D)  
📧 electrohobby3d@gmail.com  
📺 [youtube.com/@electrohobby3d](https://youtube.com/@electrohobby3d)