<p align="center">
  <img src="images/HYDRA_UMC_BANNER.svg" alt="HYDRA-UMC-STUDIO banner" width="100%">
</p>

# 🖥️ HYDRA-UMC STUDIO

<p align="center">
  <a href="README.md">🇺🇸 English</a> |
  <a href="README_spa.md">🇪🇸 Español</a> |
  🇫🇷 <b>Français</b> |
  <a href="README_ita.md">🇮🇹 Italiano</a> |
  <a href="README_deu.md">🇩🇪 Deutsch</a> |
  <a href="README_zho.md">🇨🇳 简体中文</a> |
  <a href="README_jpn.md">🇯🇵 日本語</a>
</p>


### 🤖 Tableau de Bord de Contrôle Web pour la Micro-Usine Multi-Robots HYDRA-UMC

<p align="left">
  <img src="https://img.shields.io/badge/Licence-GPL%203.0-blue.svg" alt="GPL 3.0">
  <img src="https://img.shields.io/badge/Framework-React%2019-61DAFB.svg" alt="React">
  <img src="https://img.shields.io/badge/Outil-Vite-646CFF.svg" alt="Vite">
</p>


---

## 🎯 Vue d'Ensemble

**HYDRA-UMC STUDIO** est le tableau de bord de contrôle basé sur navigateur pour [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) - la carte mère de la micro-usine multi-robots (hôte Raspberry Pi CM5 + coprocesseur temps réel STM32H745 double cœur) qui orchestre jusqu'à 8 bras robotiques distribués sur un unique bus FDCAN. Là où le propre dépôt de HYDRA-UMC couvre le matériel et le firmware, ce dépôt est le côté orienté vers l'humain : une application React monopage qui visualise chaque robot en 3D réelle, effectue le jog et enregistre leur mouvement, gère les machines et accessoires qui accompagnent une cellule robotique, et flashe/teste toute la chaîne de firmware CAN-OTA - le tout depuis un seul onglet de navigateur, sans installation native nécessaire au-delà de Node.js.

