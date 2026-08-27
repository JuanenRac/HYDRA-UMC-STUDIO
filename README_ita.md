<p align="center">
  <img src="images/HYDRA_UMC_BANNER.svg" alt="HYDRA-UMC-STUDIO banner" width="100%">
</p>

# 🖥️ HYDRA-UMC STUDIO

<p align="center">
  <a href="README.md">🇺🇸 English</a> |
  <a href="README_spa.md">🇪🇸 Español</a> |
  <a href="README_fra.md">🇫🇷 Français</a> |
  🇮🇹 <b>Italiano</b> |
  <a href="README_deu.md">🇩🇪 Deutsch</a> |
  <a href="README_zho.md">🇨🇳 简体中文</a> |
  <a href="README_jpn.md">🇯🇵 日本語</a>
</p>


### 🤖 Dashboard di Controllo Web per la Micro-Fabbrica Multi-Robot HYDRA-UMC

<p align="left">
  <img src="https://img.shields.io/badge/Licenza-GPL%203.0-blue.svg" alt="GPL 3.0">
  <img src="https://img.shields.io/badge/Framework-React%2019-61DAFB.svg" alt="React">
  <img src="https://img.shields.io/badge/Strumento-Vite-646CFF.svg" alt="Vite">
</p>


---

## 🎯 Panoramica

**HYDRA-UMC STUDIO** è il dashboard di controllo basato su browser per [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) - la scheda madre della micro-fabbrica multi-robot (host Raspberry Pi CM5 + coprocessore real-time STM32H745 dual-core) che orchestra fino a 8 bracci robotici distribuiti su un unico bus FDCAN. Mentre il repository di HYDRA-UMC copre l'hardware e il firmware, questo repository è il lato rivolto all'utente umano: un'applicazione React a pagina singola che visualizza ogni robot in 3D reale, esegue jog e registra il loro movimento, gestisce le macchine e gli accessori che accompagnano una cella robotica, e flasha/testa l'intera catena di firmware CAN-OTA - tutto da un'unica scheda del browser, senza bisogno di installazione nativa oltre a Node.js.

**Nota di onestà, seguendo la stessa convenzione di documentazione del resto di questo ecosistema:** l'hardware reale di HYDRA-UMC non esiste ancora come silicio testato (i suoi bootloader compilano senza errori ma non sono mai stati eseguiti su schede reali - vedi il `docs/architecture.md` di quel repository). Per questo motivo questo dashboard esegue i propri strumenti Flasher/Tester CAN-OTA contro una simulazione integrata completa che segue lo schema di indirizzamento reale e documentato di ogni livello, invece di fingere di parlare con un hardware che non esiste. La visualizzazione 3D dei robot, la cinematica, la registrazione delle traiettorie, e ogni pannello di controllo degli accessori sono completamente reali e indipendenti da questo - solo il trasporto CAN-OTA in sé è simulato per ora.

Costruito con **React 19**, **Vite**, **Three.js** (via `@react-three/fiber`/`@react-three/drei`), e **TypeScript** - un client puro senza codice di backend proprio. Lo stato persistente vive nel backend separato **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** con cui questa app comunica in rete.

---

## 🦾 Controllo 3D Multi-Robot

Gestisci più robot indipendenti a 6 gradi di libertà (6-DOF) simultaneamente, ciascuno con il proprio modello 3D reale, cinematica, e stato di jog/traiettoria. Il selettore di modello (RobotDetail → scheda Config) raggruppa ogni robot disponibile per produttore:

