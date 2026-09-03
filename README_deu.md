<p align="center">
  <img src="images/HYDRA_UMC_BANNER.svg" alt="HYDRA-UMC-STUDIO banner" width="100%">
</p>

# 🖥️ HYDRA-UMC STUDIO

<p align="center">
  <a href="README.md">🇺🇸 English</a> |
  <a href="README_spa.md">🇪🇸 Español</a> |
  <a href="README_fra.md">🇫🇷 Français</a> |
  <a href="README_ita.md">🇮🇹 Italiano</a> |
  🇩🇪 <b>Deutsch</b> |
  <a href="README_zho.md">🇨🇳 简体中文</a> |
  <a href="README_jpn.md">🇯🇵 日本語</a>
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

USB- und Bluetooth-Controller-Integration mit benutzerdefinierten Zuordnungen pro Taste/pro Achse, zum Joggen von Robotern und Zubehör ohne Maus/Tastatur. Echtzeitaktionen (Gelenk-/Tisch-Jog, E-STOP, START/STOP, Wiedergabegeschwindigkeit) lösen denselben atomaren `sendRobotCommand()`-Pfad aus, den auch die Jog-Schaltflächen im Roboter-Detailpanel verwenden, nicht das entprellte Speichern der Einstellungen - siehe `GamepadController.tsx`.

---

## 📹 Kamera-Integration

Bis zu 8 gleichzeitige Live-Feeds (USB-Bildverarbeitung oder Wärmebildsensoren der Familie MLX90640/41/42) mit Aufzeichnungs- und Inferenzstatus - die Kameramatrix, um die herum das eigene duale USB-3.0-Hub-Subsystem von HYDRA-UMC aufgebaut ist.

---

## 🌐 Mehrsprachige Benutzeroberfläche

Vollständige Übersetzung der Oberfläche in **Englisch, Spanisch, Deutsch, Französisch, Italienisch, vereinfachtem Chinesisch und Japanisch** (`src/locales/`), einschließlich des In-App-Hilfemenüs, des Info-Dialogs (Version/Autor/Lizenz), und jeder Registerkarte des Dialogs für die Systemkonfiguration. Die Abdeckung liegt noch nicht bei 100 % jedes Bildschirms - eine Handvoll eigenständiger Zubehörpanels ist noch fest in Englisch codiert und wurde von der Übersetzungsarbeit noch nicht erreicht.

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
│   │   ├── ConfirmDialog.tsx    # Geteiltes Ja/Nein-Bestätigungsmodal
│   │   ├── AuthGate.tsx, UsersPanel.tsx  # Anmeldebildschirm und der admin-/operator-Kontoverwalter von Config > Users
│   │   ├── AdminServer.tsx, AdminLogs.tsx, AdminClients.tsx  # Ecosystem-Menü: Panels für Server-
│   │   │                       # Administration, Server-Logs und Connected Apps
│   │   ├── EcosystemServices.tsx, EcosystemTelemetry.tsx, AiFamilyStatus.tsx  # Ecosystem-Menü:
│   │   │                       # Panels für Services, Telemetrie und AI-Family-Status
│   │   ├── SystemSupervisor.tsx  # Ecosystem-Menü: Echtzeit-Supervisor im Netdata-Stil für CPU/
│   │   │                       # Speicher/Festplatte/Temperatur/Prozesse, pollt HYDRA-UMC-SERVERs GET /api/system/supervisor
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
│   │   │                       # Navigationspfad angebunden (toter Code)
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
│   └── locales/                 # en/es/de/fr/it/ja/zh-Übersetzungsdateien (react-i18next)
├── public/
│   ├── models/                  # Echte 3D-Mesh-Assets - ein Ordner pro Roboter (24 insgesamt),
│   │                             # jeder mit eigener ATTRIBUTION.txt - siehe die Lizenztabelle weiter unten
│   ├── WORKS/                   # Beispiel-Trajektorien, ein Ordner pro Roboter
│   ├── settings.json            # Vorbelegte Beispiel-Settings für einen frischen Checkout
│   └── favicon.svg, icons.svg   # App-Icon und geteiltes Icon-Sprite
├── images/                       # README-Banner
├── tools/
│   ├── build_test.py            # Build-/Kompilierprüfung ohne Versionserhöhung
│   ├── ci_validate.py           # Manifest-/CHANGELOG-/Doku-Validierung, von der CI genutzt
│   └── generate_portable_works.py  # Regeneriert die Beispiel-Trajektorien von public/WORKS/
├── example_trajectory.json       # Eigenständige Beispiel-Trajektorie (Gelenkwinkel-Sequenz, Beispieldaten)
├── metadata.json                 # App-Name/-Beschreibung (verwendet von der Hosting-Plattform)
├── bump_manifest_version.py      # Synchronisiert die Version von hydra-umc.project.json mit der nativen (--sync)
├── build.sh / build.bat          # Installiert Abhängigkeiten + Produktions-Build
├── build-test.sh / build-test.bat  # Build-/Kompilierprüfung ohne Versionserhöhung
├── dev.sh / dev.bat              # Installiert Abhängigkeiten + startet den Vite-Dev-Server
├── .env.example                  # VITE_API_BASE_URL-Vorlage - siehe src/lib/apiBase.ts
├── README.md                     # diese Datei (auf Englisch)
└── README_spa.md / README_ita.md / README_fra.md / README_deu.md / README_zho.md / README_jpn.md  # Übersetzungen
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

