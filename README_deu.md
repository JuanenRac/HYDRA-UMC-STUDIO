<!-- =============================================================================
HYDRA-UMC-STUDIO - Web control dashboard of the HYDRA-UMC multi-robot micro-factory
Copyright (C) JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
GPL-3.0-or-later - see LICENSE
============================================================================= -->

<p align="center">
  <img src="images/HYDRA_UMC_BANNER.svg" alt="HYDRA-UMC-STUDIO banner" width="100%">
</p>

# 🤖 HYDRA-UMC-STUDIO

<p align="center"><a href="README.md">🇺🇸 English</a> | <a href="README_spa.md">🇪🇸 Español</a> | <a href="README_fra.md">🇫🇷 Français</a> | <a href="README_ita.md">🇮🇹 Italiano</a> | 🇩🇪 <b>Deutsch</b> | <a href="README_zho.md">🇨🇳 简体中文</a> | <a href="README_jpn.md">🇯🇵 日本語</a> | <a href="README_por.md">🇵🇹 Português</a></p>

### 🤖 Webbasiertes Steuerungs-Dashboard für die HYDRA-UMC Multi-Roboter-Mikrofabrik

<p align="center">
  <img src="https://img.shields.io/badge/License-GPL%203.0--or--later-blue.svg" alt="GPL 3.0 or later">
  <img src="https://img.shields.io/badge/Framework-React%2019-61DAFB.svg" alt="Framework">
  <img src="https://img.shields.io/badge/Tool-Vite-646CFF.svg" alt="Tool">
  <img src="https://img.shields.io/badge/3D-Three.js-black.svg" alt="3D">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6.svg" alt="Language">
  <img src="https://img.shields.io/badge/Tests-631%20passing-2ea44f.svg" alt="Tests">
  <img src="https://img.shields.io/badge/Version-0.8.0.2-0f6cbd.svg" alt="Version">
  <img src="https://img.shields.io/badge/Maturity-functional-0F6CBD.svg" alt="Maturity">
</p>

---

> **Stand von Sicherheit (Safety) und Security:** Dieses Ökosystem ist kein zertifiziertes Sicherheitssystem. Es gibt noch keinen Hardware-E-STOP-Pfad, keine von der Firmware durchgesetzten Grenzen oder Verriegelungen und keinen verifizierten Bewegungsbefehl; Firmware-Images werden mit CRC-32 und einer Ed25519-Signatur geprüft, und ein Release-Build verweigert die veröffentlichten Entwicklungsschlüssel (die Werkzeugköpfe und Erweiterungsplatinen hinter dem Relais laufen noch mit URTC-Bootloadern, die statt einer Signatur ein HMAC-SHA256 mit gemeinsamem Schlüssel verwenden); TLS und gegenseitiges TLS sind optional und standardmäßig aus; noch keine eigene Platine wurde bestückt oder getestet. Lesen Sie die [Sicherheitsbasis](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md) und das [Bedrohungsmodell](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md), bevor Sie sich für die Sicherheit einer Person auf eine Aussage hier verlassen.

---

## 📋 Auf einen Blick

| | |
|---|---|
| Version | `0.8.0.2` |
| Reifegrad | Funktionsfähig |
| Tests | 631 (`npm test`) |
| Technik | React 19 / Vite / Three.js / Tailwind CSS |
| Ziel | Der Raspberry Pi CM5 einer HYDRA-UMC-Zelle |
| Auf echter Hardware | Noch nicht: für diese Version ist kein Lauf auf echter Hardware vermerkt |

**Springe zu:** [Überblick](#-überblick) · [Architektur](#-architektur) · [Funktionen](#-funktionen) · [Sicherheit und Schutz](#-sicherheit-und-schutz) · [Schnittstellen](#-schnittstellen) · [Konfiguration](#-konfiguration) · [Schnellstart](#-schnellstart) · [Tests](#-tests) · [Fehlerbehebung](#-fehlerbehebung) · [Struktur des Repositorys](#-struktur-des-repositorys) · [Verwandte Projekte](#-verwandte-projekte)

## 🚦 Projektstatus

Jede Zeile ist ein Teil dieses Repositorys, und die Ampel sagt, wie weit er heute ist. Sie beruht auf dem, was das Repository zeigen kann (Tests, Builds, Läufe), nicht auf dem, was geplant ist.

🟢 Fertig und überprüft · 🟡 Funktioniert, mit bekannten Grenzen · 🟠 Teilweise fertig oder noch nicht überprüft · 🔴 Nicht gemacht oder funktioniert nicht

| Bereich | Stand | Was das hier bedeutet |
|---|---|---|
| Software | 🟡 | Funktioniert für seinen Hauptzweck; die Ehrlichkeitsprüfung oben nennt, was noch fehlt |
| Tests | 🟢 | 631 automatische Tests, bei jeder Änderung ausgeführt |
| Echte Hardware | 🔴 | Noch nicht: für diese Version ist kein Lauf auf echter Hardware vermerkt |
| Dokumentation | 🟢 | README in acht Sprachen, bei jeder Änderung gegen das Manifest geprüft |

## 🎯 Überblick

**HYDRA-UMC STUDIO** ist das browserbasierte Steuerungs-Dashboard für [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) - die Hauptplatine der Multi-Roboter-Mikrofabrik (Raspberry-Pi-CM5-Host + Dual-Core-STM32H745-Echtzeit-Coprozessor), die bis zu 8 verteilte Roboterarme über einen einzigen FDCAN-Bus orchestriert. Während das eigene Repository von HYDRA-UMC die Hardware und Firmware abdeckt, ist dieses Repository die dem Menschen zugewandte Seite: eine Single-Page-React-Anwendung, die jeden Roboter in echtem 3D visualisiert, deren Bewegung joggt und aufzeichnet, die Maschinen und Zubehörteile verwaltet, die eine Roboterzelle begleiten, und die gesamte CAN-OTA-Firmware-Kette flasht/testet - alles aus einem einzigen Browser-Tab heraus, ohne native Installation über Node.js hinaus.

**Ehrlichkeitshinweis, der derselben Dokumentationskonvention wie der Rest dieses Ökosystems folgt:** die eigene reale Hardware von HYDRA-UMC existiert noch nicht als getestetes Silizium (ihre Bootloader kompilieren sauber, liefen aber noch nie auf echten Platinen - siehe das eigene `docs/architecture.md` dieses Repositorys). Dieses Dashboard führt seine CAN-OTA-Flasher-/Tester-Tools daher gegen eine vollständige eingebaute Simulation aus, die dem realen, dokumentierten Adressierungsschema jeder Ebene folgt, anstatt vorzugeben, mit Hardware zu sprechen, die es nicht gibt. Die 3D-Robotervisualisierung, Kinematik, Trajektorienaufzeichnung, und jedes Zubehör-Steuerungspanel sind davon vollständig unabhängig und real - nur der CAN-OTA-Transport selbst ist vorerst simuliert.

Gebaut mit **React 19**, **Vite**, **Three.js** (über `@react-three/fiber`/`@react-three/drei`), und **TypeScript** - ein reiner Client ohne eigenen Backend-Code. Persistenter Zustand lebt auf dem separaten **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)**-Backend, mit dem diese App über das Netzwerk kommuniziert.

## 🧩 Rolle in HYDRA-UMC

**HYDRA-UMC-STUDIO** ist das Web-Bedienpanel der Zelle: Es zeichnet jeden Roboter in 3D aus seiner echten Kinematik, fährt und zeichnet Trajektorien auf, bedient die Zubehör- und Maschinenpanels, flasht und testet Firmware über die CAN-OTA-Kette und verwaltet den Server, in acht Sprachen. Es hält keinen eigenen Zustand und entscheidet nichts über Sicherheit: Rollen, Grenzen, Reservierungen und den Stopp entscheidet HYDRA-UMC-SERVER.