- 🏭 **Source Robotics** - Parol6, Faze4 (mesh con licenza MIT e GPL-3.0 rispettivamente, vedi il proprio `ATTRIBUTION.txt` di ciascun modello)
- 🏭 **Annin Robotics** - AR3, AR4 (mesh con licenza MIT)
- 🏭 **Universal Robots** - UR3e, UR5e, UR10e, UR16e, UR20 - geometria ufficiale, limiti di giunto, e cinematica dei link estratti direttamente dal repository [Universal_Robots_ROS2_Description](https://github.com/UniversalRobots/Universal_Robots_ROS2_Description) di Universal Robots (BSD-3-Clause), che copre l'intera gamma di carico utile da leggero a pesante della loro linea e-Series
- 🏭 **Universal Robots (classica)** - UR3, UR5, UR10 - la linea CB precedente alla e-Series, geometria/parametri DH ufficiali dal repository [universal_robot](https://github.com/ros-industrial/universal_robot) di ROS-Industrial (BSD-3-Clause)
- 🏭 **UFACTORY** - xArm6, Lite 6 (mesh BSD-3-Clause, geometria/cinematica ufficiale di [xarm_ros2](https://github.com/xArm-Developer/xarm_ros2))
- 🏭 **Comau** - e.DO (mesh BSD-3-Clause, geometria/cinematica ufficiale di [eDO_description](https://github.com/ianathompson/eDO_description))
- 🏭 **Kinova** - Gen3 Lite, Gen2 (mesh BSD-3-Clause, geometria/cinematica ufficiale di [ros2_kortex](https://github.com/Kinovarobotics/ros2_kortex))
- 🏭 **FANUC** - M-710iC (mesh BSD-3-Clause, geometria/cinematica ufficiale di [fanuc_m710ic_description](https://github.com/robot-descriptions/fanuc_m710ic_description))
- 🏭 **The Robot Studio** - SO-ARM100, un braccio economico a 5-DOF (non 6) (mesh Apache-2.0, geometria/cinematica ufficiale di [SO-ARM100](https://github.com/TheRobotStudio/SO-ARM100))
- 🏭 **AgileX** - PiPER (mesh Apache-2.0, geometria/cinematica ufficiale di [agilex_piper_arm_description](https://github.com/renesas-rdk/agilex_piper_arm_description))
- 🏭 **Unitree** - Z1 (mesh BSD-3-Clause, tramite [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie) di Google DeepMind - ogni cartella robot lì mantiene la propria licenza originale del produttore)
- 🏭 **Trossen Robotics** - ViperX 300, WidowX 250 (mesh BSD-3-Clause, geometria/cinematica ufficiale di [interbotix_ros_manipulators](https://github.com/Interbotix/interbotix_ros_manipulators))
- 🏭 **Koch / Low-Cost Robot Arm** - Koch v1.1, un altro braccio economico a 5-DOF (non 6) (mesh Apache-2.0, tramite [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie))
- ⚙️ **Generico** - un braccio semplificato a due link per qualsiasi configurazione senza un modello dedicato

Sono 24 modelli di robot reali distribuiti su 13 produttori, più il placeholder Generico - vedi la tabella delle licenze più in basso per la mappatura esatta modello↔produttore↔licenza che questo elenco riassume. Ogni modello reale (tutti tranne il Generico) carica la geometria mesh STL reale per ogni link e la muove attraverso la catena di trasformazione dei giunti reale propria di quel produttore - non un placeholder stilizzato. La cinematica diretta/inversa viene calcolata rispetto alla geometria reale propria di ciascun robot (risoluzione Newton-Raphson per la posizione, limiti reali per giunto dove il robot li definisce), così una traiettoria registrata o un target cartesiano in jog muove il braccio corretto nel modo in cui lo farebbe realmente il robot fisico. I 5 modelli e-Series di Universal Robots condividono inoltre un unico motore FK/IK comune (`src/examples/urKinematicsShared.ts`) e un unico renderer di rig 3D comune (`src/components/3d/URArm.tsx`), poiché ogni giunto della e-Series UR condivide esattamente la stessa struttura cinematica - solo le lunghezze numeriche dei link differiscono per modello. I 3 modelli UR classici (UR3/UR5/UR10) condividono invece un proprio motore e renderer separati (`src/examples/urClassicKinematics.ts`, `src/components/3d/UrClassicArm.tsx`), poiché quella generazione più vecchia non condivide lo stesso asse Z locale in tutti i suoi giunti come invece fa la e-Series.

I controlli di jog per robot includono una manopola rotativa + slider sia per la **velocità** che per l'**accelerazione** su ogni asse, e una lettura completa di endstop/stato accanto a una scheda di stato "Robot Controller Board" dal vivo una volta che CAN-OTA è collegato all'hardware reale. Ogni manopola/slider si aggancia al valore di **Step** del jog selezionato nel proprio combobox (da 0.1° fino a 100°/mm) invece di muoversi in modo continuo. Il robot **A1** è una proof of concept attiva per una disposizione diversa: i suoi controlli di jog Speed/Acceleration/J1-J6/XYZ vivono in un pannello flottante trascinabile sopra il viewport 3D stesso (`Joystick3D.tsx` per il pad XYZ) invece del pannello sottostante ancora usato da tutti gli altri robot - vedi `src/components/robots/A1.tsx`.

---

## 🏭 Kinematic Brain Stage

Un pannello di controllo dedicato al sottosistema di movimento locale proprio della scheda madre HYDRA-UMC - gli assi pilotati direttamente dallo STM32H745, separati dai bracci robotici distribuiti su STACK A:

- 📐 Controllo jog del **portale XY** per gli assi X, Y1, Y2 (portale Y doppio), e Z
- 🔥 Controllo del **piano riscaldato** (commutato via SSR, 230VAC)
- 🔄 **Revolver ATC** - controllo dell'indice utensile rotativo per il cambio utensile automatico pilotato da E0
- 🎢 **Nastro trasportatore** - controllo di installato/in funzione/velocità per il nastro di trasporto pilotato da E1
- 🛑 Una griglia completa di 12 endstop, 3 canali ventola, e 10 pompe/10 valvole per la fluidica di processo

---

## 🎛️ Pannelli di Controllo Accessori e Macchine

Pannelli dedicati per le macchine e gli accessori che accompagnano una cella robotica: **Tavolo XY**, **Utensili ATC**, **Gestore Rack**, **Pick & Place** (inclusa la configurazione specifica per JuanenPnP/LumenPnP), **CNC** (inclusa la configurazione specifica per JuanenCNC), **Laser** (inclusa la configurazione specifica per JuanenLaser), **Tavolo a Vuoto**, e **Piano Riscaldato**.

---

## 🔄 Lavori e Traiettorie

Carica traiettorie di esempio predefinite, esegui jog e registra i tuoi punti dal vivo, oppure carica/salva/modifica/riproduci traiettorie complesse multi-punto (JSON) per robot. Le traiettorie sono portabili tra modelli di robot - ogni punto registrato viene risolto attraverso la cinematica reale propria di quello specifico robot (`src/examples/robotKinematicsDispatch.ts`) al momento del caricamento/disegno/riproduzione, non calcolato in modo fisso rispetto al robot con cui è stato registrato, così lo stesso file di traiettoria pilota correttamente sia un Parol6 che un UR10e lungo la propria geometria raggiungibile reale.

---

## 🛠️ Strumenti Firmware CAN-OTA

Flasha e auto-testa il firmware lungo l'intera catena CAN-OTA di HYDRA-UMC + URTC da un unico dashboard, con due punti di accesso dedicati:

- **URTC → Flasher / Tester** - per la scheda URTC Tool Head e le proprie schede di espansione (corrisponde alla copertura di protocollo propria degli strumenti desktop standalone [URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)/[URTC Tester](https://github.com/JuanenRac/URTC-TESTER))
- **HYDRA-UMC → Flasher / Tester** - per i livelli Robot Controller Board e Kinematic Brain, inoltrato per tutto il percorso da CM5 → SPI → STM32H745 → FDCAN1 → Robot Controller Board → CAN → URTC Tool Head, senza bisogno di sonda JTAG/SWD né di dongle USB-CAN (vedi il `docs/architecture.md` proprio di [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC/blob/main/docs/architecture.md) per il design completo di indirizzamento/inoltro)

Entrambi possono scaricare release di firmware reali direttamente da GitHub (basato su `firmware_manifest.json`, verificato tramite CRC32) sia per il repository `URTC` che per `HYDRA-UMC`. Come indicato sopra, il trasporto stesso viene eseguito contro una simulazione integrata completa finché non esisterà firmware STM32H745 reale su hardware reale con cui comunicare.

---

## 🎮 Supporto Gamepad

Integrazione di controller USB e Bluetooth con mapping personalizzati per pulsante/per asse, per fare jog di robot e accessori senza mouse/tastiera.

---

## 📹 Integrazione Telecamere

Fino a 8 feed live simultanei (visione USB o sensori termici della famiglia MLX90640/41/42) con stato di registrazione e inferenza - la matrice di telecamere attorno a cui è costruito il sottosistema hub USB 3.0 dual proprio di HYDRA-UMC.

---

## 🌐 Interfaccia Multi-Lingua

Traduzione completa dell'interfaccia in **inglese, spagnolo, tedesco, francese e italiano** (`src/locales/`), incluso il menu Aiuto interno all'app, la finestra Informazioni (versione/autore/licenza), e ogni scheda della finestra di Configurazione di Sistema. La copertura non è ancora al 100% di ogni schermata - una manciata di pannelli accessori standalone resta codificata in inglese, non ancora raggiunta dal lavoro di traduzione.

---

## ℹ️ Informazioni e Configurazione di Sistema

Due finestre di dialogo indipendenti, entrambe raggiungibili dall'intestazione (pulsanti `Config`/`About`): **About** mostra la versione dell'app in esecuzione (letta dal vivo da `GET /api/hydra-info`), l'autore, e la licenza; **Config** copre l'identità del server, la gestione di controller/nodi, il tema UI + lingua, la ridenominazione dei robot, la mappatura telecamera↔robot con rilevamento conflitti, la libreria di URDF personalizzati, le integrazioni software di terze parti (backend OpenPnP/CNC/Laser), l'accesso remoto per client (interruttori indipendenti per SUITE/Android/iOS), gli account utente, le directory di lavoro per robot, il trasporto CAN-OTA, e la mappatura del gamepad - ciascuno nella propria scheda. Entrambi sono componenti a sé stanti (`src/components/About.tsx`, `src/components/Config.tsx`), non incorporati direttamente nella shell principale del dashboard.

## 🔐 Account e Accesso

Ogni server crea un account al proprio primo avvio in assoluto - utente `admin`, password `admin` - cambiala da **Config > Users** non appena il server è raggiungibile oltre una LAN completamente fidata. La stessa scheda permette a un account admin di creare account **operator** aggiuntivi: un operator può accedere, osservare lo stato in tempo reale, e pilotare i robot (jog/riproduci/pausa/stop/utensile/valvola/pompa/velocità), ma non può sovrascrivere le impostazioni globali né gestire altri account. Non è richiesto alcun account solo per guardare - il pulsante "Continue read-only" della schermata di login salta direttamente al dashboard con le scritture disabilitate. Contratto completo (ruoli, token, le rotte `/api/users`) documentato nel proprio [`docs/REMOTE_API.md` di HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md), sezioni 2a/2b.

Ciascuno dei 3 client remoti (SUITE, Android, iOS) si auto-identifica tramite un header di richiesta `X-Hydra-Client`, così **Config > Remote Access** può consentire o bloccare ciascuno in modo indipendente invece di un unico interruttore combinato per tutti e tre.

---

## 💾 Stato Persistente

HYDRA-UMC STUDIO in sé è un client puro - non mantiene alcuno stato proprio oltre a ciò che è in memoria per la sessione corrente. Tutta la persistenza (`settings.json`, `users.json`, traiettorie salvate sotto `WORKS/`, modelli inviati) vive nel backend separato **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** con cui questa app comunica in rete (vedi il proprio `data/` e README di quel progetto per il quadro completo) - lo stato sopravvive a un ricaricamento della pagina o a un nuovo deployment di questa app, poiché nessuno dei due tocca il processo del backend in alcun modo. `settings.json` stesso è deliberatamente escluso dal servizio di file statici di quel backend (contiene IP dei controller, configurazione CAN-OTA, e lo stato completo per robot), sebbene la sua cartella `WORKS/` venga servita normalmente.

Lo stesso contratto `GET`/`POST /api/settings`, più un endpoint di discovery (`GET /api/hydra-info`) e un `WebSocket /ws` per aggiornamenti push dal vivo, è anche il modo in cui i client esterni si collegano a quello stesso backend - questo è ciò che permette a [HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) di scoprire un'istanza di HYDRA-UMC SERVER attiva sulla rete, leggere/modificare il suo stato, e vedere i cambiamenti fatti dalla scheda del browser propria di questa app riflessi dal vivo (e viceversa). Contratto completo nel proprio [`docs/REMOTE_API.md` di HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md).

`GET /api/system/metrics` alimenta il footer del dashboard Overview: il carico CPU e l'uso di memoria sono sempre reali (il modulo `os` proprio di Node); la temperatura legge l'output reale di `vcgencmd measure_temp` quando in esecuzione su una vera Raspberry Pi e ricade su un valore simulato chiaramente contrassegnato altrimenti (`temp_is_real` nella risposta); lo stato di Wi-Fi/Ethernet/Bluetooth viene letto da `/sys/class/net`/`/sys/class/bluetooth` (solo Linux, `null`/sconosciuto su qualsiasi altro host invece di un valore indovinato).

---

## 📂 Struttura del Repository

```text
HYDRA-UMC-STUDIO/
├── src/
│   ├── Dashboard.tsx            # Shell principale dell'app - navigazione, pannello Overview, metriche di sistema nel footer
│   ├── store.tsx                # Stato globale: RobotModel/RobotState/HydraController/SystemSettings -
│   │                             # comunica con il backend separato HYDRA-UMC-SERVER via REST + WebSocket
│   ├── i18n.ts                  # Configurazione react-i18next - carica src/locales/*.json
│   ├── components/
│   │   ├── About.tsx, Config.tsx  # Finestre di Configurazione di Sistema e Informazioni - componenti a sé stanti
│   │   │                       # che leggono lo stesso store globale, non incorporati direttamente nella shell del dashboard
│   │   ├── AuthGate.tsx, UsersPanel.tsx  # Schermata di login e il gestore account admin/operator di Config > Users
│   │   ├── RobotDetail.tsx      # Implementazione condivisa di jog/traiettoria/config per robot (il selettore
│   │   │                       # di modello vive qui) - ogni punto di ingresso robots/A*.tsx sottostante esegue il render di questo
│   │   ├── robots/A1.tsx .. A8.tsx  # Punti di ingresso per robot - ri-esportazioni sottili di RobotDetail.tsx, il
│   │   │                       # luogo dove far crescere qualsiasi comportamento futuro specifico del robot senza toccare gli
│   │   │                       # altri 7. A1 è già l'unica eccezione: la stessa branch `isFloatingLayout` di
│   │   │                       # RobotDetail.tsx (robot.id === 1) sposta il jog di Speed/Acceleration/
│   │   │                       # J1-J6/XYZ in un overlay trascinabile sul viewport 3D invece del
│   │   │                       # pannello sottostante.
│   │   ├── Joystick3D.tsx       # D-pad di jog XYZ usato da quell'overlay flottante
│   │   ├── VirtualKinematics.tsx  # L'host della scena <Canvas> di React Three Fiber
│   │   ├── KinematicBrainStage.tsx  # Pannello portale XY / piano riscaldato / revolver ATC / nastro trasportatore
│   │   ├── Flasher.tsx, Tester.tsx  # Strumenti CAN-OTA (livelli URTC e HYDRA-UMC)
│   │   ├── ATCToolsConfig.tsx, RackConfigView.tsx, PickAndPlace.tsx, CNC.tsx, Laser.tsx,
│   │   │   VacuumTableConfig.tsx, HeatedBedConfig.tsx, XYTableConfig.tsx
│   │   │                       # Pannelli di controllo accessori/macchine
│   │   ├── JuanenPnPConfig.tsx, LumenPnPConfig.tsx, JuanenCNCConfig.tsx, JuanenLaserConfig.tsx
│   │   │                       # Varianti di configurazione specifiche per macchina - non ancora collegate a nessun
│   │   │                       # percorso di navigazione (codice morto)
│   │   ├── CamerasView.tsx, GamepadConfig.tsx, GamepadController.tsx, HelpModal.tsx
│   │   ├── FuturisticSlider.tsx, RotaryKnob.tsx  # Widget di controllo jog condivisi
│   │   └── 3d/
│   │       ├── RobotArm.tsx     # Instrada al rig corretto per modello in base a robot.model
│   │       ├── Parol6Arm.tsx, Faze4Arm.tsx, AR3Arm.tsx, AR4Arm.tsx, EdoArm.tsx, Gen2Arm.tsx,
│   │       │   Gen3LiteArm.tsx, Lite6Arm.tsx, M710icArm.tsx, PiperArm.tsx, SoArm100Arm.tsx,
│   │       │   Vx300sArm.tsx, Wx250sArm.tsx, XArm6Arm.tsx, Z1Arm.tsx, KochArm.tsx,
│   │       │   LumenPnPRig.tsx, GenericRobotArm.tsx
│   │       │                   # Rig specifici per produttore, ciascuno trascritto a mano dal proprio URDF reale
│   │       ├── URArm.tsx, UrClassicArm.tsx  # Rig parametrizzati condivisi per le linee e-Series/Classic di Universal Robots
│   │       ├── UR3eArm.tsx, UR5eArm.tsx, UR10eArm.tsx, UR16eArm.tsx, UR20Arm.tsx,
│   │       │   Ur3ClassicArm.tsx, Ur5ClassicArm.tsx, Ur10ClassicArm.tsx
│   │       │                   # Wrapper sottili per modello attorno a URArm.tsx / UrClassicArm.tsx
│   │       ├── Shared3DEnvironment.tsx, SharedModule3DView.tsx, PathVisualizer.tsx,
│   │       │   Toolhead.tsx, DraggableGizmo.tsx, ATC3DView.tsx, Rack3DView.tsx
│   │       │                   # Ambiente della scena, disegno traiettorie, rendering utensile/gizmo
│   ├── examples/
│   │   ├── kinematics.ts, utils.ts, robotKinematicsDispatch.ts
│   │   │                       # Cinematica generica condivisa a 2 link + dispatch per modello
│   │   ├── parol6Kinematics.ts, faze4Kinematics.ts, ar3Kinematics.ts, ar4Kinematics.ts,
│   │   │   edoKinematics.ts, gen2Kinematics.ts, gen3LiteKinematics.ts, kochKinematics.ts,
│   │   │   lite6Kinematics.ts, m710icKinematics.ts, piperKinematics.ts, soArm100Kinematics.ts,
│   │   │   xarm6Kinematics.ts, z1Kinematics.ts
│   │   │                       # FK/IK reale specifica per produttore
│   │   ├── urKinematicsShared.ts, urClassicKinematics.ts  # Motore FK/IK condiviso per le linee e-Series/Classic di UR
│   │   ├── ur3eKinematics.ts, ur5eKinematics.ts, ur10eKinematics.ts, ur16eKinematics.ts, ur20Kinematics.ts,
│   │   │   ur3ClassicKinematics.ts, ur5ClassicKinematics.ts, ur10ClassicKinematics.ts
│   │   │                       # Dati sottili per modello di catena UR/limiti/pose di riposo
│   │   └── list/                # 26 traiettorie di esempio predefinite (cerchi, spirali, pattern tavolo XY, pick-and-place, ...)
│   ├── lib/canOta.ts            # Livello di simulazione/protocollo CAN-OTA, download firmware da GitHub
│   ├── lib/apiBase.ts           # Risoluzione dell'URL del backend - relativa+proxata in dev, VITE_API_BASE_URL in prod
│   └── locales/                 # File di traduzione en/es/de/fr/it (react-i18next)
├── public/models/                # Asset mesh 3D reali - una cartella per robot (24 in totale),
│                                  # ciascuna con il proprio ATTRIBUTION.txt - vedi la tabella delle licenze più sotto
├── images/                       # Banner del README
├── .env.example                  # Template di VITE_API_BASE_URL - vedi src/lib/apiBase.ts
├── README.md                     # questo file (in inglese)
└── README_spa.md / README_ita.md / README_fra.md / README_deu.md / README_zho.md / README_jpn.md  # traduzioni
```

Il backend con cui comunica questa app (persistenza dei settings, l'API REST/WebSocket, `docs/REMOTE_API.md`) vive nel repository separato **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)**, non in questo - vedi il proprio README di quel progetto per la sua struttura e come eseguirlo.

---

## 🛠️ Ambiente di Sviluppo

### Requisiti
- [Node.js](https://nodejs.org/) (v18 o superiore consigliato)
- npm
- Un backend **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** in esecuzione (`npm run dev` anche lì, porta `3000` di default) - questa app è un client puro e non ha nulla con cui comunicare senza di esso.

### Installazione

```bash
npm install
```

### Modalità Sviluppo

Esegue il proprio dev server di Vite (`vite` semplice, porta `5173`) con ricaricamento live. Il proprio `server.proxy` di `vite.config.ts` inoltra in modo trasparente `/api`, `/ws`, e `/WORKS` a `http://localhost:3000`, così le chiamate fetch/WebSocket a percorso relativo dell'app raggiungono il backend HYDRA-UMC SERVER senza bisogno di configurazione CORS - basta assicurarsi che quel backend sia in esecuzione per primo:
- **Windows:** doppio clic su `dev.bat` oppure esegui `npm run dev`
- **Linux/Mac:** esegui `./dev.sh` oppure `npm run dev`

### Build di Produzione

Compila in una build statica ottimizzata (`vite build` semplice - nessun bundling del server, questa app non ha più codice di backend):
- **Windows:** doppio clic su `build.bat` oppure esegui `npm run build`
- **Linux/Mac:** esegui `./build.sh` oppure `npm run build`

Visualizza in anteprima la build di produzione localmente con:
```bash
npm run preview
```

Distribuisci la cartella `dist/` risultante su qualsiasi host statico. Per default l'app compilata cerca il proprio backend sullo stesso hostname di questa pagina sulla porta `3000` (corrisponde al comune deployment "tutto sulla CM5"); imposta `VITE_API_BASE_URL` in fase di build (vedi `.env.example`) per puntarla a un'istanza di HYDRA-UMC SERVER ospitata altrove. Tutto lo stato e i dati reali persistono nella propria directory `data/` di quel backend, non in questo repository.

### Versionamento

Ogni vera `npm run build` incrementa automaticamente il campo `version` di `package.json` (`scripts/bump-version.mjs`, agganciato come primo passo dello script `build`) - un "contachilometri" in base 10: patch +1 per build, con riporto su minor (e da minor a major) oltre il 9, invece di raggiungere mai un segmento a due cifre (`0.0.9` -> `0.1.0`, non `0.0.10`). La versione in esecuzione è visibile dal vivo nella finestra **About**, e la cronologia completa è in [`CHANGELOG.md`](CHANGELOG.md).

---

## 🔗 Progetti Correlati

Questo progetto fa parte di un ecosistema robotico più ampio dello stesso autore (JuanenRac / Electro Hobby 3D). Vale la pena conoscerlo, poiché una richiesta potrebbe in realtà riguardare uno di questi invece che questo repository:

**Piattaforma HYDRA-UMC** — la cella di micro-fabbrica multi-robot
- **[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)** — la scheda madre stessa: host Raspberry Pi CM5 + coprocessore real-time STM32H745 dual-core, che orchestra fino a 8 bracci robotici distribuiti su CAN-OTA/SPI-OTA. Hardware + firmware propri, GPL-3.0/CERN-OHL-S v2/CC BY-SA 4.0.
- **HYDRA-UMC STUDIO** *(questo repository)* — dashboard di controllo web per HYDRA-UMC: visualizzazione 3D multi-robot, cinematica/registrazione traiettorie, flashing e testing CAN-OTA per l'intera piattaforma. Client puro Vite/React - React + Vite + Three.js, nessun codice di backend proprio.
- **[HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** — backend API Express/WebSocket headless per l'intera piattaforma: stato robot/controller, autenticazione, discovery mDNS, invii di modelli. Viene eseguito indipendentemente da questa app - vedi il proprio README di quel progetto per il motivo per cui è un processo separato.
- **[HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL)** — app di controllo Android per HYDRA-UMC via Wi-Fi/Bluetooth. App reale e funzionante - set completo di funzionalità di controllo remoto, autenticazione JWT, storage credenziali cifrato.
- **[HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL)** — app di controllo iOS/iPadOS per HYDRA-UMC via Wi-Fi, costruita in Flutter (cross-platform, verificabile su Windows senza un Mac; il packaging finale del `.ipa` richiede comunque Xcode). App reale e funzionante - stesso set di funzionalità dell'app Android.
- **[HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)** — centro di comando swarm desktop (Python/PySide6): discovery di rete multi-controller, sincronizzazione bidirezionale live, viewport 3D robot reale, workspace agganciabile in stile Photoshop. Reale e funzionante, non un placeholder.
- **[HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF)** — creatore/editor grafico di URDF desktop (Python/PySide6) per il catalogo di modelli proprio di questo progetto: estrae i file sorgente da GitHub o da una cartella locale, valida la fattibilità dei DOF, modifica colore/scala/cinematica con anteprima 3D live, e invia il risultato finale a un server STUDIO attivo (vedi il `POST /api/models/submit` proprio di questo progetto e Config > Models). Reale e funzionante, non un placeholder.
- **[HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)** — UI touch nativa in Flutter per il touchscreen DSI da 5"/7" proprio di HYDRA-UMC (1280×720, stessa risoluzione in entrambe le dimensioni) sul Compute Module 5, che controlla questo stesso server direttamente dalla scheda. Scaffold reale e funzionante con tutte le 6 schermate del catalogo (dashboard, controllo manuale, camera, vista 3D semplificata, metriche di sistema, login) collegate al server live; la build reale del target Linux non è ancora stata eseguita su hardware reale (ambiente di lavoro finora solo Windows - vedere il README di quel progetto).

**Piattaforma URTC** — il controller del tool head che ogni braccio robotico HYDRA-UMC porta con sé
- **[URTC](https://github.com/JuanenRac/URTC)** — Universal Robot Tool Controller: controller del tool head su bus CAN basato su STM32F303, 25 profili utensile completamente implementati, aggiornamento firmware CAN-OTA.
- **[URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)** — strumento desktop di flashing CAN-OTA + chip completo via SWD/JTAG per schede URTC (Windows/Linux).
- **[URTC Tester](https://github.com/JuanenRac/URTC-TESTER)** — strumento desktop di diagnostica live su bus CAN per schede URTC, un pannello per profilo utensile (Windows/Linux).
- **[URTC Web Studio](https://github.com/JuanenRac/URTC-WEB-STUDIO)** — alternativa basata su browser ai 2 strumenti desktop sopra (Web Serial API + SLCAN), nessuna installazione locale necessaria.

**Direttamente correlati a questa dashboard** — progetti che si collegano direttamente a HYDRA-UMC STUDIO:
- **[HYDRA-UMC-DASHBOARD-AI](https://github.com/JuanenRac/HYDRA-UMC-DASHBOARD-AI)** — estende questa stessa dashboard con insight basati sull'IA.
- **[HYDRA-UMC-COGNITIVE-NODE](https://github.com/JuanenRac/HYDRA-UMC-COGNITIVE-NODE)** — abilita il controllo vocale/in linguaggio naturale su questa dashboard.
- **[HYDRA-UMC-VOICE-UI](https://github.com/JuanenRac/HYDRA-UMC-VOICE-UI)** — abilita il controllo vocale/in linguaggio naturale su questa dashboard.
- **[HYDRA-UMC-TWIN](https://github.com/JuanenRac/HYDRA-UMC-TWIN)** — permette di visualizzare in anteprima sul gemello digitale prima di toccare il robot reale, direttamente da questa dashboard.
- **[HYDRA-UMC-HIL-BRIDGE](https://github.com/JuanenRac/HYDRA-UMC-HIL-BRIDGE)** — permette di visualizzare in anteprima sul gemello digitale prima di toccare il robot reale, direttamente da questa dashboard.

Oltre a questi, lo stesso autore mantiene molti altri progetti in questo ecosistema, raggruppati qui per categoria:

- **💠 Nucleo dell'Ecosistema:** [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) · [HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER) · [HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) · [HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI) · [HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL) · [HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL) · [HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF) · [URTC](https://github.com/JuanenRac/URTC) · [URTC-FLASHER](https://github.com/JuanenRac/URTC-FLASHER) · [URTC-TESTER](https://github.com/JuanenRac/URTC-TESTER) · [URTC-WEB-STUDIO](https://github.com/JuanenRac/URTC-WEB-STUDIO)
- **👁️ Nodo di Visione IA (Hailo-8):** [HYDRA-UMC-VISION-NODE](https://github.com/JuanenRac/HYDRA-UMC-VISION-NODE) · [HYDRA-UMC-VISION-STREAMER](https://github.com/JuanenRac/HYDRA-UMC-VISION-STREAMER) · [HYDRA-UMC-DETECTION-HEF](https://github.com/JuanenRac/HYDRA-UMC-DETECTION-HEF) · [HYDRA-UMC-SAFETY-ZONES](https://github.com/JuanenRac/HYDRA-UMC-SAFETY-ZONES) · [HYDRA-UMC-VISUAL-SERVOING-API](https://github.com/JuanenRac/HYDRA-UMC-VISUAL-SERVOING-API)
- **🧠 Nodo Cognitivo IA (Hailo-10):** [HYDRA-UMC-VLA-ENGINE](https://github.com/JuanenRac/HYDRA-UMC-VLA-ENGINE) · [HYDRA-UMC-SEMANTIC-PLANNER](https://github.com/JuanenRac/HYDRA-UMC-SEMANTIC-PLANNER) · [HYDRA-UMC-DOCS-QA](https://github.com/JuanenRac/HYDRA-UMC-DOCS-QA)
- **🐝 Orchestrazione e Sciame:** [HYDRA-UMC-ORCHESTRATOR](https://github.com/JuanenRac/HYDRA-UMC-ORCHESTRATOR) · [HYDRA-UMC-SWARM-SYNC](https://github.com/JuanenRac/HYDRA-UMC-SWARM-SYNC) · [HYDRA-UMC-PATH-PLANNER-3D](https://github.com/JuanenRac/HYDRA-UMC-PATH-PLANNER-3D) · [HYDRA-UMC-JOB-DISPATCHER](https://github.com/JuanenRac/HYDRA-UMC-JOB-DISPATCHER) · [HYDRA-UMC-NODE-HEALING](https://github.com/JuanenRac/HYDRA-UMC-NODE-HEALING)
- **🎮 Gemello Digitale e Simulazione:** [HYDRA-UMC-PHYSICS-REPLICA](https://github.com/JuanenRac/HYDRA-UMC-PHYSICS-REPLICA) · [HYDRA-UMC-SYNTHETIC-DATA-GEN](https://github.com/JuanenRac/HYDRA-UMC-SYNTHETIC-DATA-GEN)
- **📊 Dati e Analytics:** [HYDRA-UMC-DATALAKE](https://github.com/JuanenRac/HYDRA-UMC-DATALAKE) · [HYDRA-UMC-TELEMETRY-COLLECTOR](https://github.com/JuanenRac/HYDRA-UMC-TELEMETRY-COLLECTOR) · [HYDRA-UMC-ANOMALY-DETECTOR](https://github.com/JuanenRac/HYDRA-UMC-ANOMALY-DETECTOR) · [HYDRA-UMC-PRODUCTION-REPORTS](https://github.com/JuanenRac/HYDRA-UMC-PRODUCTION-REPORTS)
- **🏭 Gateway Industriale:** [HYDRA-UMC-GATEWAY-INDUSTRIAL](https://github.com/JuanenRac/HYDRA-UMC-GATEWAY-INDUSTRIAL) · [HYDRA-UMC-OPCUA-SERVER](https://github.com/JuanenRac/HYDRA-UMC-OPCUA-SERVER) · [HYDRA-UMC-MQTT-BROKER](https://github.com/JuanenRac/HYDRA-UMC-MQTT-BROKER) · [HYDRA-UMC-MTCONNECT-ADAPTER](https://github.com/JuanenRac/HYDRA-UMC-MTCONNECT-ADAPTER)
- **🛠️ Strumenti Complementari:** [URTC-SMART-RACK](https://github.com/JuanenRac/URTC-SMART-RACK) · [URTC-VISION-TOOL](https://github.com/JuanenRac/URTC-VISION-TOOL) · [HYDRA-UMC-WATCH](https://github.com/JuanenRac/HYDRA-UMC-WATCH) · [HYDRA-UMC-TOOL-CLI](https://github.com/JuanenRac/HYDRA-UMC-TOOL-CLI)

Nel complesso, l'ecosistema di questo autore comprende molti progetti oltre a questo - quanto sopra è una mappa, non un elenco esaustivo di funzionalità; consulta il README proprio di ciascun repository per sapere cosa fa realmente oggi.

---

## 👤 Autore

**JuanenRac** (Electro Hobby 3D)
📧 electrohobby3d@gmail.com
📺 youtube.com/@electrohobby3d

---

## 📜 Licenza e Note sul Copyright

HYDRA-UMC STUDIO è (c) 2026 JuanenRac (Electro Hobby 3D). Questo avviso deve essere incluso in qualsiasi distribuzione di questo progetto o lavori derivati.

Il codice sorgente di questa applicazione è disponibile sotto la **GNU General Public License v3.0 (GPL-3.0)**. Testo completo su https://www.gnu.org/licenses/gpl-3.0.html.

La documentazione (questo README e le proprie traduzioni - `README_spa.md`, `README_ita.md`, `README_fra.md`, `README_deu.md`, `README_zho.md`, `README_jpn.md`) è disponibile sotto **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**. Testo completo su https://creativecommons.org/licenses/by-sa/4.0/.

**Asset mesh di robot di terze parti:** la geometria 3D reale sotto `public/models/` NON è coperta dalla GPL-3.0 di cui sopra - i file mesh di ciascun modello di robot sono asset di terze parti con licenza separata, ridistribuiti qui secondo i propri termini originali:

| Produttore | Modelli | Licenza |
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
| Opulo | LumenPnP v4 (usato anche per JuanenPnP) | CERN-OHL-W v2 |

Il riferimento esatto al repository sorgente, al percorso, e al testo di licenza di ciascun modello vive nel proprio `public/models/<slug>/ATTRIBUTION.txt` di quel modello - consulta quel file prima di ridistribuire uno specifico set di mesh, invece di assumere che la tabella sopra lo sostituisca. Vale la pena leggere per intero il proprio `ATTRIBUTION.txt` di LumenPnP - a differenza di ogni braccio robotico sopra (file STL prefabbricati propri del produttore, scaricati verbatim), quei 5 file mesh sono stati generati internamente a partire dalla sorgente FreeCAD reale di Opulo, non ridistribuiti così come sono.

Questo dashboard è il pannello di controllo web per il progetto scheda madre [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) - vedi quel repository per il licenziamento proprio del suo hardware (CERN-OHL-S v2) e firmware (GPL-3.0), a cui la licenza propria di questo repository non si estende, e viceversa. Implementa inoltre strumenti CAN-OTA contro il protocollo [URTC](https://github.com/JuanenRac/URTC) - vedi il repository proprio di quel progetto per la sua licenza separata.

Se costruisci sopra questo progetto, tieni presente la separazione delle licenze: le modifiche al codice dovrebbero rimanere GPL-3.0, i derivati della documentazione dovrebbero rimanere CC BY-SA, e qualsiasi ridistribuzione degli asset mesh di uno specifico robot dovrebbe rimanere sotto la licenza originale propria di quel modello - ciascuno con attribuzione a questo progetto e al suo autore.

## Progetti correlati

> Canonical public ecosystem relationship map.

**Direct integrations:**
[HYDRA-UMC-OS](https://github.com/JuanenRac/HYDRA-UMC-OS) · [HYDRA-UMC-SDK](https://github.com/JuanenRac/HYDRA-UMC-SDK) · [HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER) · [URTC](https://github.com/JuanenRac/URTC) · [HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) · [HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)

**Platform and contracts:**
[HYDRA-UMC-OS](https://github.com/JuanenRac/HYDRA-UMC-OS) · [HYDRA-UMC-SDK](https://github.com/JuanenRac/HYDRA-UMC-SDK)

**Rest of the ecosystem:**
All remaining public repositories are grouped by the seven ecosystem layers in the [JuanenRac ecosystem dashboard](https://juanenrac.github.io/JuanenRac/).