`bump_manifest_version.py` (Repo-Wurzel) ist der alleinige Eigentümer sowohl von `hydra-umc.project.json` als auch des `version`-Felds in `package.json` - `npm run build` (`vite build`) ist bewusst rein kompilierend, damit dadurch nie eine Divergenz zwischen beiden entstehen kann, indem nur eines von beiden erhöht wird. `scripts/bump-version.mjs` ist ein veralteter, nativer Helfer, der nur als Referenz erhalten bleibt; nichts in diesem Repo ruft ihn noch auf. Das Schema selbst bleibt der ökosystemweite "Kilometerzähler" auf Basis 10: patch +1 pro echtem Inkrement, mit Übertrag auf minor (und von minor auf major) sobald 9 überschritten wird, statt je ein zweistelliges Segment zu erreichen (`0.0.9` -> `0.1.0`, nicht `0.0.10`). Die laufende Version ist live im **About**-Dialog sichtbar (gelesen aus `GET /api/hydra-info`, das der Express-Server beim Start direkt aus `package.json` liest), die vollständige Historie steht in [`CHANGELOG.md`](CHANGELOG.md).

---

## 🔗 Verwandte Projekte

Dieses Projekt ist Teil des HYDRA-UMC-Robotik-Ökosystems desselben Autors (JuanenRac / Electro Hobby 3D). Gut zu wissen, da eine Anfrage eigentlich eines dieser Projekte betreffen könnte statt dieses Repositorys.