## 🏛️ Architektur

<p align="center">
  <img src="images/architecture.svg" alt="HYDRA-UMC-STUDIO architecture" width="100%">
</p>

## ✨ Funktionen

### Multi-Roboter-3D-Steuerung

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

### Kinematic Brain Stage

Ein dediziertes Steuerungspanel für das eigene lokale Bewegungssubsystem der HYDRA-UMC-Hauptplatine - die direkt vom STM32H745 angesteuerten Achsen, getrennt von den verteilten Roboterarmen auf STACK A:

- 📐 Jog-Steuerung des **XY-Portals** für die Achsen X, Y1, Y2 (duales Y-Portal), und Z
- 🔥 Steuerung des **beheizten Betts** (SSR-geschaltet, 230VAC)
- 🔄 **ATC-Revolver** - rotierende Werkzeugindex-Steuerung für den E0-angetriebenen automatischen Werkzeugwechsler
- 🎢 **Förderband** - Installiert-/Läuft-/Geschwindigkeitssteuerung für das E1-angetriebene Transportband
- 🛑 Ein vollständiges 12-Endschalter-Raster, 3 Lüfterkanäle, und 10 Pumpen/10 Ventile für die Prozessfluidik

### Zubehör- und Maschinensteuerungspanels

Dedizierte Panels für die Maschinen und Zubehörteile, die eine Roboterzelle begleiten: **XY-Tisch**, **ATC-Werkzeuge**, **Rack-Manager**, **Pick & Place** (einschließlich JuanenPnP-/LumenPnP-spezifischer Konfiguration), **CNC** (einschließlich JuanenCNC-spezifischer Konfiguration), **Laser** (einschließlich JuanenLaser-spezifischer Konfiguration), **Vakuumtisch**, und **beheiztes Bett**.

---

### 🧩 Auswählbare Vakuumtische

Wähle im Vakuumtisch-Menü eines von sechs echten STL-Modellen: 160 × 120, 230 × 210, 230 × 250, 232 × 217, 240 × 240 oder 250 × 250 mm. Die Basis ist 15 mm dick; die Gesamthöhe mit Ausrichtungswänden beträgt 16,2 mm. Breite und Länge sind in 5-mm-Schritten einstellbar (10–5000 mm). Die Grundfläche wird skaliert, die Dicke bleibt unverändert. Die Modellauswahl stellt die ursprünglichen Maße wieder her. Benutzerdefinierte Maße werden über SERVER synchronisiert; skalierte Löcher und Kanäle dienen der Visualisierung, nicht als neu erzeugte Fertigungs-STL. Die Auswahl erhält Position, Pumpen- und Ventilzustand; Zurücksetzen wählt 160 × 120 mm und schaltet Pumpe und Ventil aus. Alte oder unbekannte Modell-IDs zeigen das erste Modell. STUDIO und beide SUITE-Oberflächen verwenden denselben Katalog und modelId in den Robotereinstellungen.

[Modellhandbuch, Konfiguration und Neugenerierung](docs/VACUUM_TABLE_MODELS.md).

### 🔥 Heizbettmodell

Vier STL-Modelle: 100×100, 200×100, 200×200 und 255×255 mm, alle 5 mm dick. Breite/Länge in 5-mm-Schritten einstellbar (25–5000 mm); die Modellauswahl stellt die Maße wieder her, ohne die Heizung zu ändern. Nur Visualisierung, kein Elektro- oder Fertigungsentwurf.

[Heizbettmodell — STL / OpenSCAD](docs/HEATED_BED_MODELS.md).

### 🗄️ Konfigurierbare STL-Racks

STL-Rack: Breite und Tiefe 40–1000 mm in 1-mm-Schritten; 1–24 Platinen mit festem 10-mm-Abstand. Visuelle Einstellungen, keine Roboterkalibrierung.

[Konfigurierbare STL-Racks — STL / OpenSCAD](docs/RACK_MODELS.md).

### 🛠️ Unabhängige Maschinenmodelle

Separate STL-Kopien für JuanenPnP, JuanenCNC und JuanenLaser; LumenPnP behält das Original. Jedes Modell wird in seinem eigenen Ordner bearbeitet. Es gelten die CAD-Maße; bisherige Größeneinstellungen verzerren das Modell nicht.

[Unabhängige Maschinenmodelle — STL](docs/MACHINE_ASSETS.md).

Diese originalen JuanenPNP-/HYDRA-UMC-Modelle und ihre SCAD-Quellen stehen unter GPL-3.0; sie sind nicht die Maschinen-CAD-Dateien von Opulo.

### Werke und Trajektorien

Laden Sie vorgefertigte Beispieltrajektorien, joggen und zeichnen Sie live eigene Punkte auf, oder laden/speichern/bearbeiten/spielen Sie komplexe Mehrpunkt-Trajektorien (JSON) pro Roboter ab. Trajektorien sind zwischen Robotermodellen portabel - jeder aufgezeichnete Punkt wird beim Laden/Zeichnen/Abspielen über die eigene reale Kinematik dieses spezifischen Roboters (`src/examples/robotKinematicsDispatch.ts`) aufgelöst, nicht fest gegen den Roboter berechnet, mit dem er aufgezeichnet wurde, sodass dieselbe Trajektoriendatei einen Parol6 und einen UR10e korrekt entlang ihrer eigenen real erreichbaren Geometrie steuert.

### CAN-OTA-Firmware-Tools

Flashen und selbsttesten Sie Firmware über die gesamte CAN-OTA-Kette von HYDRA-UMC + URTC von einem Dashboard aus, mit zwei dedizierten Einstiegspunkten:

- **URTC → Flasher / Tester** - für die URTC-Tool-Head-Platine und ihre eigenen Erweiterungsplatinen (entspricht der eigenen Protokollabdeckung der eigenständigen Desktop-Tools [URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)/[URTC Tester](https://github.com/JuanenRac/URTC-TESTER))
- **HYDRA-UMC → Flasher / Tester** - für die Ebenen Robot Controller Board und Kinematic Brain, den ganzen Weg weitergeleitet von CM5 → SPI → STM32H745 → FDCAN1 → Robot Controller Board → CAN → URTC Tool Head, ohne JTAG-/SWD-Sonde und ohne USB-CAN-Dongle (siehe das eigene [`docs/architecture.md` von HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC/blob/main/docs/architecture.md) für das vollständige Adressierungs-/Relais-Design)

Beide können echte Firmware-Releases direkt von GitHub herunterladen (basierend auf `firmware_manifest.json`, CRC32-verifiziert), sowohl für das `URTC`- als auch das `HYDRA-UMC`-Repository. Wie oben erwähnt läuft der Transport selbst gegen eine vollständige eingebaute Simulation, bis echte STM32H745-Firmware auf echter Hardware existiert, mit der gesprochen werden kann.

### Gamepad-Unterstützung

USB- und Bluetooth-Controller-Integration mit benutzerdefinierten Zuordnungen pro Taste/pro Achse, zum Joggen von Robotern und Zubehör ohne Maus/Tastatur. Echtzeitaktionen (Gelenk-/Tisch-Jog, E-STOP, START/STOP, Wiedergabegeschwindigkeit) lösen denselben atomaren `sendRobotCommand()`-Pfad aus, den auch die Jog-Schaltflächen im Roboter-Detailpanel verwenden, nicht das entprellte Speichern der Einstellungen - siehe `GamepadController.tsx`.

### Kamera-Integration

Bis zu 8 gleichzeitige Live-Feeds (USB-Bildverarbeitung oder Wärmebildsensoren der Familie MLX90640/41/42) mit Aufzeichnungs- und Inferenzstatus - die Kameramatrix, um die herum das eigene duale USB-3.0-Hub-Subsystem von HYDRA-UMC aufgebaut ist.

### Mehrsprachige Benutzeroberfläche

Vollständige Übersetzung der Oberfläche in **Englisch, Spanisch, Deutsch, Französisch, Italienisch, vereinfachtes Chinesisch, Japanisch und Portugiesisch** (`src/locales/`), einschließlich des Hilfemenüs in der App mit seinen Schritt-für-Schritt-Anleitungen, des Assistenten, des Info-Dialogs (Version/Autor/Lizenz) und jedes Reiters des Systemkonfigurationsdialogs. Die Abdeckung beträgt noch nicht 100 % jeder Ansicht: einige eigenständige Zubehörpanels sind noch fest auf Englisch im Code.

### Hilfe, Anleitungen und Assistent

Das Hilfefenster hat einen Reiter **Schritt-für-Schritt-Anleitungen**: eine Anleitung pro Aufgabe (Controller hinzufügen, Roboter bewegen, Trajektorie aufnehmen, Kameras nutzen, Firmware flashen, Benutzer verwalten, Fernzugriff, Sicherheit ...), jeweils mit Niveau (Grundlagen, fortgeschritten, technisch), Suchfeld und einer Schaltfläche, die zur Ansicht führt, in der die Aufgabe erledigt wird. **Hydri**, der Assistent, ist ein kleines animiertes Maskottchen über dem Dashboard: Er erklärt die aktuelle Ansicht, führt Schritt für Schritt durch eine Aufgabe, beantwortet in Worten getippte Fragen ohne Server und ohne KI-Modell (in jeder der 8 Sprachen), kann die Antworten mit der Stimme des Browsers vorlesen, lässt sich überallhin ziehen und dort fixieren und wird im Hilfefenster ein- oder ausgeschaltet. Seine Einstellungen bleiben im Browser (`src/assistant/`).

### ℹ️ Info und Systemkonfiguration

Zwei eigenständige Dialoge, beide über die Kopfzeile erreichbar (Schaltflächen `Config`/`About`): **About** zeigt die laufende App-Version (live gelesen von `GET /api/hydra-info`), Autor, und Lizenz; **Config** deckt die Server-Identität, Controller-/Knotenverwaltung, UI-Thema + Sprache, Roboter-Umbenennung, Kamera↔Roboter-Zuordnung mit Konflikterkennung, die benutzerdefinierte URDF-Bibliothek, Drittanbieter-Software-Integrationen (OpenPnP-/CNC-/Laser-Backends), clientweisen Fernzugriff (unabhängige Schalter für SUITE/Android/iOS), Benutzerkonten, roboterweise Arbeitsverzeichnisse, CAN-OTA-Transport, und Gamepad-Zuordnung ab - jeweils in einer eigenen Registerkarte. Beide sind eigenständige Komponenten (`src/components/About.tsx`, `src/components/Config.tsx`), nicht inline in die Haupt-Dashboard-Shell eingebettet.

### Zuverlässigkeit

Die App schützt sich selbst gegen zwei verschiedene Klassen von Laufzeitfehlern, beide entstanden aus einem echten Produktionsvorfall (ein Kiosk-Display, das nach einem Redeploy schwarz wurde). `src/main.tsx` hört auf Vites eigenes `vite:preloadError`-Event - ausgelöst, wenn ein über einen Redeploy hinweg offen gelassener Browser-Tab versucht, einen per `React.lazy()` geladenen Panel-Chunk abzurufen (jedes `Dashboard.tsx`-Panel, inhaltsgehasht gemäß `vite.config.ts`), der unter seinem alten Hash nicht mehr existiert - und lädt die Seite einmal automatisch neu, sodass sich ein langlebiger Kiosk-Tab oder ein veralteter Hintergrund-Tab selbst heilt, ohne dass es jemand bemerkt. Ein `sessionStorage`-Schutz verhindert, dass dies endlos in eine Neulade-Schleife gerät, falls ein Chunk aus einem anderen Grund tatsächlich fehlt. Getrennt davon umschließt `src/components/ErrorBoundary.tsx` den `<Suspense>`-Panel-Bereich als Backstop für jeden anderen Render-Absturz; es ist nach dem aktiven Tab indiziert, sodass ein Wechsel von einem abgestürzten Panel tatsächlich das nächste erneut versucht, statt das ganze Dashboard auf einem Fallback-Bildschirm hängen zu lassen.
Befehle scheitern nie stillschweigend: Jeder Jog-, Wiedergabe-, Strom-, Vision- und Werkzeugbefehl liefert ein typisiertes Ergebnis, eine abgelaufene Sitzung wird einmal erneuert und wiederholt, und alles, was weiterhin abgelehnt wird, erscheint in einer Meldung. Die rote **STOP**-Taste ist global: ein Klick, ohne Bestätigung, sie hält alle Roboter aller Controller an und schaltet alle Ventile und Pumpen in einem Aufruf ab (`POST /api/stop-all`). Sie sitzt in der Kopf- und Fußzeile, im Roboter-Panel und im Fernsteuerungs-Overlay, und Strg+Umschalt+Leertaste drückt sie per Tastatur (eine Tastenkombination, die nicht versehentlich getippt wird und bei gehaltener Taste ignoriert wird). Die Antwort wird Roboter für Roboter aufgelistet (Warnung, wenn ein Roboter nicht anhielt oder der Server den Stopp nicht speichern konnte; von anderen Konten reservierte Roboter sind markiert); ein Netzwerkfehler wird einmal wiederholt, ein Server über seinem Limit (429) oder ohne die Route (404) wird mit dem Stopp je Roboter beantwortet, und eine dauerhafte Warnung „STOP nicht bestätigt“ bleibt, bis ein späterer STOP eine Antwort bekommt. Das Joystick-Jogging ist eine Totmann-Steuerung (sie endet bei Zeigerabbruch, Fensterfokusverlust, verborgenem Tab oder nach 8 Sekunden), eine J1-Bewegung bleibt beim nächstliegenden äquivalenten Winkel und ein Jog-Schritt über 20 Grad wird abgelehnt. Die Gamepad-Eingabe folgt dem in der Oberfläche gewählten Roboter und ist ratenbegrenzt. Die Firmware eines Releases wird vor dem CAN-OTA-Flashen gegen ihren sha256 geprüft, Bootloader-Images sind nur auf Wunsch wählbar, und importierte Trajektorien und Szenen werden geprüft, bevor sie den gemeinsamen Zustand erreichen.

Der Server entscheidet für jeden Client, wer einen Roboter bewegen darf und wie weit. Ein Roboter kann für das Konto und das Fenster (eine je Fenster gewählte Controller-ID) **reserviert** werden, das ihn anfordert: Dasselbe Konto in einem anderen Fenster oder ein anderes Konto wird mit einer Meldung abgelehnt, die den Fall nennt (`other-controller`, `other-account`, `controller-id-required`); die Liste der Reservierungen kommt von `GET /api/claims`, und ein Administrator kann einen Roboter übernehmen. Die Größe eines Jogs, der Bereich eines absoluten Jogs und die höchste Betttemperatur werden von `GET /api/safety-limits` gelesen, statt in der App gehalten zu werden; ein Administrator bearbeitet sie je Modell unter **Ökosystem > Sicherheitsgrenzen**, zusammen mit der optionalen Jog-Freigabe (standardmäßig aus; wenn aktiv, schaltet eine Schaltfläche den Jog für begrenzte Zeit scharf) und der verpflichtenden Controller-ID. Jeder Roboter hat einen **Live / Sim**-Schalter (standardmäßig Live): In Sim wird von diesem Fenster nichts gesendet, was den Roboter bewegt oder etwas einschaltet, während STOP immer durchgeht. Ein Work oder Beispiel mit Punkten, die der Arm nicht erreicht, wird mit der Liste dieser Punkte abgelehnt und kann stattdessen auf die Reichweite des Modells skaliert werden. Die Liste der Reservierungen schickt der Server außerdem über den WebSocket (die Nachricht `claims`, für Verbindungen mit `remoteApiVersion=2`), sodass die Zugriffsleiste eine Änderung sofort zeigt, statt auf die nächste Abfrage zu warten; solange die Meldungen eintreffen, fragt sie nur gelegentlich ab. Schreibzugriffe sind bedingt: jeder trägt die Revision des Roboters, die dieses Fenster zuletzt gesehen hat (`If-Match`); hat inzwischen jemand anderes den Roboter geändert, antwortet der Server mit 412, der Roboter wird neu gelesen und die Meldung sagt es (Standard prüft Reservierungen, Tisch und einmalige Befehle; Streng prüft alles außer STOP; Aus prüft nichts; STOP wird nie geprüft). Der XY-Tisch fährt mit dem atomaren Befehl `table`, und Administratoren lesen das nur anfügbare Audit-Protokoll mit geprüfter SHA-256-Kette unter **Ökosystem > Audit-Protokoll**.

### Konten und Zugriff

Jeder Server legt bei seinem eigenen allerersten Start ein Konto an - Benutzername `admin`, Passwort `admin` - ändern Sie es über **Config > Users**, sobald der Server über ein vollständig vertrauenswürdiges LAN hinaus erreichbar ist. Dieselbe Registerkarte erlaubt es einem Admin-Konto, zusätzliche **operator**-Konten zu erstellen: ein Operator kann sich anmelden, den Live-Zustand beobachten, und Roboter steuern (jog/abspielen/pausieren/stoppen/Werkzeug/Ventil/Pumpe/Geschwindigkeit), kann aber keine globalen Einstellungen überschreiben oder andere Konten verwalten. Für das bloße Ansehen ist kein Konto erforderlich - das eigene "Continue read-only" des Anmeldebildschirms springt direkt zum Dashboard mit deaktivierten Schreibvorgängen. Vollständiger Vertrag (Rollen, Tokens, die `/api/users`-Routen) dokumentiert im eigenen [`docs/REMOTE_API.md` von HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md), Abschnitte 2a/2b. In Produktion stammt der erste Administrator aus den Bootstrap-Einstellungen der Installation, und der Server lehnt Beispielgeheimnisse ab (siehe [`docs/PRODUCTION_BOOTSTRAP.md` von HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/PRODUCTION_BOOTSTRAP.md)).

Jeder der 5 Remote-Clients (SUITE, Android, iOS, Watch, DSI) identifiziert sich selbst über einen `X-Hydra-Client`-Anfrage-Header, sodass **Config > Remote Access** jeden unabhängig erlauben oder blockieren kann, statt eines einzigen kombinierten Schalters für alle fünf.

### Persistenter Zustand

HYDRA-UMC STUDIO selbst ist ein reiner Client - er hält keinen eigenen Zustand über das hinaus, was für die aktuelle Sitzung im Speicher liegt. Die gesamte Persistenz (`settings.json`, `users.json`, gespeicherte Trajektorien unter `WORKS/`, eingereichte Modelle) lebt auf dem separaten **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)**-Backend, mit dem diese App über das Netzwerk kommuniziert (siehe das eigene `data/` und README dieses Projekts für das vollständige Bild) - der Zustand überlebt ein Neuladen der Seite oder ein erneutes Deployment dieser App, da keines von beiden den Backend-Prozess überhaupt berührt. `settings.json` selbst ist bewusst von der statischen Dateiauslieferung dieses Backends ausgeschlossen (es enthält Controller-IPs, CAN-OTA-Konfiguration, und den vollständigen Zustand pro Roboter), obwohl dessen `WORKS/`-Ordner normal ausgeliefert wird.

Die Anmeldung gilt so lange wie der Browser-Tab: Sitzung und Refresh-Token liegen in `sessionStorage`, das Schließen des Tabs beendet sie also. Die Anmeldeoption **Auf diesem Gerät angemeldet bleiben** speichert sie stattdessen in `localStorage`, sodass sie einen Neustart des Browsers überstehen (standardmäßig aus). Die Produktionsseite enthält eine Content-Security-Policy als Meta-Tag (Skripte nur von der Seite selbst, keine Inline-Skripte, keine Plugins); `HYDRA_STUDIO_CSP=off` beim Build lässt sie weg, für ein Deployment, das den Header selbst setzt, und jeder andere Wert wird als Richtlinie verwendet.

Derselbe `GET`-/`POST /api/settings`-Vertrag, plus ein Discovery-Endpunkt (`GET /api/hydra-info`) und ein `WebSocket /ws` für Live-Push-Updates, ist auch die Art und Weise, wie sich externe Clients mit demselben Backend verbinden - dies ist es, was es [HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) ermöglicht, eine laufende HYDRA-UMC-SERVER-Instanz im Netzwerk zu entdecken, deren Zustand zu lesen/ändern, und Änderungen, die vom eigenen Browser-Tab dieser App aus vorgenommen wurden, live widergespiegelt zu sehen (und umgekehrt). Vollständiger Vertrag im eigenen [`docs/REMOTE_API.md` von HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md).

`GET /api/system/metrics` versorgt die Fußzeile des Overview-Dashboards: CPU-Last und Speichernutzung sind immer real (das eigene `os`-Modul von Node); die Temperatur liest die reale Ausgabe von `vcgencmd measure_temp`, wenn auf einem echten Raspberry Pi ausgeführt, und fällt andernfalls auf einen klar gekennzeichneten Mock-Wert zurück (`temp_is_real` in der Antwort); der Wi-Fi-/Ethernet-/Bluetooth-Status wird von `/sys/class/net`/`/sys/class/bluetooth` gelesen (nur Linux, `null`/unbekannt auf jedem anderen Host statt eines geratenen Werts).

## 🔒 Sicherheit und Schutz

| Bedrohung | Abwehr | Wo |
|---|---|---|
| In die Seite eingeschleuste Skripte | Der Build setzt eine Content-Security-Policy in die Seite: Skripte nur von der Seite selbst (dazu WebAssembly und der Host des 3D-Decoders), keine Objekte, Base und Formulare auf die Seite beschränkt; `HYDRA_STUDIO_CSP` kann sie abschalten oder ersetzen | `scripts/csp.ts`, `vite.config.ts` |
| Ein Anmelde-Token, der aus dem Speicher ausgelesen wird | Eine hier eingegebene Anmeldung liegt in `sessionStorage` (sie übersteht ein Neuladen, nicht das Schließen des Tabs); `localStorage` nur, wenn „angemeldet bleiben“ gesetzt ist. Ein Token in der Adresse geht nur in `sessionStorage`, kommt im Fragment `#token=`, das ein Browser nie sendet, und wird aus der Adresse entfernt, sobald es gelesen ist | `src/lib/session.ts` |
| Zwei Bediener ändern denselben Roboter | Jeder Roboter hat eine Revision: Ein Schreibzugriff sendet sie mit `If-Match`, eine veraltete wird mit 412 abgelehnt; der Tisch bewegt sich atomar; Reservierungen und wer fahren darf, entscheidet der Server für alle Clients | `src/lib/revisions.ts`, `src/lib/tableMove.ts`, `src/lib/robotEdits.ts` |
| Ein Stopp, der auf eine Bestätigung oder einen langsamen Bildschirm wartet | Der rote STOPP ist global und fragt nichts: Ein `POST /api/stop-all` stoppt jeden Roboter und schaltet jedes Ventil und jede Pumpe aus; ist die Route begrenzt oder fehlt sie, fällt er auf den Stopp jedes Roboters zurück, und ein Roboter, der nicht stoppte, erscheint in einem Banner | `src/lib/stopAll.ts`, `src/components/StopAll.tsx` |
| Eine Zugriffsoption versehentlich abgesenkt (Sprache, MAVLink, Bluetooth, TLS ...) | Server Admin zeigt, woher jeder Wert kommt, und sperrt die, die die Umgebung des Servers setzt; Absenken verlangt eine Bestätigung, und nach dem Speichern bleibt eine Warnung sichtbar: eine Sprachantwort, die das Gesagte wiederholt, eine Erkennerkonfidenz von 0, unsignierte MAVLink-Nachrichten oder abgeschaltete MAVLink-Signatur | `src/components/AdminServer.tsx`, `src/lib/serverSecurity.ts` |
| Ein defektes Panel oder eine veraltete Seite nach einem Neu-Deploy, die den Bildschirm schwarz macht | Jeder Tab liegt in einer eigenen Fehlergrenze, und ein veralteter Chunk nach einem Deploy löst genau ein automatisches Neuladen aus (abgesichert, damit eine wirklich fehlende Datei keine Schleife erzeugt) | `src/main.tsx`, `src/components/ErrorBoundary.tsx` |

**Was es nie tut:** über Sicherheit entscheiden. Es hält keinen eigenen Zustand und ist kein Not-Halt-Pfad in Hardware; die Kinematik-Gehirn-Stufe und die CAN-OTA-Werkzeuge liefen nur gegen die eingebaute Simulation.

## 🔌 Schnittstellen

| Topic oder Route | Was es trägt |
|---|---|
| `/api/login`, `/api/refresh`, `/api/logout` | anmelden, den Token einmal bei Ablauf erneuern und abmelden |
| `/api/settings`, `/api/robot/:id`, `/api/robot/:id/command` | der Zustandsbaum und die typisierten Befehle (Fahren, Abspielen, Werkzeug, Ventil, Pumpe, Vision) mit `If-Match` |
| `/api/robot/:id/claim`, `/release`, `/jog-arm`, `/api/claims` | einen Roboter für dieses Konto und Fenster reservieren, freigeben, das Fahren scharf schalten, anzeigen, wer was hält |
| `/api/stop-all`, `/api/safety-limits` | der globale Stopp und die Sicherheitsgrenzen, die der Server durchsetzt |
| `/ws` | Live-Push des Zustands (Token als Subprotokoll `hydra.bearer`, `remoteApiVersion=2`) |
| `/api/camera/*`, `/api/cameras/status` | Kamerastreams, Schnappschüsse, Aufnahmen, PTZ und das kurzlebige Bildticket |
| `/api/hardware/canota/version`, `/api/hardware/canota/flash` | die CAN-OTA-Kette für Flasher und Tester (eine vollständige Simulation, bis es echte Platinen gibt) |
| `/api/admin/server-config`, `/api/admin/clients`, `/api/admin/logs`, `/api/audit` | Server Admin: die Zugriffsschalter, die verbundenen Apps, das Serverprotokoll und der Audit-Eintrag (Administratoren) |

## ⚙️ Konfiguration

Zwei Arten von Einstellungen: der Build und der Browser dieser App sowie die Zugriffsschalter des Servers, die Server Admin bearbeitet (die Umgebung des Servers gewinnt gegenüber dem Gespeicherten; der Bildschirm zeigt, was gilt, und sperrt den Rest).

| Variable | Standard | Was sie festlegt |
|---|---|---|
| `HYDRA_STUDIO_CSP` | `default` | Build-Zeit: `default`, `off` (keine Richtlinie, für einen Host, der den Header selbst setzt) oder eine vollständige eigene Richtlinie |
| `VITE_API_BASE_URL` | der Host dieser Seite auf Port 3000 | Build-Zeit: wo der Server liegt, wenn er nicht auf demselben Host ist (siehe `.env.example`) |
| `server.proxy` (`vite.config.ts`) | `localhost:3000` | nur im Entwicklungsserver: leitet `/api`, `/ws` und `/WORKS` an den Server weiter, ohne CORS-Einrichtung |
| `aiAccess` | `open` | wer das lokale KI-Relay nutzen darf: `open` ist jedes angemeldete Konto, `admin` nur Administratoren |
| `infoAuth` | aus | für die schreibgeschützten Host-Informationen (Metriken, Prozessüberwachung, Ökosystemstatus) eine Anmeldung verlangen |
| `tls.enabled` | aus (einfaches HTTP) | HTTPS und WSS mit dem angegebenen Zertifikat und Schlüssel; der Bildschirm zeigt den Fingerabdruck des verwendeten Zertifikats |
| `ble.mode` | `off` | Bluetooth LE für Telefone in der Nähe des Servers: `off`, `state` (nur Zustand veröffentlichen) oder `commands` (auch Befehle annehmen); ein unbekanntes Wort bedeutet aus |
| `ble.requireEncryption` | an | die Befehls-Characteristic wird nur über eine verschlüsselte Verbindung beschrieben und der Zustand nur so gelesen; nur `off` in der Variable schaltet das ab |
| `mqtt.mode` | `off` | die MQTT-Bridge zum Broker der Zelle: `off`, `state` oder `commands`, mit URL, Präfix und Benutzern |
| `voice.includeHeardText` | aus | eine Sprachantwort wiederholt das Gesagte; das sind personenbezogene Daten, deshalb ist es aus, und in der Variable schaltet nur genau das Wort `1` es ein |
| `voice.minConfidence` | `0.6` | die kleinste Konfidenz des Spracherkenners von 0 bis 1, um eine Anfrage zu akzeptieren, die eine Bewegung startet; 0 schaltet die Prüfung aus, ein Stopp wird nie zurückgehalten, und eine ungültige Zahl in der Variable wird ignoriert |
| `mavlink.signingKeyFile` | leer (keine Signatur) | MAVLink-2-Signatur der UAV-Bridge: der Pfad einer Datei mit dem 32-Byte-Schlüssel (32 Rohbytes oder 64 Hexzeichen); gespeichert wird nur der Pfad, nie der Schlüssel, und die Bridge liest ihn beim Start |
| `mavlink.signingAllowUnsigned` | aus | weiterhin unsignierte Nachrichten annehmen (ein Fahrzeug, das noch nicht signiert); der Bildschirm warnt, solange es an ist |

## 🚀 Schnellstart

Benötigt Node.js 22 oder neuer mit npm und einen laufenden HYDRA-UMC-SERVER (Port 3000): STUDIO ist ein reiner Client und hat ohne ihn niemanden, mit dem er sprechen kann.

```bash
npm install
./dev.sh                           # Vite dev server on port 5173, proxying /api, /ws and /WORKS to the server on port 3000 (dev.bat on Windows)
npm test                           # the Vitest suite
npm run typecheck && npm run lint  # types and lint
./build.sh                         # production build into dist/ (build.bat on Windows)
```

## 🧪 Tests

631 automatische Tests laufen mit `npm test`. Sie brauchen weder Hardware noch etwas außerhalb dieses Rechners.

Die CI führt `HYDRA_UMC_CI=1 python tools/ci_validate.py` aus; das prüft das Manifest, die Dokumente, die acht READMEs und die Bilder.

## 🏗️ Build und Veröffentlichung

### Voraussetzungen
- [Node.js](https://nodejs.org/) (v22 oder höher)
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

### Automatisierte Tests

```bash
npm test          # vitest run - 631 echte Tests über src/examples/
npm run typecheck # tsc -b --noEmit (src/) + tsc -p tsconfig.test.json --noEmit (tests/)
```

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

`bump_manifest_version.py` (Repo-Wurzel) ist der alleinige Eigentümer sowohl von `hydra-umc.project.json` als auch des `version`-Felds in `package.json` - `npm run build` (`vite build`) ist bewusst rein kompilierend, damit dadurch nie eine Divergenz zwischen beiden entstehen kann, indem nur eines von beiden erhöht wird. `scripts/bump-version.mjs` ist ein veralteter, nativer Helfer, der nur als Referenz erhalten bleibt; nichts in diesem Repo ruft ihn noch auf. Die laufende Version ist live im **About**-Dialog sichtbar (die Studio-Version stammt aus der eigenen `package.json` dieser App; die daneben gezeigte Server-Version kommt von `GET /api/hydra-info`), die vollständige Historie steht in [`CHANGELOG.md`](CHANGELOG.md).

## 🩺 Fehlerbehebung

| Du siehst | Weil | Tu |
|---|---|---|
| Die Anmeldung scheitert, oder jeder Aufruf meldet, dass der Server nicht erreichbar ist | Der Server läuft nicht, oder die Seite sucht ihn auf dem falschen Host | HYDRA-UMC-SERVER starten (Port 3000 in der Entwicklung) oder mit `VITE_API_BASE_URL` bauen |
| Ein Fahrbefehl oder Befehl wird abgelehnt, weil ein anderes Konto oder Fenster den Roboter hält | Der Server reserviert einen Roboter für das Konto und das Fenster, das zuerst fragte; das Fahren muss außerdem scharf geschaltet sein | Über die Zugriffsleiste des Roboters freigeben oder warten; ein Administrator sieht, wer ihn hält |
| Ein Speichern wird mit 412 abgelehnt | Ein anderer Client hat den Roboter geändert, nachdem Sie ihn geladen haben; Ihre Revision ist veraltet | Den Roboter neu laden und die Änderung wiederholen |
| Ein Schalter von Server Admin ist grau | Der Wert kommt aus der Umgebung des Servers, die das Gespeicherte überstimmt | Die Variable des Servers ändern und ihn neu starten; der Bildschirm nennt die Quelle jedes Werts |
| Die Seite ist nach einem Neu-Deploy des Servers leer | Der offene Tab verweist noch auf Chunks, die es nicht mehr gibt | Die Seite lädt sich einmal selbst neu; bleibt sie leer, von Hand neu laden und neu bauen, falls wirklich eine Datei fehlt |

## 📂 Struktur des Repositorys

<p align="center">
  <img src="images/repository-structure.svg" alt="Repository structure of HYDRA-UMC-STUDIO" width="100%">
</p>

<details>
<summary>Textversion des Baums</summary>

```text
HYDRA-UMC-STUDIO/
├── src/                             Quellcode
│   ├── App.tsx                      Router und Layout, der Einstiegspunkt und der Anbieter des globalen Zustands
│   ├── Dashboard.tsx                App-Shell oberster Ebene - Navigation, Overview-Panel, Systemmetriken in der Fußzeile
│   ├── store.ts                     Globaler Zustand: RobotModel/RobotState/HydraController/SystemSettings -
│   ├── motionSource.ts              Wofür die gezeichnete Pose steht (befohlen oder von der Maschine befolgt) und der reine Zustandsübergangskern von sendRobotCommand()
│   ├── i18n.ts                      react-i18next-Setup - lädt src/locales/*.json
│   ├── hooks/                       usePartColors.ts: Farbüberschreibungen pro Teil, gespeichert von HYDRA-UMC-EDITOR-STL
│   ├── assets/                      Das Symbol, der Startbildschirm und die Bilder der App sowie die globalen Stile
│   ├── assistant/                   Hydri, der Assistent: Antwortmaschine, Wissensbasis (8 Sprachen), Maskottchen, Einstellungen
│   ├── components/                  die Ansichten und Panels: Roboterdetail, 3D-Szene, Administration, CAN-OTA-Werkzeuge
│   ├── examples/                    Vorwärts- und Rückwärtskinematik der 24 echten Robotermodelle
│   ├── lib/canOta.ts                CAN-OTA-Simulations-/Protokollschicht, GitHub-Firmware-Download
│   ├── lib/apiBase.ts               Backend-URL-Auflösung - relativ+geproxyt im Dev, VITE_API_BASE_URL in Prod
│   ├── lib/mediaTicket.ts           Kurzlebige Tickets für die Kamerabilder
│   ├── lib/claims.ts                Reservierungen, Controller-ID, vom Server gelesene Sicherheitsgrenzen, Live/Sim-Modus
│   ├── lib/revisions.ts             Revision jedes Roboters (If-Match, 412), atomare Tischbewegung, Audit-Protokoll und Prüfung seiner Kette
│   ├── lib/session.ts               Sitzungs-Token, die Zugriffsoptionen des Servers, Fehlertexte für den Bediener, wer die Einstellungen speichern darf, SHA-256 ohne crypto.subtle
│   ├── lib/stopAll.ts               Der globale STOP, die Antwort auf einen Roboterbefehl, die Änderungen eines Roboters als Befehle, der gewählte Roboter, die Nummerierung der Wiedergabeschritte, die Warnung vor unerreichbaren Trajektorien, wo ein Werkzeug am Flansch sitzt, Winkel auf kürzestem Weg
│   ├── lib/claimsFeed.ts            Die Live-Liste der Reservierungen, Prüfungen vor dem Import einer Datei, Drosselung gehaltener Eingaben, Wiederholung einer gehaltenen Jog-Taste, Tastaturregeln der Dialoge, der Parser gespeicherter MJPEG-Aufnahmen, der Katalog der von den Editoren eingereichten Modelle
│   └── locales/                     en/es/de/fr/it/ja/zh/pt-Übersetzungsdateien (react-i18next)
├── docs/                            Anleitungen zu Vakuumtisch-, Heizbett-, Rack- und Maschinenmodellen
├── public/                          3D-Modelle: Roboter, Racks, Heizbetten, Vakuumtische, Maschinen (STL und OpenSCAD)
├── images/                          README-Banner
├── tests/                           Echte Vitest-Suite (610 Tests) - nur die FK/IK-Mathematik aus src/examples/, ohne React/DOM
├── tools/                           Projektwerkzeuge und CI-Prüfungen
├── scripts/                         bump-version.mjs (ausdrückliche Versionserhöhung) und csp.ts (die Content-Security-Policy der gebauten Seite)
├── .github/                         CI-Workflow und Issue-Vorlagen
├── index.html                       Die Seite, aus der Vite die App baut (die Content-Security-Policy wird beim Build eingesetzt)
├── example_trajectory.json          Eigenständige Beispiel-Trajektorie (Gelenkwinkel-Sequenz, Beispieldaten)
├── metadata.json                    App-Name/-Beschreibung (verwendet von der Hosting-Plattform)
├── bump_manifest_version.py         Synchronisiert die Version von hydra-umc.project.json mit der nativen (--sync)
├── build.sh / build.bat             Installiert Abhängigkeiten + Produktions-Build
├── build-test.sh / build-test.bat   Build-/Kompilierprüfung ohne Versionserhöhung
├── dev.sh / dev.bat                 Installiert Abhängigkeiten + startet den Vite-Dev-Server
├── vitest.config.ts                 Vitest-Konfiguration (nur tests/, echte Node-Umgebung - kein DOM noetig)
├── tsconfig.test.json               Eigenstaendiges Typpruefungsprojekt fuer tests/ (getrennt von den App-/Node-Referenzen)
├── .env.example                     VITE_API_BASE_URL-Vorlage - siehe src/lib/apiBase.ts
├── CHANGELOG.md                     was sich in jeder Version geändert hat
├── hydra-umc.project.json           Manifest: Version, Reifegrad, Familie
├── package.json                     Paketmetadaten und Skripte
└── test.sh                          führt die Tests aus
```

</details>

## 🗺️ Roadmap und bekannte Grenzen

**Bekannte Grenzen heute**

* Die CAN-OTA-Kette (Flasher und Tester) und die Kinematik-Gehirn-Stufe liefen nur gegen die eingebaute Simulation: Es gibt noch keine HYDRA-UMC-Steuerplatine zum Flashen oder Testen.
* Größen von Tisch, Heizbett und Rack sind visuelle Einstellungen, keine Roboterkalibrierung und kein elektrischer oder Fertigungsentwurf.
* Der STOPP läuft über den Server; es gibt keinen drahtlosen Not-Halt und keinen Hardware-Stopp-Pfad.
* Alles, was einen Roboter bewegt, entscheidet der Server (Rollen, Grenzen, Reservierungen); diese App kann eine Bewegung nicht von sich aus sicher machen.

**Als Nächstes:** jede Neuerung dieser App wird nach HYDRA-UMC-SUITE übernommen, und die CAN-OTA-Werkzeuge warten auf die ersten echten Platinen.

## 🌍 Sprachen

Diese README und die Dokumente des Repositorys gibt es in acht Sprachen: Englisch, Spanisch, Deutsch, Französisch, Italienisch, Japanisch, Chinesisch und Portugiesisch (Portugal). Sie entstehen gemeinsam, und die CI prüft, dass die acht Dateien dieselben Abschnitte und dieselben Links haben.

## 🔗 Verwandte Projekte

Dieses Projekt ist Teil des HYDRA-UMC-Robotik-Ökosystems desselben Autors (JuanenRac / Electro Hobby 3D). Gut zu wissen, da eine Anfrage eigentlich eines dieser Projekte betreffen könnte statt dieses Repositorys.

**Übergeordnetes Projekt**
- **[HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** — das reale Headless-Backend (REST/WebSocket), mit dem jeder Steuerungsclient tatsächlich spricht; dieses Dashboard ist ein reiner Frontend-Client davon, ohne eigenen Backend-Code.

**Geschwisterprojekte** — sprechen ebenfalls mit der eigenen API von HYDRA-UMC-SERVER, jeweils als eigener Client
- **[HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)** — Desktop-Schwarmleitstand (PySide6) für mehrere Server gleichzeitig, verpackt als eigenständige ausführbare Datei.
- **[HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL)** — native Android-Steuerungs-App mit biometrischem Login und einer gekoppelten Wear-OS-Begleit-App.
- **[HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL)** — iOS/iPadOS-Steuerungs-App (Flutter) mit Echtzeit-WebSocket-Synchronisierung.
- **[HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)** — native Touch-UI für das eingebaute 7"-DSI-Touchscreen, direkt auf dem CM5 eingebettet.
- **[HYDRA-UMC-BRIDGE-AMR](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-AMR)** — Koordinationsschranke für AGV-/AMR-Flotten über einen VDA-5050-MQTT-Publisher (nur gegen eine emulierte Flotte getestet).
- **[HYDRA-UMC-BRIDGE-CNC](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-CNC)** — High-Level-Koordinator für CNC-Zellen mit GRBL-Status-/Steuerbyte-Zugriff (nur gegen einen Emulator getestet).
- **[HYDRA-UMC-BRIDGE-DROIDS](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-DROIDS)** — Koordinationsschranke für laufende/humanoide Droiden, mit einem Boston-Dynamics-Spot-Befehlssender (nur gegen einen Emulator getestet).
- **[HYDRA-UMC-BRIDGE-LASER](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-LASER)** — Koordinator für Laserzellen, liest 3 Schlüssel-/Gehäuse-/Verriegelungs-GPIO-Signale (nur gegen einen simulierten Chip getestet; kann keinen Laser scharfschalten oder auslösen).
- **[HYDRA-UMC-BRIDGE-OPENPNP](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-OPENPNP)** — sicherer High-Level-Koordinator für den Leiterplattenfluss von OpenPnP Pick-and-Place.
- **[HYDRA-UMC-BRIDGE-PRINTER3D](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-PRINTER3D)** — sichere Koordinationsschranke für Moonraker/Klipper-3D-Drucker, mit echten gesicherten Job-Befehlen.
- **[HYDRA-UMC-BRIDGE-ROS2](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-ROS2)** — Koordinator mit einem träge importierten rclpy-ROS-2-Transport (noch nicht gegen eine ROS-2-Installation ausgeführt).
- **[HYDRA-UMC-BRIDGE-UAV](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-UAV)** — Koordinationsschranke für kameraausgestattete UAVs, mit einem MAVLink-Befehlssender (nur gegen einen Emulator getestet).

**Untergeordnete Projekte**
- **[HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF)** — grafischer Desktop-URDF-Ersteller/-Editor, der fertige Modelle über `POST /api/models/submit` in den eigenen Katalog dieses Dashboards überträgt.
- **[HYDRA-UMC-EDITOR-STL](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-STL)** — Desktop-STL-Modelleditor für die eigene `public/models/`-Bibliothek dieses Dashboards (und die von HYDRA-UMC-SUITE gepflegte Spiegelung davon) - transformiert/ersetzt/entfernt/fügt echte Teile hinzu, ohne jemals etwas dauerhaft zu löschen.

**Direkt verwandt**
- **[HYDRA-UMC-DASHBOARD-AI](https://github.com/JuanenRac/HYDRA-UMC-DASHBOARD-AI)** — Smart-Summaries- und Anomaly-Highlighting-Panels über DATALAKE/ANOMALY-DETECTOR, mit einem ehrlichen statistischen Fallback; erweitert dasselbe Dashboard um statistische Zusammenfassungen (noch kein Sprachmodell).
- **[HYDRA-UMC-COGNITIVE-NODE](https://github.com/JuanenRac/HYDRA-UMC-COGNITIVE-NODE)** — Integrationsknoten für die Hailo-10-Cognitive-Pipeline (LLM-/VLA-/Sprach-Orchestrierung); fügt diesem Dashboard Sprach-/Natural-Language-Steuerung hinzu.
- **[HYDRA-UMC-VOICE-UI](https://github.com/JuanenRac/HYDRA-UMC-VOICE-UI)** — echtes Sprach-Frontend (VAD + Intent-Parser) mit einem begrenzten, bestätigungsgesicherten Watch-Relay; fügt diesem Dashboard Sprach-/Natural-Language-Steuerung hinzu.
- **[HYDRA-UMC-LOCAL-TECHNICIAN](https://github.com/JuanenRac/HYDRA-UMC-LOCAL-TECHNICIAN)** — lokaler, richtlinien-gesteuerter KI-Wartungstechniker für das Ökosystem selbst - beobachtet, diagnostiziert und schlägt Korrekturen vor; die zwei höchsten Risikostufen sind absichtlich noch nicht implementiert.
- **[HYDRA-UMC-TWIN](https://github.com/JuanenRac/HYDRA-UMC-TWIN)** — Integrationsknoten für die Digital-Twin-Engine, mit einem echten Versionskompatibilitäts-Sync-Vertrag; ermöglicht eine Vorschau am digitalen Zwilling, bevor der echte Roboter berührt wird, direkt aus diesem Dashboard.
- **[HYDRA-UMC-HIL-BRIDGE](https://github.com/JuanenRac/HYDRA-UMC-HIL-BRIDGE)** — Hardware-in-the-Loop-Router mit einer Software-Kollisionsverriegelung zwischen Simulation und echter Hardware (ohne echte Hardware getestet); ermöglicht eine Vorschau am digitalen Zwilling, bevor der echte Roboter berührt wird, direkt aus diesem Dashboard.

**Ebenfalls Teil des Ökosystems**

*Kern-Hardware & Plattform*
- **[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)** — der Entwurf des Motherboards des Roboterarms: CM5-Host + Dual-Core-STM32H745, gedacht zur Koordination von bis zu 8 Werkzeugarmen über CAN-OTA/SPI-OTA (Firmware in einer frühen Phase; noch keine bestückte Platine).
- **[HYDRA-UMC-OS](https://github.com/JuanenRac/HYDRA-UMC-OS)** — reproduzierbare Raspberry-Pi-OS-Produktschicht für den CM5: schreibgeschützter Agent, validierte Konfiguration/Profile, WiFi-Ersteinrichtung.
- **[HYDRA-UMC-SDK](https://github.com/JuanenRac/HYDRA-UMC-SDK)** — der gemeinsame JSON-Schema-Vertrag und die Software-Auftragsschranke, gegen die jede Bridge ihre Befehle validiert (keine zertifizierte Sicherheitsfunktion).
- **[HYDRA-UMC-CONNECTOR-HUB](https://github.com/JuanenRac/HYDRA-UMC-CONNECTOR-HUB)** — deklaratives Adapter-Manifest-Register und Validator für Konnektoren externer Maschinen; erweitert die eigene Vertragsidee des SDK auf externe Maschinen, ohne die Industrie-Gateway-Projekte zu ersetzen.

*URTC-Werkzeugplattform*
- **[URTC](https://github.com/JuanenRac/URTC)** — Firmware für die physische Universal-Robot-Tool-Controller-Platine, 25+ Werkzeugprofile über CAN-Bus.
- **[URTC-FLASHER](https://github.com/JuanenRac/URTC-FLASHER)** — Desktop-GUI-Flash-Tool für URTC-Platinen, CAN-OTA plus Full-Chip-SWD/JTAG.
- **[URTC-TESTER](https://github.com/JuanenRac/URTC-TESTER)** — Desktop-Live-CAN-Bus-Diagnosetool für URTC-Platinen, ein Panel pro Werkzeugprofil.
- **[URTC-WEB-STUDIO](https://github.com/JuanenRac/URTC-WEB-STUDIO)** — browserbasierte Alternative zu URTC-TESTER über die Web-Serial-API, ohne lokale Installation.
- **[URTC-GATEWAY](https://github.com/JuanenRac/URTC-GATEWAY)** — Gateway vor dem CAN-Bus von URTC: Liste erlaubter Kennungen, Ratenbegrenzung und Sitzungsschlüssel; Software auf dem Computer getestet, noch nicht an einem echten Bus.

*Vision-KI-Knoten (Hailo-8)*
- **[HYDRA-UMC-VISION-NODE](https://github.com/JuanenRac/HYDRA-UMC-VISION-NODE)** — Integrationsknoten für die Hailo-8-Vision-Pipeline, mit einer echten stufenweisen Hardware-Bereitschaftsprüfung.
- **[HYDRA-UMC-DETECTION-HEF](https://github.com/JuanenRac/HYDRA-UMC-DETECTION-HEF)** — echte Registry für kompilierte Modelle mit Hailo-Architektur-/Prüfsummen-Safe-Load-Verifizierung.
- **[HYDRA-UMC-VISION-STREAMER](https://github.com/JuanenRac/HYDRA-UMC-VISION-STREAMER)** — echter GStreamer-Pipeline- + MediaMTX-Konfigurationsgenerator mit einer echten HailoRT-Integrationsschranke.
- **[HYDRA-UMC-VISUAL-SERVOING-API](https://github.com/JuanenRac/HYDRA-UMC-VISUAL-SERVOING-API)** — Position-Based-Visual-Servoing-Korrekturgesetz mit Freigabe abhängig vom Zonenstatus; noch keine Posenschätzung per Kamera.
- **[HYDRA-UMC-SAFETY-ZONES](https://github.com/JuanenRac/HYDRA-UMC-SAFETY-ZONES)** — v0-Logik für Zonenverletzung, Kalibrierungsaktualität und E-STOP-Anforderung, die Objektpositionen aus einer Datei nimmt; kein Detektor speist sie, und noch kein physischer E-STOP ist angeschlossen.

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
- **[HYDRA-UMC-WATCH](https://github.com/JuanenRac/HYDRA-UMC-WATCH)** — WearOS-Begleit-App mit haptischen Alarmmustern und einem Sprach-Relay zum gekoppelten Telefon (noch nicht auf einer physischen Uhr ausgeführt).
- **[URTC-SMART-RACK](https://github.com/JuanenRac/URTC-SMART-RACK)** — Firmware für ein Platinenmontagegestell mit echter Werkzeug-ID-Dekodierung und Smart-Idle-Vorheizlogik.
- **[URTC-VISION-TOOL](https://github.com/JuanenRac/URTC-VISION-TOOL)** — Firmware plus ein echter Python-Vision-Begleiter für einen Thermal-/RGB-Inspektionswerkzeugkopf.
- **[HYDRA-UMC-UPDATER](https://github.com/JuanenRac/HYDRA-UMC-UPDATER)** — administratives Desktop-Tool, das jedes Repository in diesem Ökosystem entdeckt, klont und aktualisiert.
- **[HYDRA-UMC-OS-REBUILDER](https://github.com/JuanenRac/HYDRA-UMC-OS-REBUILDER)** — Windows/Linux-Desktop-Tool, das ein flashbereites CM5-Image baut, vorgeladen mit den aktuellsten Versionen des Ökosystems, mit Ersteinrichtungs-Konfiguration für WLAN/Benutzer/SSH im Stil von Raspberry Pi Imager.
- **[HYDRA-UMC-OPS-AGENT](https://github.com/JuanenRac/HYDRA-UMC-OPS-AGENT)** — Wartungsvorfall-Koordinator: eine Edge-Rolle mit niedrigem Privileg sammelt einen bereinigten Inventar-/Gesundheits-Snapshot, eine Control-Plane-Rolle rendert ihn schreibgeschützt und bittet einen KI-Anbieter um einen Diagnosevorschlag - wendet nie einen Patch an und stellt nie etwas bereit.
- **[HYDRA-UMC-DEV-SERVER](https://github.com/JuanenRac/HYDRA-UMC-DEV-SERVER)** — reproduzierbarer Entwicklungshost (Raspberry Pi 5 / CM5), der den Quellcode des Ökosystems vorhält und begrenzte Build-/Test-Aufgaben über eine dauerhafte Warteschlange ausführt; eine dedizierte Entwicklerrolle, ausdrücklich kein operativer CM5.

Insgesamt umfasst das Ökosystem dieses Autors viele weitere Projekte über dieses hinaus - das Obige ist eine Landkarte, keine vollständige Funktionsliste; das jeweils eigene README jedes Repositories gibt Auskunft darüber, was es heute tatsächlich leistet.

## 📚 Dokumentation

Hier steht mehr:

* [Sicherheitsgrundlage des Ökosystems](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md)
* [Bedrohungsmodell des Ökosystems](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md)
* [Änderungsprotokoll dieses Repositorys](CHANGELOG.md)
* [Lizenz dieses Repositorys](LICENSE.md)

## 🤝 Mitwirken und Community

* Führe vor einem Pull Request `HYDRA_UMC_CI=1 py -3 tools/ci_validate.py` (oder `HYDRA_UMC_CI=1 python3 tools/ci_validate.py`) aus: Es muss `CI_VALIDATION=PASS` ausgeben. Führe dafür nicht `build.sh` oder `build.bat` aus; Bauen ist keine Prüfung.
* Die acht READMEs entstehen aus einer einzigen Quelle in HYDRA-UMC-DOCS; bearbeite sie nicht von Hand. Ändere die Quelle und schreibe sie mit `tools/make_readmes.py` neu.
* Behaupte in einer README nichts, was nicht gelaufen ist: Schreibe „simuliert“ oder „nicht auf Hardware erprobt“, wo das stimmt.
* Siehe [CONTRIBUTING.md](CONTRIBUTING.md), den [Verhaltenskodex](CODE_OF_CONDUCT.md), [SECURITY.md](SECURITY.md) und [SUPPORT.md](SUPPORT.md).

## 👤 AUTOR

**JuanenRac (Electro Hobby 3D)** · electrohobby3d@gmail.com

## 📜 LIZENZ

GPL-3.0-or-later - [LICENSE](LICENSE).