**Note d'honnêteté, suivant la même convention de documentation que le reste de cet écosystème :** le matériel réel propre de HYDRA-UMC n'existe pas encore sous forme de silicium testé (ses bootloaders compilent proprement mais n'ont jamais tourné sur des cartes réelles - voir le propre `docs/architecture.md` de ce dépôt). Ce tableau de bord exécute donc ses outils Flasher/Tester CAN-OTA contre une simulation intégrée complète qui suit le schéma d'adressage réel et documenté de chaque niveau, plutôt que de prétendre parler à un matériel qui n'existe pas. La visualisation 3D des robots, la cinématique, l'enregistrement de trajectoires, et chaque panneau de contrôle d'accessoire sont entièrement réels et indépendants de cela - seul le transport CAN-OTA lui-même est simulé pour l'instant.

Construit avec **React 19**, **Vite**, **Three.js** (via `@react-three/fiber`/`@react-three/drei`), et **TypeScript** - un client pur sans code backend propre. L'état persistant vit sur le backend séparé **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** avec lequel cette application communique sur le réseau.

---

## 🦾 Contrôle 3D Multi-Robots

Gérez plusieurs robots indépendants à 6 degrés de liberté (6-DOF) simultanément, chacun avec son propre modèle 3D réel, sa cinématique, et son état de jog/trajectoire. Le sélecteur de modèle (RobotDetail → onglet Config) regroupe chaque robot disponible par fabricant :

- 🏭 **Source Robotics** - Parol6, Faze4 (maillages sous licence MIT et GPL-3.0 respectivement, voir le propre `ATTRIBUTION.txt` de chaque modèle)
- 🏭 **Annin Robotics** - AR3, AR4 (maillages sous licence MIT)
- 🏭 **Universal Robots** - UR3e, UR5e, UR10e, UR16e, UR20 - géométrie officielle, limites d'articulation, et cinématique des liaisons extraites directement du propre dépôt [Universal_Robots_ROS2_Description](https://github.com/UniversalRobots/Universal_Robots_ROS2_Description) d'Universal Robots (BSD-3-Clause), couvrant toute la plage de charge utile, de légère à lourde, de leur gamme e-Series
- 🏭 **Universal Robots (classique)** - UR3, UR5, UR10 - la gamme CB antérieure à la e-Series, géométrie/paramètres DH officiels du propre dépôt [universal_robot](https://github.com/ros-industrial/universal_robot) de ROS-Industrial (BSD-3-Clause)
- 🏭 **UFACTORY** - xArm6, Lite 6 (maillages BSD-3-Clause, géométrie/cinématique officielle de [xarm_ros2](https://github.com/xArm-Developer/xarm_ros2))
- 🏭 **Comau** - e.DO (maillages BSD-3-Clause, géométrie/cinématique officielle de [eDO_description](https://github.com/ianathompson/eDO_description))
- 🏭 **Kinova** - Gen3 Lite, Gen2 (maillages BSD-3-Clause, géométrie/cinématique officielle de [ros2_kortex](https://github.com/Kinovarobotics/ros2_kortex))
- 🏭 **FANUC** - M-710iC (maillages BSD-3-Clause, géométrie/cinématique officielle de [fanuc_m710ic_description](https://github.com/robot-descriptions/fanuc_m710ic_description))
- 🏭 **The Robot Studio** - SO-ARM100, un bras économique à 5-DOF (et non 6) (maillages Apache-2.0, géométrie/cinématique officielle de [SO-ARM100](https://github.com/TheRobotStudio/SO-ARM100))
- 🏭 **AgileX** - PiPER (maillages Apache-2.0, géométrie/cinématique officielle de [agilex_piper_arm_description](https://github.com/renesas-rdk/agilex_piper_arm_description))
- 🏭 **Unitree** - Z1 (maillages BSD-3-Clause, via [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie) de Google DeepMind - chaque dossier de robot y conserve sa propre licence originale du fabricant)
- 🏭 **Trossen Robotics** - ViperX 300, WidowX 250 (maillages BSD-3-Clause, géométrie/cinématique officielle de [interbotix_ros_manipulators](https://github.com/Interbotix/interbotix_ros_manipulators))
- 🏭 **Koch / Low-Cost Robot Arm** - Koch v1.1, un autre bras économique à 5-DOF (et non 6) (maillages Apache-2.0, via [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie))
- ⚙️ **Générique** - un bras simplifié à deux liaisons pour toute configuration sans modèle dédié

Cela représente 24 modèles de robots réels répartis sur 13 fabricants, plus le placeholder Générique - voir le tableau des licences plus bas pour la correspondance exacte modèle↔fabricant↔licence que cette liste résume. Chaque modèle réel (tous sauf le Générique) charge la géométrie de maillage STL réelle par liaison et l'anime à travers la propre chaîne de transformation d'articulations réelle de ce fabricant - pas un placeholder stylisé. La cinématique directe/inverse est calculée par rapport à la propre géométrie réelle de chaque robot (résolution de Newton-Raphson pour la position, limites réelles par articulation là où le robot les définit), de sorte qu'une trajectoire enregistrée ou une cible cartésienne en jog déplace le bon bras exactement comme le ferait le robot physique réel. Les 5 modèles e-Series d'Universal Robots partagent en outre un unique moteur FK/IK commun (`src/examples/urKinematicsShared.ts`) et un unique moteur de rendu de rig 3D commun (`src/components/3d/URArm.tsx`), puisque chaque articulation de la e-Series UR partage exactement la même structure cinématique - seules les longueurs numériques des liaisons diffèrent par modèle. Les 3 modèles UR classiques (UR3/UR5/UR10) partagent quant à eux leur propre moteur et moteur de rendu séparés (`src/examples/urClassicKinematics.ts`, `src/components/3d/UrClassicArm.tsx`), car cette génération plus ancienne ne partage pas le même axe Z local sur toutes ses articulations comme le fait la e-Series.

Les contrôles de jog par robot incluent un bouton rotatif + curseur à la fois pour la **vitesse** et l'**accélération** sur chaque axe, et une lecture complète des fins de course/statut aux côtés d'une carte de statut "Robot Controller Board" en direct une fois que CAN-OTA est câblé au matériel réel. Chaque bouton/curseur s'aligne sur la valeur de **Step** de jog sélectionnée dans son propre menu déroulant (de 0,1° jusqu'à 100°/mm) plutôt que de se déplacer en continu. Le robot **A1** est une preuve de concept en cours pour une disposition différente : ses contrôles de jog Speed/Acceleration/J1-J6/XYZ vivent dans un panneau flottant déplaçable par-dessus la vue 3D elle-même (`Joystick3D.tsx` pour le pad XYZ) au lieu du panneau situé en dessous que tous les autres robots utilisent encore - voir `src/components/robots/A1.tsx`.

---

## 🏭 Kinematic Brain Stage

Un panneau de contrôle dédié au propre sous-système de mouvement local de la carte mère HYDRA-UMC - les axes pilotés directement par le STM32H745, distincts des bras robotiques distribués sur STACK A :

- 📐 Contrôle de jog du **portique XY** pour les axes X, Y1, Y2 (portique Y double), et Z
- 🔥 Contrôle du **plateau chauffant** (commuté par SSR, 230VAC)
- 🔄 **Barillet ATC** - contrôle d'index d'outil rotatif pour le changeur d'outil automatique piloté par E0
- 🎢 **Convoyeur** - contrôle installé/en marche/vitesse pour la bande de transport pilotée par E1
- 🛑 Une grille complète de 12 fins de course, 3 canaux de ventilateur, et 10 pompes/10 vannes pour la fluidique du procédé

---

## 🎛️ Panneaux de Contrôle Accessoires et Machines

Panneaux dédiés pour les machines et accessoires qui accompagnent une cellule robotique : **Table XY**, **Outils ATC**, **Gestionnaire de Racks**, **Pick & Place** (incluant la configuration spécifique JuanenPnP/LumenPnP), **CNC** (incluant la configuration spécifique JuanenCNC), **Laser** (incluant la configuration spécifique JuanenLaser), **Table à Vide**, et **Plateau Chauffant**.

---

## 🔄 Travaux et Trajectoires

Chargez des trajectoires d'exemple prédéfinies, effectuez le jog et enregistrez vos propres points en direct, ou chargez/enregistrez/modifiez/relisez des trajectoires complexes multi-points (JSON) par robot. Les trajectoires sont portables entre modèles de robot - chaque point enregistré est résolu à travers la propre cinématique réelle de ce robot spécifique (`src/examples/robotKinematicsDispatch.ts`) au moment du chargement/dessin/lecture, et non figé par rapport au robot avec lequel il a été enregistré, de sorte que le même fichier de trajectoire pilote correctement un Parol6 et un UR10e le long de leur propre géométrie atteignable réelle.

---

## 🛠️ Outils Firmware CAN-OTA

Flashez et auto-testez le firmware à travers toute la chaîne CAN-OTA de HYDRA-UMC + URTC depuis un seul tableau de bord, avec deux points d'entrée dédiés :

- **URTC → Flasher / Tester** - pour la carte URTC Tool Head et ses propres cartes d'extension (correspond à la couverture de protocole propre des outils de bureau autonomes [URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)/[URTC Tester](https://github.com/JuanenRac/URTC-TESTER))
- **HYDRA-UMC → Flasher / Tester** - pour les niveaux Robot Controller Board et Kinematic Brain, relayé sur tout le trajet depuis CM5 → SPI → STM32H745 → FDCAN1 → Robot Controller Board → CAN → URTC Tool Head, sans besoin de sonde JTAG/SWD ni de dongle USB-CAN (voir le propre [`docs/architecture.md` de HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC/blob/main/docs/architecture.md) pour la conception complète d'adressage/relais)

Les deux peuvent télécharger de vraies versions de firmware directement depuis GitHub (basé sur `firmware_manifest.json`, vérifié par CRC32) pour le dépôt `URTC` comme pour `HYDRA-UMC`. Comme indiqué ci-dessus, le transport lui-même s'exécute contre une simulation intégrée complète jusqu'à ce qu'un vrai firmware STM32H745 existe sur du matériel réel avec lequel communiquer.

---

## 🎮 Support Manette

Intégration de manettes USB et Bluetooth avec mappages personnalisés par bouton/par axe, pour effectuer le jog des robots et accessoires sans souris/clavier.

---

## 📹 Intégration Caméras

Jusqu'à 8 flux en direct simultanés (vision USB ou capteurs thermiques de la famille MLX90640/41/42) avec statut d'enregistrement et d'inférence - la matrice de caméras autour de laquelle est construit le propre sous-système de hub USB 3.0 double de HYDRA-UMC.

---

## 🌐 Interface Multi-Langue

Traduction complète de l'interface en **anglais, espagnol, allemand, français et italien** (`src/locales/`), incluant le menu Aide intégré à l'application, la boîte de dialogue À propos (version/auteur/licence), et chaque onglet de la boîte de dialogue de Configuration Système. La couverture n'est pas encore de 100 % de chaque écran - une poignée de panneaux d'accessoires autonomes reste codée en dur en anglais, pas encore atteinte par le travail de traduction.

---

## ℹ️ À Propos et Configuration Système

Deux boîtes de dialogue autonomes, toutes deux accessibles depuis l'en-tête (boutons `Config`/`About`) : **About** affiche la version de l'application en cours d'exécution (lue en direct depuis `GET /api/hydra-info`), l'auteur, et la licence ; **Config** couvre l'identité du serveur, la gestion des contrôleurs/nœuds, le thème d'interface + la langue, le renommage des robots, le mappage caméra↔robot avec détection de conflits, la bibliothèque d'URDF personnalisés, les intégrations logicielles tierces (backends OpenPnP/CNC/Laser), l'accès distant par client (interrupteurs indépendants pour SUITE/Android/iOS), les comptes utilisateurs, les répertoires de travail par robot, le transport CAN-OTA, et le mappage de manette - chacun dans son propre onglet. Les deux sont leurs propres composants (`src/components/About.tsx`, `src/components/Config.tsx`), non intégrés en ligne dans la coquille principale du tableau de bord.

## 🔐 Comptes et Accès

Chaque serveur crée un compte lors de son tout premier démarrage - identifiant `admin`, mot de passe `admin` - changez-le depuis **Config > Users** dès que le serveur est accessible au-delà d'un réseau local totalement de confiance. Ce même onglet permet à un compte admin de créer des comptes **operator** supplémentaires : un operator peut se connecter, observer l'état en direct, et piloter les robots (jog/lecture/pause/arrêt/outil/vanne/pompe/vitesse), mais ne peut pas écraser les paramètres globaux ni gérer d'autres comptes. Aucun compte n'est requis simplement pour regarder - le propre bouton "Continue read-only" de l'écran de connexion saute directement au tableau de bord avec les écritures désactivées. Contrat complet (rôles, jetons, les routes `/api/users`) documenté dans le propre [`docs/REMOTE_API.md` de HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md), sections 2a/2b.

Chacun des 3 clients distants (SUITE, Android, iOS) s'auto-identifie via un en-tête de requête `X-Hydra-Client`, de sorte que **Config > Remote Access** peut autoriser ou bloquer chacun indépendamment plutôt qu'un seul interrupteur combiné pour les trois.

---

## 💾 État Persistant

HYDRA-UMC STUDIO lui-même est un client pur - il ne conserve aucun état propre au-delà de ce qui est en mémoire pour la session en cours. Toute la persistance (`settings.json`, `users.json`, trajectoires enregistrées sous `WORKS/`, modèles envoyés) vit sur le backend séparé **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** avec lequel cette application communique sur le réseau (voir le propre `data/` et README de ce projet pour la vue d'ensemble complète) - l'état survit à un rechargement de page ou à un redéploiement de cette application, puisqu'aucun des deux ne touche le processus backend. `settings.json` lui-même est délibérément exclu du service de fichiers statiques de ce backend (il contient les IP des contrôleurs, la configuration CAN-OTA, et l'état complet par robot), même si le reste de son dossier `WORKS/` est servi normalement.

Le même contrat `GET`/`POST /api/settings`, plus un point de terminaison de découverte (`GET /api/hydra-info`) et un `WebSocket /ws` pour les mises à jour push en direct, est aussi la façon dont les clients externes se connectent à ce même backend - c'est ce qui permet à [HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) de découvrir une instance de HYDRA-UMC SERVER active sur le réseau, de lire/modifier son état, et de voir les changements effectués depuis le propre onglet de navigateur de cette application reflétés en direct (et vice versa). Contrat complet dans le propre [`docs/REMOTE_API.md` de HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md).

`GET /api/system/metrics` alimente le pied de page du tableau de bord Overview : la charge CPU et l'utilisation mémoire sont toujours réelles (le propre module `os` de Node) ; la température lit la sortie réelle de `vcgencmd measure_temp` lors de l'exécution sur un vrai Raspberry Pi et retombe sur une valeur simulée clairement signalée sinon (`temp_is_real` dans la réponse) ; le statut Wi-Fi/Ethernet/Bluetooth est lu depuis `/sys/class/net`/`/sys/class/bluetooth` (Linux uniquement, `null`/inconnu sur tout autre hôte plutôt qu'une valeur devinée).

---

## 📂 Structure du Dépôt

```text
HYDRA-UMC-STUDIO/
├── src/
│   ├── Dashboard.tsx            # Coquille principale de l'application - navigation, panneau Overview, métriques système en pied de page
│   ├── store.tsx                # État global : RobotModel/RobotState/HydraController/SystemSettings -
│   │                             # communique avec le backend séparé HYDRA-UMC-SERVER via REST + WebSocket
│   ├── i18n.ts                  # Configuration react-i18next - charge src/locales/*.json
│   ├── components/
│   │   ├── About.tsx, Config.tsx  # Boîtes de dialogue de Configuration Système et À propos - composants autonomes
│   │   │                       # qui lisent le même store global, non intégrés en ligne dans la coquille du tableau de bord
│   │   ├── AuthGate.tsx, UsersPanel.tsx  # Écran de connexion et le gestionnaire de comptes admin/operator de Config > Users
│   │   ├── RobotDetail.tsx      # Implémentation partagée de jog/trajectoire/config par robot (le sélecteur
│   │   │                       # de modèle vit ici) - chaque point d'entrée robots/A*.tsx ci-dessous effectue le rendu de celui-ci
│   │   ├── robots/A1.tsx .. A8.tsx  # Points d'entrée par robot - réexportations minces de RobotDetail.tsx, l'
│   │   │                       # endroit pour faire grandir tout comportement futur spécifique à un robot sans toucher les
│   │   │                       # 7 autres. A1 est déjà la seule exception : la propre branche `isFloatingLayout` de
│   │   │                       # RobotDetail.tsx (robot.id === 1) déplace le jog de Speed/Acceleration/
│   │   │                       # J1-J6/XYZ vers une superposition déplaçable sur la vue 3D au lieu du
│   │   │                       # panneau en dessous.
│   │   ├── Joystick3D.tsx       # Pavé directionnel de jog XYZ utilisé par cette superposition flottante
│   │   ├── VirtualKinematics.tsx  # L'hôte de la scène <Canvas> de React Three Fiber
│   │   ├── KinematicBrainStage.tsx  # Panneau portique XY / plateau chauffant / barillet ATC / convoyeur
│   │   ├── Flasher.tsx, Tester.tsx  # Outils CAN-OTA (niveaux URTC et HYDRA-UMC)
│   │   ├── ATCToolsConfig.tsx, RackConfigView.tsx, PickAndPlace.tsx, CNC.tsx, Laser.tsx,
│   │   │   VacuumTableConfig.tsx, HeatedBedConfig.tsx, XYTableConfig.tsx
│   │   │                       # Panneaux de contrôle accessoires/machines
│   │   ├── JuanenPnPConfig.tsx, LumenPnPConfig.tsx, JuanenCNCConfig.tsx, JuanenLaserConfig.tsx
│   │   │                       # Variantes de configuration spécifiques à une machine - pas encore connectées à un
│   │   │                       # chemin de navigation (code mort)
│   │   ├── CamerasView.tsx, GamepadConfig.tsx, GamepadController.tsx, HelpModal.tsx
│   │   ├── FuturisticSlider.tsx, RotaryKnob.tsx  # Widgets de contrôle de jog partagés
│   │   └── 3d/
│   │       ├── RobotArm.tsx     # Dirige vers le bon rig par modèle selon robot.model
│   │       ├── Parol6Arm.tsx, Faze4Arm.tsx, AR3Arm.tsx, AR4Arm.tsx, EdoArm.tsx, Gen2Arm.tsx,
│   │       │   Gen3LiteArm.tsx, Lite6Arm.tsx, M710icArm.tsx, PiperArm.tsx, SoArm100Arm.tsx,
│   │       │   Vx300sArm.tsx, Wx250sArm.tsx, XArm6Arm.tsx, Z1Arm.tsx, KochArm.tsx,
│   │       │   LumenPnPRig.tsx, GenericRobotArm.tsx
│   │       │                   # Rigs spécifiques à chaque fabricant, chacun retranscrit à la main depuis son propre URDF réel
│   │       ├── URArm.tsx, UrClassicArm.tsx  # Rigs paramétrés partagés pour les lignes e-Series/Classic d'Universal Robots
│   │       ├── UR3eArm.tsx, UR5eArm.tsx, UR10eArm.tsx, UR16eArm.tsx, UR20Arm.tsx,
│   │       │   Ur3ClassicArm.tsx, Ur5ClassicArm.tsx, Ur10ClassicArm.tsx
│   │       │                   # Enveloppes minces par modèle autour de URArm.tsx / UrClassicArm.tsx
│   │       ├── Shared3DEnvironment.tsx, SharedModule3DView.tsx, PathVisualizer.tsx,
│   │       │   Toolhead.tsx, DraggableGizmo.tsx, ATC3DView.tsx, Rack3DView.tsx
│   │       │                   # Environnement de scène, dessin de trajectoire, rendu d'outil/gizmo
│   ├── examples/
│   │   ├── kinematics.ts, utils.ts, robotKinematicsDispatch.ts
│   │   │                       # Cinématique générique partagée à 2 liaisons + dispatch par modèle
│   │   ├── parol6Kinematics.ts, faze4Kinematics.ts, ar3Kinematics.ts, ar4Kinematics.ts,
│   │   │   edoKinematics.ts, gen2Kinematics.ts, gen3LiteKinematics.ts, kochKinematics.ts,
│   │   │   lite6Kinematics.ts, m710icKinematics.ts, piperKinematics.ts, soArm100Kinematics.ts,
│   │   │   xarm6Kinematics.ts, z1Kinematics.ts
│   │   │                       # FK/IK réelle spécifique à chaque fabricant
│   │   ├── urKinematicsShared.ts, urClassicKinematics.ts  # Moteur FK/IK partagé pour les lignes e-Series/Classic d'UR
│   │   ├── ur3eKinematics.ts, ur5eKinematics.ts, ur10eKinematics.ts, ur16eKinematics.ts, ur20Kinematics.ts,
│   │   │   ur3ClassicKinematics.ts, ur5ClassicKinematics.ts, ur10ClassicKinematics.ts
│   │   │                       # Données minces par modèle de chaîne UR/limites/pose de repos
│   │   └── list/                # 26 trajectoires d'exemple prédéfinies (cercles, spirales, motifs de table XY, pick-and-place, ...)
│   ├── lib/canOta.ts            # Couche de simulation/protocole CAN-OTA, téléchargement de firmware depuis GitHub
│   ├── lib/apiBase.ts           # Résolution de l'URL du backend - relative+proxifiée en dev, VITE_API_BASE_URL en prod
│   └── locales/                 # Fichiers de traduction en/es/de/fr/it (react-i18next)
├── public/models/                # Assets de maillage 3D réels - un dossier par robot (24 au total),
│                                  # chacun avec son propre ATTRIBUTION.txt - voir la table des licences plus bas
├── images/                       # Bannière du README
├── .env.example                  # Modèle de VITE_API_BASE_URL - voir src/lib/apiBase.ts
├── README.md                     # ce fichier (en anglais)
└── README_spa.md / README_ita.md / README_fra.md / README_deu.md / README_zho.md / README_jpn.md  # traductions
```

Le backend avec lequel communique cette application (persistance des settings, l'API REST/WebSocket, `docs/REMOTE_API.md`) vit dans le dépôt séparé **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)**, pas dans celui-ci - voir le propre README de ce projet pour sa structure et comment l'exécuter.

---

## 🛠️ Environnement de Développement

### Prérequis
- [Node.js](https://nodejs.org/) (v18 ou supérieur recommandé)
- npm
- Un backend **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** en cours d'exécution (`npm run dev` là-bas aussi, port `3000` par défaut) - cette application est un client pur et n'a rien avec qui communiquer sans lui.

### Installation

```bash
npm install
```

### Mode Développement

Exécute le propre serveur de développement de Vite (`vite` simple, port `5173`) avec rechargement en direct. Le propre `server.proxy` de `vite.config.ts` redirige de façon transparente `/api`, `/ws`, et `/WORKS` vers `http://localhost:3000`, de sorte que les appels fetch/WebSocket à chemin relatif de l'application atteignent le backend HYDRA-UMC SERVER sans configuration CORS nécessaire - assurez-vous simplement que ce backend est en cours d'exécution en premier :
- **Windows :** double-cliquez sur `dev.bat` ou exécutez `npm run dev`
- **Linux/Mac :** exécutez `./dev.sh` ou `npm run dev`

### Build de Production

Compile en une build statique optimisée (`vite build` simple - aucun empaquetage de serveur, cette application n'a plus de code backend) :
- **Windows :** double-cliquez sur `build.bat` ou exécutez `npm run build`
- **Linux/Mac :** exécutez `./build.sh` ou `npm run build`

Prévisualisez la build de production localement avec :
```bash
npm run preview
```

Déployez le dossier `dist/` obtenu sur n'importe quel hébergeur statique. Par défaut, l'application compilée cherche son backend sur le même nom d'hôte que cette page, sur le port `3000` (correspond au déploiement courant « tout sur la CM5 ») ; définissez `VITE_API_BASE_URL` au moment de la compilation (voir `.env.example`) pour la pointer vers une instance de HYDRA-UMC SERVER hébergée ailleurs. Tout l'état et les données réelles persistent dans le propre répertoire `data/` de ce backend, pas dans ce dépôt.

### Gestion des versions

Chaque `npm run build` réel incrémente automatiquement le champ `version` de `package.json` (`scripts/bump-version.mjs`, intégré comme première étape du script `build`) - un « compteur kilométrique » en base 10 : patch +1 par build, avec report vers minor (et de minor vers major) au-delà de 9, plutôt que d'atteindre un jour un segment à deux chiffres (`0.0.9` -> `0.1.0`, pas `0.0.10`). La version en cours est visible en direct dans la boîte de dialogue **About**, et l'historique complet se trouve dans [`CHANGELOG.md`](CHANGELOG.md).

---

## 🔗 Projets Associés

Ce projet fait partie d'un écosystème robotique plus vaste du même auteur (JuanenRac / Electro Hobby 3D). Cela vaut la peine de le savoir, car une demande pourrait en réalité concerner l'un de ceux-ci plutôt que ce dépôt :

**Plateforme HYDRA-UMC** — la cellule de micro-usine multi-robots
- **[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)** — la carte mère elle-même : hôte Raspberry Pi CM5 + coprocesseur temps réel STM32H745 double cœur, orchestrant jusqu'à 8 bras robotiques distribués sur CAN-OTA/SPI-OTA. Matériel + firmware propres, GPL-3.0/CERN-OHL-S v2/CC BY-SA 4.0.
- **HYDRA-UMC STUDIO** *(ce dépôt)* — tableau de bord de contrôle web pour HYDRA-UMC : visualisation 3D multi-robots, cinématique/enregistrement de trajectoires, flashing et test CAN-OTA pour toute la plateforme. Client Vite/React pur - React + Vite + Three.js, aucun code backend propre.
- **[HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** — backend API Express/WebSocket headless pour toute la plateforme : état des robots/contrôleurs, authentification, découverte mDNS, envois de modèles. Fonctionne indépendamment de cette application - voir le propre README de ce projet pour la raison de ce processus séparé.
- **[HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL)** — application de contrôle Android pour HYDRA-UMC via Wi-Fi/Bluetooth. Application réelle et fonctionnelle - ensemble complet de fonctionnalités de contrôle à distance, authentification JWT, stockage chiffré des identifiants.
- **[HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL)** — application de contrôle iOS/iPadOS pour HYDRA-UMC via Wi-Fi, construite en Flutter (multiplateforme, vérifiable sous Windows sans Mac ; l'empaquetage final du `.ipa` nécessite encore Xcode). Application réelle et fonctionnelle - même ensemble de fonctionnalités que l'application Android.
- **[HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)** — centre de commande d'essaim de bureau (Python/PySide6) : découverte réseau multi-contrôleurs, synchronisation bidirectionnelle en direct, vue 3D de robot réelle, espace de travail ancrable façon Photoshop. Réel et fonctionnel, pas un placeholder.
- **[HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF)** — créateur/éditeur graphique d'URDF de bureau (Python/PySide6) pour le propre catalogue de modèles de ce projet : extrait les fichiers source depuis GitHub ou un dossier local, valide la faisabilité des DDL, modifie couleur/échelle/cinématique avec un aperçu 3D en direct, et pousse le résultat final vers un serveur STUDIO actif (voir le propre `POST /api/models/submit` de ce projet et Config > Models). Réel et fonctionnel, pas un placeholder.
- **[HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)** — interface tactile native en Flutter pour l'écran tactile DSI 5"/7" propre à HYDRA-UMC (1280×720, même résolution dans les deux tailles) sur le Compute Module 5, contrôlant ce même serveur directement depuis la carte. Scaffold réel et fonctionnel avec les 6 écrans du catalogue (dashboard, contrôle manuel, caméra, vue 3D simplifiée, métriques système, connexion) connectés au serveur en direct ; la compilation réelle de la cible Linux n'a pas encore été exécutée sur du matériel réel (environnement de travail uniquement Windows jusqu'à présent - voir le README de ce projet).

**Plateforme URTC** — le contrôleur de tête d'outil que chaque bras robotique HYDRA-UMC embarque
- **[URTC](https://github.com/JuanenRac/URTC)** — Universal Robot Tool Controller : contrôleur de tête d'outil sur bus CAN basé sur STM32F303, 25 profils d'outil entièrement implémentés, mise à jour de firmware CAN-OTA.
- **[URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)** — outil de bureau de flashing CAN-OTA + puce complète via SWD/JTAG pour cartes URTC (Windows/Linux).
- **[URTC Tester](https://github.com/JuanenRac/URTC-TESTER)** — outil de bureau de diagnostic en direct sur bus CAN pour cartes URTC, un panneau par profil d'outil (Windows/Linux).
- **[URTC Web Studio](https://github.com/JuanenRac/URTC-WEB-STUDIO)** — alternative basée sur navigateur aux 2 outils de bureau ci-dessus (Web Serial API + SLCAN), aucune installation locale nécessaire.

**Directement liés à ce tableau de bord** — projets qui se branchent directement sur HYDRA-UMC STUDIO :
- **[HYDRA-UMC-DASHBOARD-AI](https://github.com/JuanenRac/HYDRA-UMC-DASHBOARD-AI)** — étend ce même tableau de bord avec des insights pilotés par l'IA.
- **[HYDRA-UMC-COGNITIVE-NODE](https://github.com/JuanenRac/HYDRA-UMC-COGNITIVE-NODE)** — permet le contrôle par voix/langage naturel de ce tableau de bord.
- **[HYDRA-UMC-VOICE-UI](https://github.com/JuanenRac/HYDRA-UMC-VOICE-UI)** — permet le contrôle par voix/langage naturel de ce tableau de bord.
- **[HYDRA-UMC-TWIN](https://github.com/JuanenRac/HYDRA-UMC-TWIN)** — permet de prévisualiser sur le jumeau numérique avant de toucher au robot réel, directement depuis ce tableau de bord.
- **[HYDRA-UMC-HIL-BRIDGE](https://github.com/JuanenRac/HYDRA-UMC-HIL-BRIDGE)** — permet de prévisualiser sur le jumeau numérique avant de toucher au robot réel, directement depuis ce tableau de bord.

Au-delà de cela, le même auteur maintient de nombreux autres projets à travers cet écosystème, regroupés ici par catégorie :

- **💠 Écosystème Principal :** [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) · [HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER) · [HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) · [HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI) · [HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL) · [HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL) · [HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF) · [URTC](https://github.com/JuanenRac/URTC) · [URTC-FLASHER](https://github.com/JuanenRac/URTC-FLASHER) · [URTC-TESTER](https://github.com/JuanenRac/URTC-TESTER) · [URTC-WEB-STUDIO](https://github.com/JuanenRac/URTC-WEB-STUDIO)
- **👁️ Nœud de Vision IA (Hailo-8) :** [HYDRA-UMC-VISION-NODE](https://github.com/JuanenRac/HYDRA-UMC-VISION-NODE) · [HYDRA-UMC-VISION-STREAMER](https://github.com/JuanenRac/HYDRA-UMC-VISION-STREAMER) · [HYDRA-UMC-DETECTION-HEF](https://github.com/JuanenRac/HYDRA-UMC-DETECTION-HEF) · [HYDRA-UMC-SAFETY-ZONES](https://github.com/JuanenRac/HYDRA-UMC-SAFETY-ZONES) · [HYDRA-UMC-VISUAL-SERVOING-API](https://github.com/JuanenRac/HYDRA-UMC-VISUAL-SERVOING-API)
- **🧠 Nœud Cognitif IA (Hailo-10) :** [HYDRA-UMC-VLA-ENGINE](https://github.com/JuanenRac/HYDRA-UMC-VLA-ENGINE) · [HYDRA-UMC-SEMANTIC-PLANNER](https://github.com/JuanenRac/HYDRA-UMC-SEMANTIC-PLANNER) · [HYDRA-UMC-DOCS-QA](https://github.com/JuanenRac/HYDRA-UMC-DOCS-QA)
- **🐝 Orchestration et Essaim :** [HYDRA-UMC-ORCHESTRATOR](https://github.com/JuanenRac/HYDRA-UMC-ORCHESTRATOR) · [HYDRA-UMC-SWARM-SYNC](https://github.com/JuanenRac/HYDRA-UMC-SWARM-SYNC) · [HYDRA-UMC-PATH-PLANNER-3D](https://github.com/JuanenRac/HYDRA-UMC-PATH-PLANNER-3D) · [HYDRA-UMC-JOB-DISPATCHER](https://github.com/JuanenRac/HYDRA-UMC-JOB-DISPATCHER) · [HYDRA-UMC-NODE-HEALING](https://github.com/JuanenRac/HYDRA-UMC-NODE-HEALING)
- **🎮 Jumeau Numérique et Simulation :** [HYDRA-UMC-PHYSICS-REPLICA](https://github.com/JuanenRac/HYDRA-UMC-PHYSICS-REPLICA) · [HYDRA-UMC-SYNTHETIC-DATA-GEN](https://github.com/JuanenRac/HYDRA-UMC-SYNTHETIC-DATA-GEN)
- **📊 Données et Analytique :** [HYDRA-UMC-DATALAKE](https://github.com/JuanenRac/HYDRA-UMC-DATALAKE) · [HYDRA-UMC-TELEMETRY-COLLECTOR](https://github.com/JuanenRac/HYDRA-UMC-TELEMETRY-COLLECTOR) · [HYDRA-UMC-ANOMALY-DETECTOR](https://github.com/JuanenRac/HYDRA-UMC-ANOMALY-DETECTOR) · [HYDRA-UMC-PRODUCTION-REPORTS](https://github.com/JuanenRac/HYDRA-UMC-PRODUCTION-REPORTS)
- **🏭 Passerelle Industrielle :** [HYDRA-UMC-GATEWAY-INDUSTRIAL](https://github.com/JuanenRac/HYDRA-UMC-GATEWAY-INDUSTRIAL) · [HYDRA-UMC-OPCUA-SERVER](https://github.com/JuanenRac/HYDRA-UMC-OPCUA-SERVER) · [HYDRA-UMC-MQTT-BROKER](https://github.com/JuanenRac/HYDRA-UMC-MQTT-BROKER) · [HYDRA-UMC-MTCONNECT-ADAPTER](https://github.com/JuanenRac/HYDRA-UMC-MTCONNECT-ADAPTER)
- **🛠️ Outils Complémentaires :** [URTC-SMART-RACK](https://github.com/JuanenRac/URTC-SMART-RACK) · [URTC-VISION-TOOL](https://github.com/JuanenRac/URTC-VISION-TOOL) · [HYDRA-UMC-WATCH](https://github.com/JuanenRac/HYDRA-UMC-WATCH) · [HYDRA-UMC-TOOL-CLI](https://github.com/JuanenRac/HYDRA-UMC-TOOL-CLI)

Dans l'ensemble, l'écosystème de cet auteur couvre bien plus de projets que celui-ci - ce qui précède est une carte, pas une liste exhaustive de fonctionnalités ; consultez le propre README de chaque dépôt pour savoir ce qu'il fait réellement aujourd'hui.

---

## 👤 AUTEUR
**JuanenRac** (Electro Hobby 3D)
📧 electrohobby3d@gmail.com
📺 [youtube.com/@electrohobby3d](https://youtube.com/@electrohobby3d)

## 📜 LICENCE

HYDRA-UMC STUDIO est (c) 2026 JuanenRac (Electro Hobby 3D). Cet avis doit être inclus dans toute distribution de ce projet ou travaux dérivés.

Le code source de cette application est disponible sous la **GNU General Public License v3.0 (GPL-3.0)**. Texte complet sur https://www.gnu.org/licenses/gpl-3.0.html.

La documentation (ce README et ses propres traductions - `README_spa.md`, `README_ita.md`, `README_fra.md`, `README_deu.md`, `README_zho.md`, `README_jpn.md`) est disponible sous **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**. Texte complet sur https://creativecommons.org/licenses/by-sa/4.0/.

**Assets de maillage de robot tiers :** la géométrie 3D réelle sous `public/models/` n'est PAS couverte par la GPL-3.0 ci-dessus - les fichiers de maillage de chaque modèle de robot sont des assets tiers sous licence séparée, redistribués ici selon leurs propres termes d'origine :

| Fabricant | Modèles | Licence |
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
| Opulo | LumenPnP v4 (également utilisé pour JuanenPnP) | CERN-OHL-W v2 |

La référence exacte au dépôt source, au chemin, et au texte de licence de chaque modèle se trouve dans le propre `public/models/<slug>/ATTRIBUTION.txt` de ce modèle - consultez ce fichier avant de redistribuer un ensemble de maillages spécifique, plutôt que de supposer que le tableau ci-dessus s'y substitue. Le propre `ATTRIBUTION.txt` de LumenPnP vaut la peine d'être lu en entier - contrairement à chaque bras robotique ci-dessus (fichiers STL préfabriqués propres au fabricant, téléchargés tels quels), ces 5 fichiers de maillage ont été générés en interne à partir de la source FreeCAD réelle d'Opulo, et non redistribués tels quels.

Ce tableau de bord est le panneau de contrôle web du projet de carte mère [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) - voir ce dépôt pour le licenciement propre de son matériel (CERN-OHL-S v2) et de son firmware (GPL-3.0), auquel la licence propre de ce dépôt ne s'étend pas, et vice versa. Il implémente également des outils CAN-OTA contre le protocole [URTC](https://github.com/JuanenRac/URTC) - voir le propre dépôt de ce projet pour sa propre licence séparée.

Si vous construisez sur ce projet, gardez à l'esprit la séparation des licences : les modifications de code devraient rester en GPL-3.0, les dérivés de documentation devraient rester en CC BY-SA, et toute redistribution des assets de maillage d'un robot spécifique devrait rester sous la licence d'origine propre à ce modèle - chacun avec attribution vers ce projet et son auteur.