**Übergeordnetes Projekt**
- **[HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** — das reale Headless-Backend (REST/WebSocket), mit dem jeder Steuerungsclient tatsächlich spricht; dieses Dashboard ist ein reiner Frontend-Client davon, ohne eigenen Backend-Code.

**Geschwisterprojekte** — sprechen ebenfalls mit der eigenen API von HYDRA-UMC-SERVER, jeweils als eigener Client
- **[HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)** — Desktop-Schwarmleitstand (PySide6) für mehrere Server gleichzeitig, verpackt als eigenständige ausführbare Datei.
- **[HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL)** — native Android-Steuerungs-App mit biometrischem Login und einer gekoppelten Wear-OS-Begleit-App.
- **[HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL)** — iOS/iPadOS-Steuerungs-App (Flutter) mit Echtzeit-WebSocket-Synchronisierung.
- **[HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)** — native Touch-UI für das eingebaute 7"-DSI-Touchscreen, direkt auf dem CM5 eingebettet.
- **[HYDRA-UMC-BRIDGE-AMR](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-AMR)** — Koordinationsschranke für AGV-/AMR-Flotten über einen echten VDA-5050-MQTT-Publisher.
- **[HYDRA-UMC-BRIDGE-CNC](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-CNC)** — High-Level-Koordinator für CNC-Zellen mit echtem GRBL-Status-/Steuerbyte-Zugriff.
- **[HYDRA-UMC-BRIDGE-DROIDS](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-DROIDS)** — Koordinationsschranke für laufende/humanoide Droiden, mit einem echten Boston-Dynamics-Spot-Befehlssender.
- **[HYDRA-UMC-BRIDGE-LASER](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-LASER)** — Sicherheitskoordinator für Laserzellen, liest 3 echte Schlüssel-/Gehäuse-/Verriegelungs-GPIO-Sicherungen.
- **[HYDRA-UMC-BRIDGE-OPENPNP](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-OPENPNP)** — sicherer High-Level-Koordinator für den Leiterplattenfluss von OpenPnP Pick-and-Place.
- **[HYDRA-UMC-BRIDGE-PRINTER3D](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-PRINTER3D)** — sichere Koordinationsschranke für Moonraker/Klipper-3D-Drucker, mit echten gesicherten Job-Befehlen.
- **[HYDRA-UMC-BRIDGE-ROS2](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-ROS2)** — Sicherheitskoordinator mit einem echten, träge importierten rclpy-ROS-2-Transport.
- **[HYDRA-UMC-BRIDGE-UAV](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-UAV)** — Koordinationsschranke für kameraausgestattete UAVs, mit einem echten MAVLink-Befehlssender.

**Untergeordnete Projekte**
- **[HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF)** — grafischer Desktop-URDF-Ersteller/-Editor, der fertige Modelle über `POST /api/models/submit` in den eigenen Katalog dieses Dashboards überträgt.

**Direkt verwandt**
- **[HYDRA-UMC-DASHBOARD-AI](https://github.com/JuanenRac/HYDRA-UMC-DASHBOARD-AI)** — Smart-Summaries- und Anomaly-Highlighting-Panels über DATALAKE/ANOMALY-DETECTOR, mit einem ehrlichen statistischen Fallback; erweitert dasselbe Dashboard um KI-gestützte Einblicke.
- **[HYDRA-UMC-COGNITIVE-NODE](https://github.com/JuanenRac/HYDRA-UMC-COGNITIVE-NODE)** — Integrationsknoten für die Hailo-10-Cognitive-Pipeline (LLM-/VLA-/Sprach-Orchestrierung); fügt diesem Dashboard Sprach-/Natural-Language-Steuerung hinzu.
- **[HYDRA-UMC-VOICE-UI](https://github.com/JuanenRac/HYDRA-UMC-VOICE-UI)** — echtes Sprach-Frontend (VAD + Intent-Parser) mit einem begrenzten, bestätigungsgesicherten Watch-Relay; fügt diesem Dashboard Sprach-/Natural-Language-Steuerung hinzu.
- **[HYDRA-UMC-TWIN](https://github.com/JuanenRac/HYDRA-UMC-TWIN)** — Integrationsknoten für die Digital-Twin-Engine, mit einem echten Versionskompatibilitäts-Sync-Vertrag; ermöglicht eine Vorschau am digitalen Zwilling, bevor der echte Roboter berührt wird, direkt aus diesem Dashboard.
- **[HYDRA-UMC-HIL-BRIDGE](https://github.com/JuanenRac/HYDRA-UMC-HIL-BRIDGE)** — echte Hardware-in-the-Loop-Sicherheitsverriegelung, die Befehle zwischen Simulation und echter Hardware routet; ermöglicht eine Vorschau am digitalen Zwilling, bevor der echte Roboter berührt wird, direkt aus diesem Dashboard.

**Ebenfalls Teil des Ökosystems**

*Kern-Hardware & Plattform*
- **[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)** — das physische Motherboard des Roboterarms: CM5-Host + Dual-Core-STM32H745, koordiniert bis zu 8 Werkzeugarme über CAN-OTA/SPI-OTA.
- **[HYDRA-UMC-OS](https://github.com/JuanenRac/HYDRA-UMC-OS)** — reproduzierbare Raspberry-Pi-OS-Produktschicht für den CM5: schreibgeschützter Agent, validierte Konfiguration/Profile, WiFi-Ersteinrichtung.
- **[HYDRA-UMC-SDK](https://github.com/JuanenRac/HYDRA-UMC-SDK)** — der gemeinsame JSON-Schema-Vertrag und die Sicherheitsschranke, gegen die jede Bridge ihre Befehle validiert.

*URTC-Werkzeugplattform*
- **[URTC](https://github.com/JuanenRac/URTC)** — Firmware für die physische Universal-Robot-Tool-Controller-Platine, 25+ Werkzeugprofile über CAN-Bus.
- **[URTC-FLASHER](https://github.com/JuanenRac/URTC-FLASHER)** — Desktop-GUI-Flash-Tool für URTC-Platinen, CAN-OTA plus Full-Chip-SWD/JTAG.
- **[URTC-TESTER](https://github.com/JuanenRac/URTC-TESTER)** — Desktop-Live-CAN-Bus-Diagnosetool für URTC-Platinen, ein Panel pro Werkzeugprofil.
- **[URTC-WEB-STUDIO](https://github.com/JuanenRac/URTC-WEB-STUDIO)** — browserbasierte Alternative zu URTC-TESTER über die Web-Serial-API, ohne lokale Installation.

*Vision-KI-Knoten (Hailo-8)*
- **[HYDRA-UMC-VISION-NODE](https://github.com/JuanenRac/HYDRA-UMC-VISION-NODE)** — Integrationsknoten für die Hailo-8-Vision-Pipeline, mit einer echten stufenweisen Hardware-Bereitschaftsprüfung.
- **[HYDRA-UMC-DETECTION-HEF](https://github.com/JuanenRac/HYDRA-UMC-DETECTION-HEF)** — echte Registry für kompilierte Modelle mit Hailo-Architektur-/Prüfsummen-Safe-Load-Verifizierung.
- **[HYDRA-UMC-VISION-STREAMER](https://github.com/JuanenRac/HYDRA-UMC-VISION-STREAMER)** — echter GStreamer-Pipeline- + MediaMTX-Konfigurationsgenerator mit einer echten HailoRT-Integrationsschranke.
- **[HYDRA-UMC-VISUAL-SERVOING-API](https://github.com/JuanenRac/HYDRA-UMC-VISUAL-SERVOING-API)** — echtes Position-Based-Visual-Servoing-Korrekturgesetz, sicherheitsgesteuert nach vorgelagertem Zonenstatus.
- **[HYDRA-UMC-SAFETY-ZONES](https://github.com/JuanenRac/HYDRA-UMC-SAFETY-ZONES)** — echte Zonenverletzungsprüfung und E-STOP-Anforderung, mit erzwungener Kalibrierungsaktualität.

*Kognitiver KI-Knoten (Hailo-10)*
- **[HYDRA-UMC-VLA-ENGINE](https://github.com/JuanenRac/HYDRA-UMC-VLA-ENGINE)** — echte Aktions-Token-Kodierung/-Dekodierung und Trajektoriengenerierung für ein Vision-Language-Action-Modell.
- **[HYDRA-UMC-SEMANTIC-PLANNER](https://github.com/JuanenRac/HYDRA-UMC-SEMANTIC-PLANNER)** — echte regelbasierte Aufgabenzerlegung und semantische Fehlerbehebung über MCU-Fehlercodes.
- **[HYDRA-UMC-DOCS-QA](https://github.com/JuanenRac/HYDRA-UMC-DOCS-QA)** — echte, nur auf der Standardbibliothek basierende TF-IDF-Dokumentensuche über die eigenen Markdown-Dokumente dieses Ökosystems.

*Orchestrierung & Schwarm*
- **[HYDRA-UMC-ORCHESTRATOR](https://github.com/JuanenRac/HYDRA-UMC-ORCHESTRATOR)** — Integrationsknoten mit einem echten gRPC/Protobuf-Health-Report-Vertrag und einer Missions-Zustandsmaschine.
- **[HYDRA-UMC-JOB-DISPATCHER](https://github.com/JuanenRac/HYDRA-UMC-JOB-DISPATCHER)** — echte prioritätsbasierte Job-Queue mit Deduplizierung, über eine echte HTTP-API.
- **[HYDRA-UMC-NODE-HEALING](https://github.com/JuanenRac/HYDRA-UMC-NODE-HEALING)** — echter gRPC-basierter Flotten-Health-Watchdog mit Retry/Backoff und Identitäts-Mismatch-Erkennung.
- **[HYDRA-UMC-PATH-PLANNER-3D](https://github.com/JuanenRac/HYDRA-UMC-PATH-PLANNER-3D)** — echter RRT-basierter 3D-Pfadplaner mit echter Hindernis-/Arbeitsraum-Kollisionsvalidierung.
- **[HYDRA-UMC-SWARM-SYNC](https://github.com/JuanenRac/HYDRA-UMC-SWARM-SYNC)** — echte CRDT-LWW-Element-Map-Zustandssynchronisation, eigenschaftsgetestet auf Multi-Zellen-Konvergenz.

*Digitaler Zwilling & Simulation*
- **[HYDRA-UMC-PHYSICS-REPLICA](https://github.com/JuanenRac/HYDRA-UMC-PHYSICS-REPLICA)** — echte Vorwärtskinematik und Gelenkgrenzenvalidierung über eine echte URDF-Teilmenge.
- **[HYDRA-UMC-SYNTHETIC-DATA-GEN](https://github.com/JuanenRac/HYDRA-UMC-SYNTHETIC-DATA-GEN)** — echter prozeduraler 2D-Szenengenerator mit YOLO/COCO-Annotationsexport.

*Daten & Analytik*
- **[HYDRA-UMC-DATALAKE](https://github.com/JuanenRac/HYDRA-UMC-DATALAKE)** — echter sqlite3-gestützter Zeitreihenspeicher mit einer echten Ingest-/Abfrage-HTTP-API.
- **[HYDRA-UMC-ANOMALY-DETECTOR](https://github.com/JuanenRac/HYDRA-UMC-ANOMALY-DETECTOR)** — echter FFT- + statistischer Basislinien-Anomaliedetektor mit Drift-Überwachung.
- **[HYDRA-UMC-PRODUCTION-REPORTS](https://github.com/JuanenRac/HYDRA-UMC-PRODUCTION-REPORTS)** — echte OEE-/Verfügbarkeitsberechnung über den DATALAKE-Verlauf, mit reproduzierbarem CSV-Export.
- **[HYDRA-UMC-TELEMETRY-COLLECTOR](https://github.com/JuanenRac/HYDRA-UMC-TELEMETRY-COLLECTOR)** — echte CAN/WebSocket-Ingestion-Pipeline in DATALAKE, mit Sequenz-Deduplizierung.

*Industrie-Gateway*
- **[HYDRA-UMC-GATEWAY-INDUSTRIAL](https://github.com/JuanenRac/HYDRA-UMC-GATEWAY-INDUSTRIAL)** — Integrationsknoten, der zu Industrieprotokollen weiterleitet, mit einer echten Befehls-Allowlist-/Backpressure-Schicht.
- **[HYDRA-UMC-OPCUA-SERVER](https://github.com/JuanenRac/HYDRA-UMC-OPCUA-SERVER)** — echter OPC-UA-Adressraum, verifiziert mit einer echten Binärprotokoll-Client-Session.
- **[HYDRA-UMC-MQTT-BROKER](https://github.com/JuanenRac/HYDRA-UMC-MQTT-BROKER)** — echter MQTT-Broker mit optionaler Pro-Client-Authentifizierung und Topic-ACLs.
- **[HYDRA-UMC-MTCONNECT-ADAPTER](https://github.com/JuanenRac/HYDRA-UMC-MTCONNECT-ADAPTER)** — echte MTConnect-`/probe`- und `/current`-XML-Endpunkte mit Degraded-Mode-Ausgabe.

*Ergänzende Tools & Ökosystembetrieb*
- **[HYDRA-UMC-TOOL-CLI](https://github.com/JuanenRac/HYDRA-UMC-TOOL-CLI)** — Flotten-CLI mit einem echten, stabilen Exit-Code-Vertrag, ein echter Live-Client der eigenen API von HYDRA-UMC-SERVER.
- **[HYDRA-UMC-WATCH](https://github.com/JuanenRac/HYDRA-UMC-WATCH)** — WearOS-Begleit-App mit echten haptischen Alarmen und einem Sprach-Relay zum gekoppelten Telefon.
- **[URTC-SMART-RACK](https://github.com/JuanenRac/URTC-SMART-RACK)** — Firmware für ein Platinenmontagegestell mit echter Werkzeug-ID-Dekodierung und Smart-Idle-Vorheizlogik.
- **[URTC-VISION-TOOL](https://github.com/JuanenRac/URTC-VISION-TOOL)** — Firmware plus ein echter Python-Vision-Begleiter für einen Thermal-/RGB-Inspektionswerkzeugkopf.
- **[HYDRA-UMC-UPDATER](https://github.com/JuanenRac/HYDRA-UMC-UPDATER)** — administratives Desktop-Tool, das jedes Repository in diesem Ökosystem entdeckt, klont und aktualisiert.

Insgesamt umfasst das Ökosystem dieses Autors viele weitere Projekte über dieses hinaus - das Obige ist eine Landkarte, keine vollständige Funktionsliste; das jeweils eigene README jedes Repositories gibt Auskunft darüber, was es heute tatsächlich leistet.

---

## 📚 Dokumentation & Community

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — Technologie-Stack und Coding-Richtlinien für einen Pull Request.
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** — die in dieser Community erwarteten Verhaltensstandards.
- **[SECURITY.md](SECURITY.md)** — wie man eine Schwachstelle meldet, und die echten Sicherheitsschwerpunkte dieses Projekts.
- **[SUPPORT.md](SUPPORT.md)** — wo man Fragen stellt und Fehler meldet.
- **[LICENSE.md](LICENSE.md)** — die eigene Lizenz dieses Projekts.

## 👤 AUTOR
**JuanenRac** (Electro Hobby 3D)
📧 electrohobby3d@gmail.com
📺 [youtube.com/@electrohobby3d](https://youtube.com/@electrohobby3d)

## 📜 LIZENZ

HYDRA-UMC STUDIO ist (c) 2026 JuanenRac (Electro Hobby 3D). Dieser Hinweis muss in jeder Verbreitung dieses Projekts oder abgeleiteter Werke enthalten sein.

Der Quellcode dieser Anwendung ist unter der **GNU General Public License v3.0 (GPL-3.0)** verfügbar. Vollständiger Text unter https://www.gnu.org/licenses/gpl-3.0.html.

Die Dokumentation (dieses README und seine eigenen Übersetzungen - `README_spa.md`, `README_ita.md`, `README_fra.md`, `README_deu.md`, `README_zho.md`, `README_jpn.md`) ist unter **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)** verfügbar. Vollständiger Text unter https://creativecommons.org/licenses/by-sa/4.0/.

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
