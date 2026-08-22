<p align="center">
  <img src="images/HYDRA_UMC_STUDIO_BANNER.jpg" alt="HYDRA-UMC STUDIO Banner" width="100%">
</p>

# 🖥️ HYDRA-UMC STUDIO

<p align="center">
  <a href="README.md">🇺🇸 English</a> |
  <a href="README_spa.md">🇪🇸 Español</a> |
  <a href="README_fra.md">🇫🇷 Français</a> |
  <a href="README_ita.md">🇮🇹 Italiano</a> |
  🇩🇪 <b>Deutsch</b>
</p>


### 🤖 Webbasiertes Steuerungs-Dashboard für die HYDRA-UMC Multi-Roboter-Mikrofabrik

<p align="left">
  <img src="https://img.shields.io/badge/Lizenz-GPL%203.0-blue.svg" alt="GPL 3.0">
  <img src="https://img.shields.io/badge/Framework-React%2019-61DAFB.svg" alt="React">
  <img src="https://img.shields.io/badge/Tool-Vite-646CFF.svg" alt="Vite">
</p>


---

## 🎯 Überblick

**HYDRA-UMC STUDIO** ist das browserbasierte Steuerungs-Dashboard für [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) - die Hauptplatine der Multi-Roboter-Mikrofabrik (Raspberry-Pi-CM5-Host + Dual-Core-STM32H745-Echtzeit-Coprozessor), die bis zu 8 verteilte Roboterarme über einen einzigen FDCAN-Bus orchestriert. Während das eigene Repository von HYDRA-UMC die Hardware und Firmware abdeckt, ist dieses Repository die dem Menschen zugewandte Seite: eine Single-Page-React-Anwendung, die jeden Roboter in echtem 3D visualisiert, deren Bewegung joggt und aufzeichnet, die Maschinen und Zubehörteile verwaltet, die eine Roboterzelle begleiten, und die gesamte CAN-OTA-Firmware-Kette flasht/testet - alles aus einem einzigen Browser-Tab heraus, ohne native Installation über Node.js hinaus.

**Ehrlichkeitshinweis, der derselben Dokumentationskonvention wie der Rest dieses Ökosystems folgt:** die eigene reale Hardware von HYDRA-UMC existiert noch nicht als getestetes Silizium (ihre Bootloader kompilieren sauber, liefen aber noch nie auf echten Platinen - siehe das eigene `docs/architecture.md` dieses Repositorys). Dieses Dashboard führt seine CAN-OTA-Flasher-/Tester-Tools daher gegen eine vollständige eingebaute Simulation aus, die dem realen, dokumentierten Adressierungsschema jeder Ebene folgt, anstatt vorzugeben, mit Hardware zu sprechen, die es nicht gibt. Die 3D-Robotervisualisierung, Kinematik, Trajektorienaufzeichnung, und jedes Zubehör-Steuerungspanel sind davon vollständig unabhängig und real - nur der CAN-OTA-Transport selbst ist vorerst simuliert.

Gebaut mit **React 19**, **Vite**, **Three.js** (über `@react-three/fiber`/`@react-three/drei`), und **TypeScript** - ein reiner Client ohne eigenen Backend-Code. Persistenter Zustand lebt auf dem separaten **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)**-Backend, mit dem diese App über das Netzwerk kommuniziert.

---

## 🦾 Multi-Roboter-3D-Steuerung

Verwalten Sie mehrere unabhängige Roboter mit 6 Freiheitsgraden (6-DOF) gleichzeitig, jeder mit seinem eigenen echten 3D-Modell, eigener Kinematik, und eigenem Jog-/Trajektorienzustand. Die Modellauswahl (RobotDetail → Config-Tab) gruppiert jeden verfügbaren Roboter nach Hersteller:

- 🏭 **Source Robotics** - Parol6, Faze4 (Meshes unter MIT- bzw. GPL-3.0-Lizenz, siehe die eigene `ATTRIBUTION.txt` jedes Modells)
- 🏭 **Annin Robotics** - AR3, AR4 (Meshes unter MIT-Lizenz)
- 🏭 **Universal Robots** - UR3e, UR5e, UR10e, UR16e, UR20 - offizielle Geometrie, Gelenkgrenzen, und Glieder-Kinematik, direkt aus dem eigenen [Universal_Robots_ROS2_Description](https://github.com/UniversalRobots/Universal_Robots_ROS2_Description)-Repository von Universal Robots (BSD-3-Clause) übernommen, deckt den gesamten Nutzlastbereich von leicht bis schwer ihrer e-Series-Reihe ab
- 🏭 **Universal Robots (klassisch)** - UR3, UR5, UR10 - die Baureihe vor der e-Series (CB-Serie), offizielle Geometrie/DH-Parameter aus dem eigenen [universal_robot](https://github.com/ros-industrial/universal_robot)-Repository von ROS-Industrial (BSD-3-Clause)
- 🏭 **UFACTORY** - xArm6, Lite 6 (BSD-3-Clause-Meshes, offizielle Geometrie/Kinematik von [xarm_ros2](https://github.com/xArm-Developer/xarm_ros2))
- 🏭 **Comau** - e.DO (BSD-3-Clause-Meshes, offizielle Geometrie/Kinematik von [eDO_description](https://github.com/ianathompson/eDO_description))
- 🏭 **Kinova** - Gen3 Lite, Gen2 (BSD-3-Clause-Meshes, offizielle Geometrie/Kinematik von [ros2_kortex](https://github.com/Kinovarobotics/ros2_kortex))
- 🏭 **FANUC** - M-710iC (BSD-3-Clause-Meshes, offizielle Geometrie/Kinematik von [fanuc_m710ic_description](https://github.com/robot-descriptions/fanuc_m710ic_description))
- 🏭 **The Robot Studio** - SO-ARM100, ein günstiger Arm mit 5-DOF (nicht 6) (Apache-2.0-Meshes, offizielle Geometrie/Kinematik von [SO-ARM100](https://github.com/TheRobotStudio/SO-ARM100))
- 🏭 **AgileX** - PiPER (Apache-2.0-Meshes, offizielle Geometrie/Kinematik von [agilex_piper_arm_description](https://github.com/renesas-rdk/agilex_piper_arm_description))
- 🏭 **Unitree** - Z1 (BSD-3-Clause-Meshes, über Google DeepMinds [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie) - jeder Roboterordner dort behält seine eigene originale Herstellerlizenz)
- 🏭 **Trossen Robotics** - ViperX 300, WidowX 250 (BSD-3-Clause-Meshes, offizielle Geometrie/Kinematik von [interbotix_ros_manipulators](https://github.com/Interbotix/interbotix_ros_manipulators))
- 🏭 **Koch / Low-Cost Robot Arm** - Koch v1.1, ein weiterer günstiger Arm mit 5-DOF (nicht 6) (Apache-2.0-Meshes, über [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie))
- ⚙️ **Generisch** - ein vereinfachter Zwei-Glieder-Arm für jeden Aufbau ohne eigenes Modell

Das sind 24 echte Robotermodelle von 13 Herstellern, plus der Generisch-Platzhalter - siehe die Lizenztabelle weiter unten für die genaue Modell↔Hersteller↔Lizenz-Zuordnung, die diese Liste zusammenfasst. Jedes echte Modell (alle außer Generisch) lädt seine tatsächliche STL-Mesh-Geometrie pro Glied und steuert sie über die eigene reale Gelenktransformationskette dieses Herstellers - kein stilisierter Platzhalter. Vorwärts-/Rückwärtskinematik wird gegen die eigene reale Geometrie jedes Roboters berechnet (Newton-Raphson-Lösung für die Position, reale Gelenkgrenzen pro Achse, wo der Roboter sie definiert), sodass eine aufgezeichnete Trajektorie oder ein gejogtes kartesisches Ziel den richtigen Arm so bewegt, wie es der physische Roboter tatsächlich tun würde. Die 5 e-Series-Modelle von Universal Robots teilen sich zusätzlich eine gemeinsame FK/IK-Engine (`src/examples/urKinematicsShared.ts`) und einen gemeinsamen 3D-Rig-Renderer (`src/components/3d/URArm.tsx`), da jedes Gelenk der UR-e-Series exakt dieselbe kinematische Struktur teilt - nur die numerischen Gliedlängen unterscheiden sich je Modell. Die 3 klassischen UR-Modelle (UR3/UR5/UR10) teilen sich stattdessen ihre eigene, separate Engine und ihren eigenen Renderer (`src/examples/urClassicKinematics.ts`, `src/components/3d/UrClassicArm.tsx`), da diese ältere Baureihe nicht in jedem Gelenk dieselbe lokale Z-Achse teilt, wie es die e-Series tut.

Die Jog-Steuerungen pro Roboter umfassen einen Drehknopf + Schieberegler sowohl für **Geschwindigkeit** als auch für **Beschleunigung** auf jeder Achse, sowie eine vollständige Endschalter-/Statusanzeige neben einer Live-Statuskarte "Robot Controller Board", sobald CAN-OTA mit echter Hardware verkabelt ist. Jeder Drehknopf/Schieberegler rastet auf den in seinem eigenen Kombinationsfeld ausgewählten Jog-**Step**-Wert (0,1° bis 100°/mm) ein, statt sich kontinuierlich zu bewegen. Roboter **A1** ist ein laufender Proof of Concept für ein anderes Layout: seine Speed-/Acceleration-/J1-J6-/XYZ-Jog-Steuerungen befinden sich in einem verschiebbaren schwebenden Panel über dem 3D-Viewport selbst (`Joystick3D.tsx` für das XYZ-Pad) anstelle des Panels darunter, das alle anderen Roboter weiterhin verwenden - siehe `src/components/robots/A1.tsx`.

---

## 🏭 Kinematic Brain Stage

Ein dediziertes Steuerungspanel für das eigene lokale Bewegungssubsystem der HYDRA-UMC-Hauptplatine - die direkt vom STM32H745 angesteuerten Achsen, getrennt von den verteilten Roboterarmen auf STACK A:

- 📐 Jog-Steuerung des **XY-Portals** für die Achsen X, Y1, Y2 (duales Y-Portal), und Z
- 🔥 Steuerung des **beheizten Betts** (SSR-geschaltet, 230VAC)
- 🔄 **ATC-Revolver** - rotierende Werkzeugindex-Steuerung für den E0-angetriebenen automatischen Werkzeugwechsler
- 🎢 **Förderband** - Installiert-/Läuft-/Geschwindigkeitssteuerung für das E1-angetriebene Transportband
- 🛑 Ein vollständiges 12-Endschalter-Raster, 3 Lüfterkanäle, und 10 Pumpen/10 Ventile für die Prozessfluidik

---

## 🎛️ Zubehör- und Maschinensteuerungspanels

Dedizierte Panels für die Maschinen und Zubehörteile, die eine Roboterzelle begleiten: **XY-Tisch**, **ATC-Werkzeuge**, **Rack-Manager**, **Pick & Place** (einschließlich JuanenPnP-/LumenPnP-spezifischer Konfiguration), **CNC** (einschließlich JuanenCNC-spezifischer Konfiguration), **Laser** (einschließlich JuanenLaser-spezifischer Konfiguration), **Vakuumtisch**, und **beheiztes Bett**.

---

## 🔄 Werke und Trajektorien

Laden Sie vorgefertigte Beispieltrajektorien, joggen und zeichnen Sie live eigene Punkte auf, oder laden/speichern/bearbeiten/spielen Sie komplexe Mehrpunkt-Trajektorien (JSON) pro Roboter ab. Trajektorien sind zwischen Robotermodellen portabel - jeder aufgezeichnete Punkt wird beim Laden/Zeichnen/Abspielen über die eigene reale Kinematik dieses spezifischen Roboters (`src/examples/robotKinematicsDispatch.ts`) aufgelöst, nicht fest gegen den Roboter berechnet, mit dem er aufgezeichnet wurde, sodass dieselbe Trajektoriendatei einen Parol6 und einen UR10e korrekt entlang ihrer eigenen real erreichbaren Geometrie steuert.

---

## 🛠️ CAN-OTA-Firmware-Tools

Flashen und selbsttesten Sie Firmware über die gesamte CAN-OTA-Kette von HYDRA-UMC + URTC von einem Dashboard aus, mit zwei dedizierten Einstiegspunkten:

- **URTC → Flasher / Tester** - für die URTC-Tool-Head-Platine und ihre eigenen Erweiterungsplatinen (entspricht der eigenen Protokollabdeckung der eigenständigen Desktop-Tools [URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)/[URTC Tester](https://github.com/JuanenRac/URTC-TESTER))
- **HYDRA-UMC → Flasher / Tester** - für die Ebenen Robot Controller Board und Kinematic Brain, den ganzen Weg weitergeleitet von CM5 → SPI → STM32H745 → FDCAN1 → Robot Controller Board → CAN → URTC Tool Head, ohne JTAG-/SWD-Sonde und ohne USB-CAN-Dongle (siehe das eigene [`docs/architecture.md` von HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC/blob/main/docs/architecture.md) für das vollständige Adressierungs-/Relais-Design)

Beide können echte Firmware-Releases direkt von GitHub herunterladen (basierend auf `firmware_manifest.json`, CRC32-verifiziert), sowohl für das `URTC`- als auch das `HYDRA-UMC`-Repository. Wie oben erwähnt läuft der Transport selbst gegen eine vollständige eingebaute Simulation, bis echte STM32H745-Firmware auf echter Hardware existiert, mit der gesprochen werden kann.

---

## 🎮 Gamepad-Unterstützung

USB- und Bluetooth-Controller-Integration mit benutzerdefinierten Zuordnungen pro Taste/pro Achse, zum Joggen von Robotern und Zubehör ohne Maus/Tastatur.

---

## 📹 Kamera-Integration

Bis zu 8 gleichzeitige Live-Feeds (USB-Bildverarbeitung oder Wärmebildsensoren der Familie MLX90640/41/42) mit Aufzeichnungs- und Inferenzstatus - die Kameramatrix, um die herum das eigene duale USB-3.0-Hub-Subsystem von HYDRA-UMC aufgebaut ist.

---

## 🌐 Mehrsprachige Benutzeroberfläche

Vollständige Übersetzung der Oberfläche in **Englisch, Spanisch, Deutsch, Französisch und Italienisch** (`src/locales/`), einschließlich des In-App-Hilfemenüs, des Info-Dialogs (Version/Autor/Lizenz), und jeder Registerkarte des Dialogs für die Systemkonfiguration. Die Abdeckung liegt noch nicht bei 100 % jedes Bildschirms - siehe `SONNET/HYDRA-UMC-STUDIO/mejoras_futuras.txt` in der eigenen privaten Nachverfolgung dieses Ökosystems für das, was noch fest in Englisch codiert ist (hauptsächlich eine Handvoll eigenständiger Zubehörpanels, die von der Übersetzungsarbeit noch nicht erreicht wurden).

---

## ℹ️ Info und Systemkonfiguration

Zwei eigenständige Dialoge, beide über die Kopfzeile erreichbar (Schaltflächen `Config`/`About`): **About** zeigt die laufende App-Version (live gelesen von `GET /api/hydra-info`), Autor, und Lizenz; **Config** deckt die Server-Identität, Controller-/Knotenverwaltung, UI-Thema + Sprache, Roboter-Umbenennung, Kamera↔Roboter-Zuordnung mit Konflikterkennung, die benutzerdefinierte URDF-Bibliothek, Drittanbieter-Software-Integrationen (OpenPnP-/CNC-/Laser-Backends), clientweisen Fernzugriff (unabhängige Schalter für SUITE/Android/iOS), Benutzerkonten, roboterweise Arbeitsverzeichnisse, CAN-OTA-Transport, und Gamepad-Zuordnung ab - jeweils in einer eigenen Registerkarte. Beide sind eigenständige Komponenten (`src/components/About.tsx`, `src/components/Config.tsx`), nicht inline in die Haupt-Dashboard-Shell eingebettet.

## 🔐 Konten und Zugriff

Jeder Server legt bei seinem eigenen allerersten Start ein Konto an - Benutzername `admin`, Passwort `admin` - ändern Sie es über **Config > Users**, sobald der Server über ein vollständig vertrauenswürdiges LAN hinaus erreichbar ist. Dieselbe Registerkarte erlaubt es einem Admin-Konto, zusätzliche **operator**-Konten zu erstellen: ein Operator kann sich anmelden, den Live-Zustand beobachten, und Roboter steuern (jog/abspielen/pausieren/stoppen/Werkzeug/Ventil/Pumpe/Geschwindigkeit), kann aber keine globalen Einstellungen überschreiben oder andere Konten verwalten. Für das bloße Ansehen ist kein Konto erforderlich - das eigene "Continue read-only" des Anmeldebildschirms springt direkt zum Dashboard mit deaktivierten Schreibvorgängen. Vollständiger Vertrag (Rollen, Tokens, die `/api/users`-Routen) dokumentiert im eigenen [`docs/REMOTE_API.md` von HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md), Abschnitte 2a/2b.

Jeder der 3 Remote-Clients (SUITE, Android, iOS) identifiziert sich selbst über einen `X-Hydra-Client`-Anfrage-Header, sodass **Config > Remote Access** jeden unabhängig erlauben oder blockieren kann, statt eines einzigen kombinierten Schalters für alle drei.

---

## 💾 Persistenter Zustand

HYDRA-UMC STUDIO selbst ist ein reiner Client - er hält keinen eigenen Zustand über das hinaus, was für die aktuelle Sitzung im Speicher liegt. Die gesamte Persistenz (`settings.json`, `users.json`, gespeicherte Trajektorien unter `WORKS/`, eingereichte Modelle) lebt auf dem separaten **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)**-Backend, mit dem diese App über das Netzwerk kommuniziert (siehe das eigene `data/` und README dieses Projekts für das vollständige Bild) - der Zustand überlebt ein Neuladen der Seite oder ein erneutes Deployment dieser App, da keines von beiden den Backend-Prozess überhaupt berührt. `settings.json` selbst ist bewusst von der statischen Dateiauslieferung dieses Backends ausgeschlossen (es enthält Controller-IPs, CAN-OTA-Konfiguration, und den vollständigen Zustand pro Roboter), obwohl dessen `WORKS/`-Ordner normal ausgeliefert wird.

Derselbe `GET`-/`POST /api/settings`-Vertrag, plus ein Discovery-Endpunkt (`GET /api/hydra-info`) und ein `WebSocket /ws` für Live-Push-Updates, ist auch die Art und Weise, wie sich externe Clients mit demselben Backend verbinden - dies ist es, was es [HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) ermöglicht, eine laufende HYDRA-UMC-SERVER-Instanz im Netzwerk zu entdecken, deren Zustand zu lesen/ändern, und Änderungen, die vom eigenen Browser-Tab dieser App aus vorgenommen wurden, live widergespiegelt zu sehen (und umgekehrt). Vollständiger Vertrag im eigenen [`docs/REMOTE_API.md` von HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md).

`GET /api/system/metrics` versorgt die Fußzeile des Overview-Dashboards: CPU-Last und Speichernutzung sind immer real (das eigene `os`-Modul von Node); die Temperatur liest die reale Ausgabe von `vcgencmd measure_temp`, wenn auf einem echten Raspberry Pi ausgeführt, und fällt andernfalls auf einen klar gekennzeichneten Mock-Wert zurück (`temp_is_real` in der Antwort); der Wi-Fi-/Ethernet-/Bluetooth-Status wird von `/sys/class/net`/`/sys/class/bluetooth` gelesen (nur Linux, `null`/unbekannt auf jedem anderen Host statt eines geratenen Werts).

---

## 📂 Repository-Struktur

```text
HYDRA-UMC-STUDIO/
├── src/
│   ├── Dashboard.tsx            # App-Shell oberster Ebene - Navigation, Overview-Panel, Systemmetriken in der Fußzeile
│   ├── store.tsx                # Globaler Zustand: RobotModel/RobotState/HydraController/SystemSettings -
│   │                             # kommuniziert mit dem separaten HYDRA-UMC-SERVER-Backend über REST + WebSocket
│   ├── i18n.ts                  # react-i18next-Setup - lädt src/locales/*.json
│   ├── components/
│   │   ├── About.tsx, Config.tsx  # Dialoge für Systemkonfiguration und Info - eigenständige Komponenten,
│   │   │                       # die denselben globalen Store lesen, nicht inline in die Dashboard-Shell eingebettet
│   │   ├── AuthGate.tsx, UsersPanel.tsx  # Anmeldebildschirm und der admin-/operator-Kontoverwalter von Config > Users
│   │   ├── RobotDetail.tsx      # Geteilte Implementierung von Jog/Trajektorie/Konfiguration pro Roboter (die
│   │   │                       # Modellauswahl lebt hier) - jeder robots/A*.tsx-Einstiegspunkt unten rendert dies
│   │   ├── robots/A1.tsx .. A8.tsx  # Einstiegspunkte pro Roboter - dünne Re-Exporte von RobotDetail.tsx, der
│   │   │                       # Ort, um jedes künftige roboterspezifische Verhalten wachsen zu lassen, ohne die
│   │   │                       # anderen 7 anzufassen. A1 ist bereits die eine Ausnahme: der eigene
│   │   │                       # `isFloatingLayout`-Zweig von RobotDetail.tsx (robot.id === 1) verschiebt den Jog von
│   │   │                       # Speed/Acceleration/J1-J6/XYZ in ein verschiebbares Overlay auf dem 3D-Viewport
│   │   │                       # statt in das Panel darunter.
│   │   ├── Joystick3D.tsx       # XYZ-Jog-D-Pad, verwendet von diesem schwebenden Overlay
│   │   ├── VirtualKinematics.tsx  # Der <Canvas>-Szenen-Host von React Three Fiber
│   │   ├── KinematicBrainStage.tsx  # Panel für XY-Portal / beheiztes Bett / ATC-Revolver / Förderband
│   │   ├── Flasher.tsx, Tester.tsx  # CAN-OTA-Tools (URTC- und HYDRA-UMC-Ebenen)
│   │   ├── ATCToolsConfig.tsx, RackConfigView.tsx, PickAndPlace.tsx, CNC.tsx, Laser.tsx,
│   │   │   VacuumTableConfig.tsx, HeatedBedConfig.tsx, XYTableConfig.tsx
│   │   │                       # Zubehör-/Maschinensteuerungspanels
│   │   ├── JuanenPnPConfig.tsx, LumenPnPConfig.tsx, JuanenCNCConfig.tsx, JuanenLaserConfig.tsx
│   │   │                       # Maschinenspezifische Konfigurationsvarianten - noch nicht an einen
│   │   │                       # Navigationspfad angebunden (toter Code), siehe SONNET/HYDRA-UMC-STUDIO/mejoras_futuras.txt
│   │   ├── CamerasView.tsx, GamepadConfig.tsx, GamepadController.tsx, HelpModal.tsx
│   │   ├── FuturisticSlider.tsx, RotaryKnob.tsx  # Geteilte Jog-Steuerungs-Widgets
│   │   └── 3d/
│   │       ├── RobotArm.tsx     # Leitet nach robot.model an das korrekte modellspezifische Rig weiter
│   │       ├── Parol6Arm.tsx, Faze4Arm.tsx, AR3Arm.tsx, AR4Arm.tsx, EdoArm.tsx, Gen2Arm.tsx,
│   │       │   Gen3LiteArm.tsx, Lite6Arm.tsx, M710icArm.tsx, PiperArm.tsx, SoArm100Arm.tsx,
│   │       │   Vx300sArm.tsx, Wx250sArm.tsx, XArm6Arm.tsx, Z1Arm.tsx, KochArm.tsx,
│   │       │   LumenPnPRig.tsx, GenericRobotArm.tsx
│   │       │                   # Herstellerspezifische Rigs, jedes von Hand aus seinem eigenen realen URDF übertragen
│   │       ├── URArm.tsx, UrClassicArm.tsx  # Geteilte parametrisierte Rigs für die e-Series-/Classic-Linien von Universal Robots
│   │       ├── UR3eArm.tsx, UR5eArm.tsx, UR10eArm.tsx, UR16eArm.tsx, UR20Arm.tsx,
│   │       │   Ur3ClassicArm.tsx, Ur5ClassicArm.tsx, Ur10ClassicArm.tsx
│   │       │                   # Dünne modellweise Wrapper um URArm.tsx / UrClassicArm.tsx
│   │       ├── Shared3DEnvironment.tsx, SharedModule3DView.tsx, PathVisualizer.tsx,
│   │       │   Toolhead.tsx, DraggableGizmo.tsx, ATC3DView.tsx, Rack3DView.tsx
│   │       │                   # Szenenumgebung, Trajektorienzeichnung, Werkzeug-/Gizmo-Rendering
│   ├── examples/
│   │   ├── kinematics.ts, utils.ts, robotKinematicsDispatch.ts
│   │   │                       # Geteilte generische 2-Glieder-Kinematik + modellweises Dispatch
│   │   ├── parol6Kinematics.ts, faze4Kinematics.ts, ar3Kinematics.ts, ar4Kinematics.ts,
│   │   │   edoKinematics.ts, gen2Kinematics.ts, gen3LiteKinematics.ts, kochKinematics.ts,
│   │   │   lite6Kinematics.ts, m710icKinematics.ts, piperKinematics.ts, soArm100Kinematics.ts,
│   │   │   xarm6Kinematics.ts, z1Kinematics.ts
│   │   │                       # Herstellerspezifische reale FK/IK
│   │   ├── urKinematicsShared.ts, urClassicKinematics.ts  # Geteilte FK/IK-Engine für die e-Series-/Classic-Linien von UR
│   │   ├── ur3eKinematics.ts, ur5eKinematics.ts, ur10eKinematics.ts, ur16eKinematics.ts, ur20Kinematics.ts,
│   │   │   ur3ClassicKinematics.ts, ur5ClassicKinematics.ts, ur10ClassicKinematics.ts
│   │   │                       # Dünne modellweise UR-Daten zu Kette/Grenzen/Home-Pose
│   │   └── list/                # 26 vorgefertigte Beispieltrajektorien (Kreise, Spiralen, XY-Tisch-Muster, Pick-and-Place, ...)
│   ├── lib/canOta.ts            # CAN-OTA-Simulations-/Protokollschicht, GitHub-Firmware-Download
│   ├── lib/apiBase.ts           # Backend-URL-Auflösung - relativ+geproxyt im Dev, VITE_API_BASE_URL in Prod
│   └── locales/                 # en/es/de/fr/it-Übersetzungsdateien (react-i18next)
├── public/models/                # Echte 3D-Mesh-Assets - ein Ordner pro Roboter (24 insgesamt),
│                                  # jeder mit eigener ATTRIBUTION.txt - siehe die Lizenztabelle weiter unten
├── images/                       # README-Banner
├── .env.example                  # VITE_API_BASE_URL-Vorlage - siehe src/lib/apiBase.ts
├── README.md                     # diese Datei (auf Englisch)
└── README_spa.md / README_ita.md / README_fra.md / README_deu.md  # Übersetzungen
```

Das Backend, mit dem diese App kommuniziert (Settings-Persistenz, die REST-/WebSocket-API, `docs/REMOTE_API.md`), lebt im separaten **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)**-Repository, nicht in diesem hier - siehe das eigene README dieses Projekts für dessen Struktur und wie man es ausführt.

---

## 🛠️ Entwicklungsumgebung

### Voraussetzungen
- [Node.js](https://nodejs.org/) (v18 oder höher empfohlen)
- npm
- Ein laufendes **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)**-Backend (dort ebenfalls `npm run dev`, Standardport `3000`) - diese App ist ein reiner Client und hat ohne dieses Backend niemanden, mit dem sie sprechen könnte.

### Installation

```bash
npm install
```

### Entwicklungsmodus

Führt den eigenen Dev-Server von Vite aus (einfaches `vite`, Port `5173`) mit Live-Reloading. Das eigene `server.proxy` von `vite.config.ts` leitet `/api`, `/ws`, und `/WORKS` transparent an `http://localhost:3000` weiter, sodass die Fetch-/WebSocket-Aufrufe der App mit relativem Pfad das HYDRA-UMC-SERVER-Backend ohne CORS-Konfiguration erreichen - stellen Sie nur sicher, dass dieses Backend zuerst läuft:
- **Windows:** Doppelklick auf `dev.bat` oder `npm run dev` ausführen
- **Linux/Mac:** `./dev.sh` oder `npm run dev` ausführen

### Produktions-Build

Kompiliert zu einem optimierten statischen Build (einfaches `vite build` - kein Server-Bundling, diese App hat keinen Backend-Code mehr):
- **Windows:** Doppelklick auf `build.bat` oder `npm run build` ausführen
- **Linux/Mac:** `./build.sh` oder `npm run build` ausführen

Den Produktions-Build lokal in der Vorschau ansehen mit:
```bash
npm run preview
```

Stellen Sie den resultierenden `dist/`-Ordner auf einem beliebigen statischen Host bereit. Standardmäßig sucht die gebaute App ihr Backend unter demselben Hostnamen dieser Seite auf Port `3000` (entspricht dem üblichen "alles auf der CM5"-Deployment); setzen Sie `VITE_API_BASE_URL` zur Build-Zeit (siehe `.env.example`), um sie auf eine anderswo gehostete HYDRA-UMC-SERVER-Instanz zu verweisen. Aller echte Zustand und alle Daten bleiben im eigenen `data/`-Verzeichnis dieses Backends erhalten, nicht in diesem Repository.

### Versionierung

Jeder echte `npm run build` erhöht automatisch das Feld `version` in `package.json` (`scripts/bump-version.mjs`, als erster Schritt des `build`-Skripts eingebunden) - ein "Kilometerzähler" auf Basis 10: patch +1 pro Build, mit Übertrag auf minor (und von minor auf major) sobald 9 überschritten wird, statt je ein zweistelliges Segment zu erreichen (`1.0.9` -> `1.1.0`, nicht `1.0.10`). Die laufende Version ist live im **About**-Dialog sichtbar, die vollständige Historie steht in [`CHANGELOG.md`](CHANGELOG.md).

---

## 🔗 Verwandte Projekte

Dieses Projekt ist Teil eines größeren Robotik-Ökosystems desselben Autors (JuanenRac / Electro Hobby 3D). Es lohnt sich, dies zu wissen, da eine Anfrage tatsächlich eines dieser Projekte betreffen könnte, statt dieses Repository:

**HYDRA-UMC-Plattform** — die Multi-Roboter-Mikrofabrikzelle
- **[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)** — die Hauptplatine selbst: Raspberry-Pi-CM5-Host + Dual-Core-STM32H745-Echtzeit-Coprozessor, orchestriert bis zu 8 verteilte Roboterarme über CAN-OTA/SPI-OTA. Eigene Hardware + Firmware, GPL-3.0/CERN-OHL-S v2/CC BY-SA 4.0.
- **HYDRA-UMC STUDIO** *(dieses Repository)* — webbasiertes Steuerungs-Dashboard für HYDRA-UMC: Multi-Roboter-3D-Visualisierung, Kinematik-/Trajektorienaufzeichnung, CAN-OTA-Flashing und -Testing für die gesamte Plattform. Reiner Vite/React-Client - React + Vite + Three.js, kein eigener Backend-Code.
- **[HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** — Headless-Express/WebSocket-API-Backend für die gesamte Plattform: Roboter-/Controller-Zustand, Authentifizierung, mDNS-Discovery, Modell-Einreichungen. Läuft unabhängig von dieser App - siehe das eigene README dieses Projekts dafür, warum es ein separater Prozess ist.
- **[HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL)** — Android-Steuerungs-App für HYDRA-UMC über Wi-Fi/Bluetooth. Echte, funktionierende App - vollständiger Funktionsumfang für Fernsteuerung, JWT-Authentifizierung, verschlüsselte Anmeldedaten-Speicherung.
- **[HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL)** — iOS/iPadOS-Steuerungs-App für HYDRA-UMC über Wi-Fi, gebaut in Flutter (plattformübergreifend, unter Windows ohne Mac verifizierbar; die endgültige `.ipa`-Verpackung benötigt weiterhin Xcode). Echte, funktionierende App - gleicher Funktionsumfang wie die Android-App.
- **[HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)** — Desktop-Schwarm-Kommandozentrale (Python/PySide6): Multi-Controller-Netzwerkerkennung, bidirektionale Live-Synchronisation, echter 3D-Roboter-Viewport, andockbarer Arbeitsbereich im Photoshop-Stil. Echt und funktionierend, kein Platzhalter.
- **[HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF)** — grafischer Desktop-URDF-Ersteller/-Editor (Python/PySide6) für den eigenen Modellkatalog dieses Projekts: zieht Quelldateien von GitHub oder einem lokalen Ordner, validiert die DOF-Machbarkeit, bearbeitet Farbe/Skalierung/Kinematik mit einer Live-3D-Vorschau, und überträgt das fertige Ergebnis an einen laufenden STUDIO-Server (siehe das eigene `POST /api/models/submit` dieses Projekts und Config > Models). Echt und funktionierend, kein Platzhalter.
- **[HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)** — native Flutter-Touch-UI für HYDRA-UMCs eigenen 5"/7"-DSI-Touchscreen (1280×720, gleiche Auflösung bei beiden Größen) am Compute Module 5, die denselben Server direkt von der Platine aus steuert. Echtes, funktionierendes Grundgerüst mit allen 6 Katalogbildschirmen (Dashboard, manuelle Steuerung, Kamera, vereinfachte 3D-Ansicht, Systemmetriken, Login), angebunden an den Live-Server; der echte Linux-Build wurde bisher noch nicht auf echter Hardware ausgeführt (bislang nur Windows-Arbeitsumgebung - siehe das eigene README dieses Projekts).

**URTC-Plattform** — der Werkzeugkopf-Controller, den jeder HYDRA-UMC-Roboterarm mit sich führt
- **[URTC](https://github.com/JuanenRac/URTC)** — Universal Robot Tool Controller: STM32F303-basierter CAN-Bus-Werkzeugkopf-Controller, 25 vollständig implementierte Werkzeugprofile, CAN-OTA-Firmware-Update.
- **[URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)** — Desktop-Tool für CAN-OTA- + Full-Chip-SWD/JTAG-Flashing für URTC-Platinen (Windows/Linux).
- **[URTC Tester](https://github.com/JuanenRac/URTC-TESTER)** — Desktop-Tool für Live-CAN-Bus-Diagnose für URTC-Platinen, ein Panel pro Werkzeugprofil (Windows/Linux).
- **[URTC Web Studio](https://github.com/JuanenRac/URTC-WEB-STUDIO)** — browserbasierte Alternative zu den 2 Desktop-Tools oben (Web Serial API + SLCAN), keine lokale Installation nötig.

---

## 👤 Autor

**JuanenRac** (Electro Hobby 3D)
📧 electrohobby3d@gmail.com
📺 youtube.com/@electrohobby3d

---

## 📜 Lizenz- und Urheberrechtshinweise

HYDRA-UMC STUDIO ist (c) 2026 JuanenRac (Electro Hobby 3D). Dieser Hinweis muss in jeder Verbreitung dieses Projekts oder abgeleiteter Werke enthalten sein.

Der Quellcode dieser Anwendung ist unter der **GNU General Public License v3.0 (GPL-3.0)** verfügbar. Vollständiger Text unter https://www.gnu.org/licenses/gpl-3.0.html.

Die Dokumentation (dieses README und seine eigenen Übersetzungen - `README_spa.md`, `README_ita.md`, `README_fra.md`, `README_deu.md`) ist unter **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)** verfügbar. Vollständiger Text unter https://creativecommons.org/licenses/by-sa/4.0/.

**Roboter-Mesh-Assets von Drittanbietern:** die echte 3D-Geometrie unter `public/models/` ist NICHT von der obigen GPL-3.0 abgedeckt - die eigenen Mesh-Dateien jedes Robotermodells sind separat lizenzierte Assets von Drittanbietern, hier unter ihren eigenen ursprünglichen Bedingungen weiterverbreitet:

| Hersteller | Modelle | Lizenz |
|---|---|---|
| Source Robotics | Parol6 | GPL-3.0 |
| Source Robotics | Faze4 | MIT |
| Annin Robotics | AR3, AR4 | MIT |
| Universal Robots | UR3e, UR5e, UR10e, UR16e, UR20 | BSD-3-Clause |
| UFACTORY | xArm6, Lite 6 | BSD-3-Clause |
| Comau | e.DO | BSD-3-Clause |
| Kinova | Gen3 Lite | BSD-3-Clause |
| FANUC | M-710iC | BSD-3-Clause |
| The Robot Studio | SO-ARM100 | Apache-2.0 |
| Kinova | Gen2 (j2s6s200) | BSD-3-Clause |
| AgileX | PiPER | Apache-2.0 |
| Unitree | Z1 | BSD-3-Clause |
| Trossen Robotics | ViperX 300, WidowX 250 | BSD-3-Clause |
| Koch / Low-Cost Robot Arm | Koch v1.1 | Apache-2.0 |
| Universal Robots (classic) | UR3, UR5, UR10 | BSD-3-Clause |
| Opulo | LumenPnP v4 (auch für JuanenPnP verwendet) | CERN-OHL-W v2 |

Die exakte Referenz auf das Quell-Repository, den Pfad, und den Lizenztext jedes Modells befindet sich in der eigenen `public/models/<slug>/ATTRIBUTION.txt` dieses Modells - konsultieren Sie diese Datei, bevor Sie einen bestimmten Mesh-Satz weiterverbreiten, statt anzunehmen, dass die obige Tabelle sie ersetzt. Es lohnt sich, die eigene `ATTRIBUTION.txt` von LumenPnP vollständig zu lesen - im Gegensatz zu jedem Roboterarm oben (vom Hersteller selbst vorgefertigte STL-Dateien, unverändert heruntergeladen), wurden diese 5 Mesh-Dateien intern aus Opulos echter FreeCAD-Quelle erzeugt und nicht unverändert weiterverbreitet.

Dieses Dashboard ist das Web-Steuerungspanel für das Hauptplatinen-Projekt [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) - siehe dieses Repository für die eigene Lizenzierung seiner Hardware (CERN-OHL-S v2) und Firmware (GPL-3.0), auf die sich die eigene Lizenz dieses Repositorys nicht erstreckt, und umgekehrt. Es implementiert außerdem CAN-OTA-Tools gegen das [URTC](https://github.com/JuanenRac/URTC)-Protokoll - siehe das eigene Repository dieses Projekts für dessen eigene separate Lizenz.

Wenn Sie auf diesem Projekt aufbauen, behalten Sie die Lizenztrennung im Hinterkopf: Codeänderungen sollten GPL-3.0 bleiben, Dokumentationsableitungen sollten CC BY-SA bleiben, und jede Weiterverbreitung der Mesh-Assets eines bestimmten Roboters sollte unter der eigenen ursprünglichen Lizenz dieses Modells bleiben - jeweils mit Namensnennung zurück zu diesem Projekt und seinem Autor.
