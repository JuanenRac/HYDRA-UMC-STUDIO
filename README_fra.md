<!-- =============================================================================
HYDRA-UMC-STUDIO - Web control dashboard of the HYDRA-UMC multi-robot micro-factory
Copyright (C) JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
GPL-3.0-or-later - see LICENSE
============================================================================= -->

<p align="center">
  <img src="images/HYDRA_UMC_BANNER.svg" alt="HYDRA-UMC-STUDIO banner" width="100%">
</p>

# 🤖 HYDRA-UMC-STUDIO

<p align="center"><a href="README.md">🇺🇸 English</a> | <a href="README_spa.md">🇪🇸 Español</a> | 🇫🇷 <b>Français</b> | <a href="README_ita.md">🇮🇹 Italiano</a> | <a href="README_deu.md">🇩🇪 Deutsch</a> | <a href="README_zho.md">🇨🇳 简体中文</a> | <a href="README_jpn.md">🇯🇵 日本語</a> | <a href="README_por.md">🇵🇹 Português</a></p>

### 🤖 Tableau de Bord de Contrôle Web pour la Micro-Usine Multi-Robots HYDRA-UMC

<p align="center">
  <img src="https://img.shields.io/badge/License-GPL%203.0--or--later-blue.svg" alt="GPL 3.0 or later">
  <img src="https://img.shields.io/badge/Framework-React%2019-61DAFB.svg" alt="Framework">
  <img src="https://img.shields.io/badge/Tool-Vite-646CFF.svg" alt="Tool">
  <img src="https://img.shields.io/badge/3D-Three.js-black.svg" alt="3D">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6.svg" alt="Language">
  <img src="https://img.shields.io/badge/Tests-637%20passing-2ea44f.svg" alt="Tests">
  <img src="https://img.shields.io/badge/Version-0.8.0.2-0f6cbd.svg" alt="Version">
  <img src="https://img.shields.io/badge/Maturity-functional-0F6CBD.svg" alt="Maturity">
</p>

---

> **État de la sûreté et de la cybersécurité :** cet écosystème n'est pas un système de sécurité certifié. Il n'existe pas encore de chaîne d'E-STOP matérielle, ni de limites ou de verrouillages imposés par le firmware, ni de commande de mouvement vérifiée ; les images de firmware sont contrôlées par CRC-32 et une signature Ed25519, et une compilation de version refuse les clés de développement publiées (les têtes d'outil et les cartes d'extension derrière le relais utilisent encore les chargeurs d'URTC, qui prennent un HMAC-SHA256 à clé partagée au lieu d'une signature) ; TLS et TLS mutuel sont optionnels et désactivés par défaut ; aucune carte propre n'a encore été assemblée ni testée. Lisez la [base de sécurité](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md) et le [modèle de menaces](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md) avant de vous fier à une affirmation d'ici pour la sécurité d'une personne.

---

## 📋 En un coup d'œil

| | |
|---|---|
| Version | `0.8.0.2` |
| Maturité | Fonctionnel |
| Tests | 637 (`npm test`) |
| Technologie | React 19 / Vite / Three.js / Tailwind CSS |
| Cible | Le Raspberry Pi CM5 d'une cellule HYDRA-UMC |
| Sur matériel réel | Pas encore : aucune exécution sur du matériel réel n'est consignée pour cette version |

**Aller à :** [Présentation](#-présentation) · [Architecture](#-architecture) · [Fonctionnalités](#-fonctionnalités) · [Sécurité et protection](#-sécurité-et-protection) · [Interfaces](#-interfaces) · [Configuration](#-configuration) · [Démarrage rapide](#-démarrage-rapide) · [Tests](#-tests) · [Dépannage](#-dépannage) · [Structure du dépôt](#-structure-du-dépôt) · [Projets liés](#-projets-liés)

## 🚦 État du projet

Chaque ligne est une partie de ce dépôt et le feu dit où elle en est aujourd'hui. Elle est écrite d'après ce que le dépôt peut montrer (tests, compilations, exécutions), pas d'après ce qui est prévu.

🟢 Fait et vérifié · 🟡 Fonctionne, avec des limites connues · 🟠 À moitié fait ou pas encore vérifié · 🔴 Pas fait ou ne fonctionne pas

| Domaine | État | Ce que cela veut dire ici |
|---|---|---|
| Logiciel | 🟡 | Fonctionne pour son usage principal ; la vérification d'honnêteté ci-dessus liste ce qui manque encore |
| Tests | 🟢 | 637 tests automatiques, exécutés à chaque modification |
| Matériel réel | 🔴 | Pas encore : aucune exécution sur du matériel réel n'est consignée pour cette version |
| Documentation | 🟢 | README en huit langues, vérifié par rapport au manifeste à chaque modification |

## 🎯 Présentation

**HYDRA-UMC STUDIO** est le tableau de bord de contrôle basé sur navigateur pour [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) - la carte mère de la micro-usine multi-robots (hôte Raspberry Pi CM5 + coprocesseur temps réel STM32H745 double cœur) qui orchestre jusqu'à 8 bras robotiques distribués sur un unique bus FDCAN. Là où le propre dépôt de HYDRA-UMC couvre le matériel et le firmware, ce dépôt est le côté orienté vers l'humain : une application React monopage qui visualise chaque robot en 3D réelle, effectue le jog et enregistre leur mouvement, gère les machines et accessoires qui accompagnent une cellule robotique, et flashe/teste toute la chaîne de firmware CAN-OTA - le tout depuis un seul onglet de navigateur, sans installation native nécessaire au-delà de Node.js.

**Note d'honnêteté, suivant la même convention de documentation que le reste de cet écosystème :** le matériel réel propre de HYDRA-UMC n'existe pas encore sous forme de silicium testé (ses bootloaders compilent proprement mais n'ont jamais tourné sur des cartes réelles - voir le propre `docs/architecture.md` de ce dépôt). Ce tableau de bord exécute donc ses outils Flasher/Tester CAN-OTA contre une simulation intégrée complète qui suit le schéma d'adressage réel et documenté de chaque niveau, plutôt que de prétendre parler à un matériel qui n'existe pas. La visualisation 3D des robots, la cinématique, l'enregistrement de trajectoires, et chaque panneau de contrôle d'accessoire sont entièrement réels et indépendants de cela - seul le transport CAN-OTA lui-même est simulé pour l'instant.

Construit avec **React 19**, **Vite**, **Three.js** (via `@react-three/fiber`/`@react-three/drei`), et **TypeScript** - un client pur sans code backend propre. L'état persistant vit sur le backend séparé **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** avec lequel cette application communique sur le réseau.

## 🧩 Rôle dans HYDRA-UMC

**HYDRA-UMC-STUDIO** est le tableau de bord web de la cellule : il dessine chaque robot en 3D avec sa vraie cinématique, déplace et enregistre des trajectoires, pilote les panneaux d'accessoires et de machines, flashe et teste le firmware par la chaîne CAN-OTA et administre le serveur, en huit langues. Il ne garde aucun état propre et ne décide rien en matière de sécurité : rôles, limites, réservations et arrêt sont décidés par HYDRA-UMC-SERVER.

## 🏛️ Architecture

<p align="center">
  <img src="images/architecture.svg" alt="HYDRA-UMC-STUDIO architecture" width="100%">
</p>

## ✨ Fonctionnalités

### Contrôle 3D Multi-Robots

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

### Kinematic Brain Stage

Un panneau de contrôle dédié au propre sous-système de mouvement local de la carte mère HYDRA-UMC - les axes pilotés directement par le STM32H745, distincts des bras robotiques distribués sur STACK A :

- 📐 Contrôle de jog du **portique XY** pour les axes X, Y1, Y2 (portique Y double), et Z
- 🔥 Contrôle du **plateau chauffant** (commuté par SSR, 230VAC)
- 🔄 **Barillet ATC** - contrôle d'index d'outil rotatif pour le changeur d'outil automatique piloté par E0
- 🎢 **Convoyeur** - contrôle installé/en marche/vitesse pour la bande de transport pilotée par E1
- 🛑 Une grille complète de 12 fins de course, 3 canaux de ventilateur, et 10 pompes/10 vannes pour la fluidique du procédé

### Panneaux de Contrôle Accessoires et Machines

Panneaux dédiés pour les machines et accessoires qui accompagnent une cellule robotique : **Table XY**, **Outils ATC**, **Gestionnaire de Racks**, **Pick & Place** (incluant la configuration spécifique JuanenPnP/LumenPnP), **CNC** (incluant la configuration spécifique JuanenCNC), **Laser** (incluant la configuration spécifique JuanenLaser), **Table à Vide**, et **Plateau Chauffant**.

---

### 🧩 Tables à vide sélectionnables

Choisissez un des six modèles STL réels dans Table à Vide : 160 × 120, 230 × 210, 230 × 250, 232 × 217, 240 × 240 ou 250 × 250 mm. La base mesure 15 mm ; la hauteur totale avec les parois d’alignement est de 16,2 mm. La largeur et la longueur sont modifiables par pas de 5 mm (10–5000 mm). La surface est mise à l’échelle, sans changer l’épaisseur. Choisir un modèle rétablit ses dimensions d’origine. Les dimensions personnalisées sont synchronisées via SERVER ; les trous et canaux redimensionnés représentent une disposition visuelle, pas un STL régénéré pour la fabrication. Le choix conserve la position et les états de la pompe et de la vanne ; la réinitialisation sélectionne 160 × 120 mm et les désactive. Les identifiants anciens ou inconnus affichent le premier modèle. STUDIO et les deux interfaces de SUITE partagent le catalogue et modelId dans la configuration du robot.

[Guide des modèles, configuration et régénération](docs/VACUUM_TABLE_MODELS.md).

### 🔥 Modèle de plateau chauffant

Quatre modèles STL : 100×100, 200×100, 200×200 et 255×255 mm, tous de 5 mm d’épaisseur. Largeur/longueur réglables par pas de 5 mm (25–5000 mm) ; choisir un modèle rétablit ses dimensions sans modifier le chauffage. Modèle visuel, pas une conception électrique ou de fabrication.

[Modèle de plateau chauffant — STL / OpenSCAD](docs/HEATED_BED_MODELS.md).

### 🗄️ Racks STL configurables

Rack STL : largeur et profondeur de 40 à 1000 mm par pas de 1 mm ; 1 à 24 cartes avec un pas fixe de 10 mm. Réglages visuels, pas un étalonnage du robot.

[Racks STL configurables — STL / OpenSCAD](docs/RACK_MODELS.md).

### 🛠️ Modèles de machines indépendants

Copies STL indépendantes pour JuanenPnP, JuanenCNC et JuanenLaser ; LumenPnP conserve l’original. Modifiez chaque modèle dans son dossier. Les dimensions CAO sont utilisées ; les anciens réglages de taille ne déforment pas le modèle.

[Modèles de machines indépendants — STL](docs/MACHINE_ASSETS.md).

Ces modèles originaux JuanenPNP / HYDRA-UMC et leurs sources SCAD sont sous GPL-3.0 ; ce ne sont pas les fichiers CAO de la machine Opulo.

### Travaux et Trajectoires

Chargez des trajectoires d'exemple prédéfinies, effectuez le jog et enregistrez vos propres points en direct, ou chargez/enregistrez/modifiez/relisez des trajectoires complexes multi-points (JSON) par robot. Les trajectoires sont portables entre modèles de robot - chaque point enregistré est résolu à travers la propre cinématique réelle de ce robot spécifique (`src/examples/robotKinematicsDispatch.ts`) au moment du chargement/dessin/lecture, et non figé par rapport au robot avec lequel il a été enregistré, de sorte que le même fichier de trajectoire pilote correctement un Parol6 et un UR10e le long de leur propre géométrie atteignable réelle.

### Outils Firmware CAN-OTA

Flashez et auto-testez le firmware à travers toute la chaîne CAN-OTA de HYDRA-UMC + URTC depuis un seul tableau de bord, avec deux points d'entrée dédiés :

- **URTC → Flasher / Tester** - pour la carte URTC Tool Head et ses propres cartes d'extension (correspond à la couverture de protocole propre des outils de bureau autonomes [URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)/[URTC Tester](https://github.com/JuanenRac/URTC-TESTER))
- **HYDRA-UMC → Flasher / Tester** - pour les niveaux Robot Controller Board et Kinematic Brain, relayé sur tout le trajet depuis CM5 → SPI → STM32H745 → FDCAN1 → Robot Controller Board → CAN → URTC Tool Head, sans besoin de sonde JTAG/SWD ni de dongle USB-CAN (voir le propre [`docs/architecture.md` de HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC/blob/main/docs/architecture.md) pour la conception complète d'adressage/relais)

Les deux peuvent télécharger de vraies versions de firmware directement depuis GitHub (basé sur `firmware_manifest.json`, vérifié par CRC32) pour le dépôt `URTC` comme pour `HYDRA-UMC`. Comme indiqué ci-dessus, le transport lui-même s'exécute contre une simulation intégrée complète jusqu'à ce qu'un vrai firmware STM32H745 existe sur du matériel réel avec lequel communiquer.

### Support Manette

Intégration de manettes USB et Bluetooth avec mappages personnalisés par bouton/par axe, pour effectuer le jog des robots et accessoires sans souris/clavier. Les actions en temps réel (jog des articulations/de la table, E-STOP, START/STOP, vitesse de lecture) déclenchent la même voie atomique `sendRobotCommand()` que les boutons de jog du panneau de détail du robot, et non l'enregistrement des réglages avec debounce - voir `GamepadController.tsx`.

### Intégration Caméras

Jusqu'à 8 flux en direct simultanés (vision USB ou capteurs thermiques de la famille MLX90640/41/42) avec statut d'enregistrement et d'inférence - la matrice de caméras autour de laquelle est construit le propre sous-système de hub USB 3.0 double de HYDRA-UMC.

### Interface Multi-Langue

Traduction complète de l'interface en **anglais, espagnol, allemand, français, italien, chinois simplifié, japonais et portugais** (`src/locales/`), y compris le menu d'Aide de l'application avec ses guides pas à pas, l'assistant, la boîte À propos (version/auteur/licence) et chaque onglet de la boîte de Configuration Système. La couverture n'est pas encore de 100 % de chaque écran : quelques panneaux accessoires autonomes restent en anglais figé dans le code.

### Aide, guides et assistant

La fenêtre d'Aide a un onglet **Guides pas à pas** : un guide par tâche (ajouter un contrôleur, déplacer un robot, enregistrer une trajectoire, utiliser les caméras, flasher un firmware, gérer les utilisateurs, accès à distance, sécurité...), chacun avec un niveau (basique, avancé, technique), une zone de recherche et un bouton qui mène à l'écran où la tâche se fait. **Hydri**, l'assistant, est une petite mascotte animée qui flotte au-dessus du tableau de bord : il explique l'écran où vous êtes, vous guide pas à pas dans une tâche, répond aux questions tapées en mots sans serveur ni modèle d'IA (dans les 8 langues), peut lire les réponses à voix haute avec la voix du navigateur, se déplace n'importe où et s'y épingle, et s'active ou se désactive depuis la fenêtre d'Aide. Ses préférences restent dans le navigateur (`src/assistant/`).

### ℹ️ À Propos et Configuration Système

Deux boîtes de dialogue autonomes, toutes deux accessibles depuis l'en-tête (boutons `Config`/`About`) : **About** affiche la version de l'application en cours d'exécution (lue en direct depuis `GET /api/hydra-info`), l'auteur, et la licence ; **Config** couvre l'identité du serveur, la gestion des contrôleurs/nœuds, le thème d'interface + la langue, le renommage des robots, le mappage caméra↔robot avec détection de conflits, la bibliothèque d'URDF personnalisés, les intégrations logicielles tierces (backends OpenPnP/CNC/Laser), l'accès distant par client (interrupteurs indépendants pour SUITE/Android/iOS), les comptes utilisateurs, les répertoires de travail par robot, le transport CAN-OTA, et le mappage de manette - chacun dans son propre onglet. Les deux sont leurs propres composants (`src/components/About.tsx`, `src/components/Config.tsx`), non intégrés en ligne dans la coquille principale du tableau de bord.

### Fiabilité

L'app se protège contre deux classes distinctes de défaillance à l'exécution, toutes deux nées d'un véritable incident de production (un écran kiosque devenu noir après un redéploiement). `src/main.tsx` écoute l'événement propre de Vite `vite:preloadError` - émis lorsqu'un onglet de navigateur laissé ouvert à travers un redéploiement tente de récupérer un chunk de panneau chargé via `React.lazy()` (chaque panneau de `Dashboard.tsx`, avec hachage de contenu selon `vite.config.ts`) qui n'existe plus sous son ancien hash - et recharge la page une fois automatiquement, de sorte qu'un onglet kiosque de longue durée ou un onglet d'arrière-plan obsolète s'auto-répare sans que personne ne le remarque. Une protection `sessionStorage` empêche que cela ne boucle indéfiniment si un chunk est réellement manquant pour une autre raison. Séparément, `src/components/ErrorBoundary.tsx` enveloppe la zone de panneaux `<Suspense>` comme filet de sécurité pour tout autre crash de rendu ; il est indexé par l'onglet actif, donc quitter un panneau planté relance effectivement le suivant au lieu de laisser tout le tableau de bord bloqué sur un écran de secours.
Les commandes n'échouent jamais en silence : chaque commande de jog, de lecture, d'alimentation, de vision et d'outil renvoie un résultat typé, une session expirée est renouvelée une fois puis la commande est rejouée, et tout ce qui reste refusé s'affiche dans un bandeau. Le bouton rouge **STOP** est global : un clic, sans confirmation, il arrête tous les robots de tous les contrôleurs et coupe toutes les vannes et pompes en un seul appel (`POST /api/stop-all`). Il se trouve dans l'en-tête et le pied de page, dans le panneau du robot et dans la superposition de télécommande, et Ctrl+Maj+Espace l'actionne au clavier (une combinaison qu'on ne tape pas par accident, ignorée si la touche reste enfoncée). La réponse est listée robot par robot (avertissement si un robot ne s'est pas arrêté ou si le serveur n'a pas pu enregistrer l'arrêt ; les robots réservés par un autre compte sont signalés) ; une erreur réseau est retentée une fois, un serveur au-delà de sa limite (429) ou sans la route (404) reçoit l'arrêt robot par robot, et un avertissement persistant « STOP non confirmé » reste affiché jusqu'à ce qu'un STOP ultérieur reçoive une réponse. Le jog au joystick est une commande à action maintenue (elle s'arrête à l'annulation du pointeur, à la perte du focus, à l'onglet masqué ou après 8 secondes), un mouvement de J1 reste sur l'angle équivalent le plus proche et un pas de jog supérieur à 20 degrés est refusé. La manette suit le robot sélectionné dans l'interface et sa cadence est limitée. Le firmware d'une version est vérifié par son sha256 avant le flash CAN-OTA, les images de bootloader sont optionnelles et les trajectoires et scènes importées sont validées avant d'atteindre l'état partagé.

Le serveur décide, pour tous les clients, qui peut déplacer un robot et jusqu'où. Un robot peut être **réservé** pour le compte et la fenêtre (un identifiant de contrôleur choisi par fenêtre) qui le demande : le même compte depuis une autre fenêtre, ou un autre compte, est refusé avec un message qui dit lequel (`other-controller`, `other-account`, `controller-id-required`), la liste des réservations vient de `GET /api/claims` et un administrateur peut reprendre un robot. La taille d'un jog, la plage d'un jog absolu et la consigne maximale du plateau chauffant sont lues dans `GET /api/safety-limits` au lieu d'être conservées dans l'application ; un administrateur les modifie par modèle dans **Écosystème > Limites de sécurité**, avec l'armement facultatif du jog (désactivé par défaut ; activé, un bouton arme le jog pour une durée limitée) et l'identifiant de contrôleur obligatoire. Chaque robot a un interrupteur **Live / Sim** (Live par défaut) : en Sim, cette fenêtre n'envoie rien qui déplace le robot ou active quelque chose, alors que STOP passe toujours. Un Work ou un exemple dont des points sont hors de portée du bras est refusé avec la liste de ces points, et peut être adapté à la portée du modèle. La liste des réservations est aussi envoyée par le serveur sur le WebSocket (le message `claims`, pour les connexions qui ont demandé `remoteApiVersion=2`) : la barre d'accès montre un changement tout de suite au lieu d'attendre son prochain sondage, qui ne tourne plus qu'de temps en temps tant que les envois arrivent. Les écritures sont conditionnelles : chacune porte la révision du robot que cette fenêtre a vue en dernier (`If-Match`) ; si quelqu'un d'autre a modifié le robot entre-temps, le serveur répond 412, le robot est relu et le bandeau le dit (Standard vérifie les réservations, la table et les commandes ponctuelles ; Strict vérifie tout sauf STOP ; Désactivé ne vérifie rien ; STOP n'est jamais vérifié). La table XY se déplace avec la commande atomique `table`, et les administrateurs lisent le journal d'audit en ajout seul, chaîne SHA-256 vérifiée, dans **Écosystème > Journal d'audit**.

### Comptes et Accès

Chaque serveur crée un compte lors de son tout premier démarrage - identifiant `admin`, mot de passe `admin` - changez-le depuis **Config > Users** dès que le serveur est accessible au-delà d'un réseau local totalement de confiance. Ce même onglet permet à un compte admin de créer des comptes **operator** supplémentaires : un operator peut se connecter, observer l'état en direct, et piloter les robots (jog/lecture/pause/arrêt/outil/vanne/pompe/vitesse), mais ne peut pas écraser les paramètres globaux ni gérer d'autres comptes. Aucun compte n'est requis simplement pour regarder - le propre bouton "Continue read-only" de l'écran de connexion saute directement au tableau de bord avec les écritures désactivées. Contrat complet (rôles, jetons, les routes `/api/users`) documenté dans le propre [`docs/REMOTE_API.md` de HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md), sections 2a/2b. En production, le premier administrateur vient des réglages d'amorçage du déploiement et le serveur refuse les secrets d'exemple (voir [`docs/PRODUCTION_BOOTSTRAP.md` de HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/PRODUCTION_BOOTSTRAP.md)).

Chacun des 5 clients distants (SUITE, Android, iOS, Watch, DSI) s'auto-identifie via un en-tête de requête `X-Hydra-Client`, de sorte que **Config > Remote Access** peut autoriser ou bloquer chacun indépendamment plutôt qu'un seul interrupteur combiné pour les cinq.

### État Persistant

HYDRA-UMC STUDIO lui-même est un client pur - il ne conserve aucun état propre au-delà de ce qui est en mémoire pour la session en cours. Toute la persistance (`settings.json`, `users.json`, trajectoires enregistrées sous `WORKS/`, modèles envoyés) vit sur le backend séparé **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** avec lequel cette application communique sur le réseau (voir le propre `data/` et README de ce projet pour la vue d'ensemble complète) - l'état survit à un rechargement de page ou à un redéploiement de cette application, puisqu'aucun des deux ne touche le processus backend. `settings.json` lui-même est délibérément exclu du service de fichiers statiques de ce backend (il contient les IP des contrôleurs, la configuration CAN-OTA, et l'état complet par robot), même si le reste de son dossier `WORKS/` est servi normalement.

La connexion dure autant que l'onglet du navigateur : la session et son jeton de renouvellement sont conservés dans `sessionStorage`, donc fermer l'onglet y met fin. L'option de connexion **Rester connecté sur cet appareil** les conserve plutôt dans `localStorage`, au-delà d'un redémarrage du navigateur (désactivée par défaut). La page de production porte une Content-Security-Policy sous forme de balise meta (scripts uniquement issus de la page elle-même, aucun script en ligne, aucun plugin) ; `HYDRA_STUDIO_CSP=off` à la compilation l'omet, pour un déploiement qui définit lui-même l'en-tête, et toute autre valeur est utilisée comme politique.

Le même contrat `GET`/`POST /api/settings`, plus un point de terminaison de découverte (`GET /api/hydra-info`) et un `WebSocket /ws` pour les mises à jour push en direct, est aussi la façon dont les clients externes se connectent à ce même backend - c'est ce qui permet à [HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) de découvrir une instance de HYDRA-UMC SERVER active sur le réseau, de lire/modifier son état, et de voir les changements effectués depuis le propre onglet de navigateur de cette application reflétés en direct (et vice versa). Contrat complet dans le propre [`docs/REMOTE_API.md` de HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md).

`GET /api/system/metrics` alimente le pied de page du tableau de bord Overview : la charge CPU et l'utilisation mémoire sont toujours réelles (le propre module `os` de Node) ; la température lit la sortie réelle de `vcgencmd measure_temp` lors de l'exécution sur un vrai Raspberry Pi et retombe sur une valeur simulée clairement signalée sinon (`temp_is_real` dans la réponse) ; le statut Wi-Fi/Ethernet/Bluetooth est lu depuis `/sys/class/net`/`/sys/class/bluetooth` (Linux uniquement, `null`/inconnu sur tout autre hôte plutôt qu'une valeur devinée).

## 🔒 Sécurité et protection

| Menace | Défense | Où |
|---|---|---|
| Scripts injectés qui s'exécutent dans la page | Le build place une Content-Security-Policy dans la page : scripts seulement de la page (plus WebAssembly et l'hôte du décodeur 3D), pas d'objets, base et formulaires limités à la page ; `HYDRA_STUDIO_CSP` peut la désactiver ou la remplacer | `scripts/csp.ts`, `vite.config.ts` |
| Un jeton de session relu depuis le stockage | Une connexion saisie ici vit dans `sessionStorage` (elle survit à un rechargement, pas à la fermeture de l'onglet) ; `localStorage` seulement si « rester connecté » est coché. Un jeton qui arrive dans l'adresse va seulement dans `sessionStorage`, arrive dans le fragment `#token=` qu'un navigateur n'envoie jamais, et est retiré de l'adresse dès qu'il est lu | `src/lib/session.ts` |
| Deux opérateurs modifiant le même robot | Chaque robot a une révision : une écriture l'envoie avec `If-Match` et une révision périmée est refusée avec 412 ; la table se déplace de façon atomique ; réservations et droit de déplacement sont décidés par le serveur pour tous les clients | `src/lib/revisions.ts`, `src/lib/tableMove.ts`, `src/lib/robotEdits.ts` |
| Un arrêt qui attend une confirmation ou un écran lent | Le STOP rouge est global et ne demande rien : un `POST /api/stop-all` arrête chaque robot et coupe chaque vanne et pompe ; si la route est limitée ou absente, il retombe sur l'arrêt de chaque robot, et un robot qui ne s'est pas arrêté apparaît dans un bandeau | `src/lib/stopAll.ts`, `src/components/StopAll.tsx` |
| Une option d'accès abaissée par erreur (voix, MAVLink, Bluetooth, TLS...) | Server Admin montre d'où vient chaque valeur et verrouille celles que fixe l'environnement du serveur ; en abaisser une demande confirmation et, une fois enregistré, un avertissement reste affiché : une réponse vocale qui répète ce qui a été dit, une confiance du moteur de reconnaissance à 0, des messages MAVLink non signés, ou la signature MAVLink désactivée | `src/components/AdminServer.tsx`, `src/lib/serverSecurity.ts` |
| Un panneau cassé ou une page périmée après un redéploiement qui noircit l'écran | Chaque onglet est dans sa propre limite d'erreurs, et un chunk périmé après un déploiement déclenche un rechargement automatique (protégé, pour qu'un fichier vraiment absent ne boucle pas) | `src/main.tsx`, `src/components/ErrorBoundary.tsx` |

**Ce qu'il ne fait jamais :** décider de la sécurité. Il ne garde aucun état propre et n'est pas un chemin d'arrêt d'urgence matériel ; l'étage du cerveau cinématique et les outils CAN-OTA n'ont tourné que contre la simulation intégrée.

## 🔌 Interfaces

| Topic ou route | Ce qu'il porte |
|---|---|
| `/api/login`, `/api/refresh`, `/api/logout` | se connecter, renouveler le jeton une fois à l'expiration et se déconnecter |
| `/api/settings`, `/api/robot/:id`, `/api/robot/:id/command` | l'arbre d'état et les commandes typées (déplacement, lecture, outil, vanne, pompe, vision) avec `If-Match` |
| `/api/robot/:id/claim`, `/release`, `/jog-arm`, `/api/claims` | réserver un robot pour ce compte et cette fenêtre, le libérer, armer le déplacement, voir qui détient quoi |
| `/api/stop-all`, `/api/safety-limits` | l'arrêt global et les limites de sécurité que le serveur impose |
| `/ws` | poussée en direct de l'état (jeton comme sous-protocole `hydra.bearer`, `remoteApiVersion=2`) |
| `/api/camera/*`, `/api/cameras/status` | flux de caméra, instantanés, enregistrements, PTZ et le ticket d'image de courte durée |
| `/api/hardware/canota/version`, `/api/hardware/canota/flash` | la chaîne CAN-OTA utilisée par Flasher et Tester (une simulation complète tant qu'il n'y a pas de vraies cartes) |
| `/api/admin/server-config`, `/api/admin/clients`, `/api/admin/logs`, `/api/audit` | Server Admin : les interrupteurs d'accès, les applications connectées, le journal du serveur et le registre d'audit (administrateurs) |

## ⚙️ Configuration

Deux sortes de réglages : le build et le navigateur de cette application, et les interrupteurs d'accès du serveur que Server Admin modifie (l'environnement du serveur l'emporte sur ce qui est enregistré ; l'écran montre lequel s'applique et verrouille les autres).

| Variable | Par défaut | Ce qu'elle définit |
|---|---|---|
| `HYDRA_STUDIO_CSP` | `default` | à la compilation : `default`, `off` (pas de politique, pour un hôte qui fixe l'en-tête) ou une politique complète personnelle |
| `VITE_API_BASE_URL` | l'hôte de cette page sur le port 3000 | à la compilation : où se trouve le serveur quand il n'est pas sur le même hôte (voir `.env.example`) |
| `server.proxy` (`vite.config.ts`) | `localhost:3000` | serveur de développement seulement : relaie `/api`, `/ws` et `/WORKS` vers le serveur, sans configuration CORS |
| `aiAccess` | `open` | qui peut utiliser le relais d'IA local : `open` est tout compte connecté, `admin` seulement les administrateurs |
| `infoAuth` | désactivé | exiger une connexion pour les informations en lecture seule de l'hôte (métriques, superviseur de processus, état de l'écosystème) |
| `tls.enabled` | désactivé (HTTP simple) | HTTPS et WSS avec le certificat et la clé indiqués ; l'écran montre l'empreinte du certificat utilisé |
| `ble.mode` | `off` | Bluetooth LE pour les téléphones proches du serveur : `off`, `state` (publie seulement l'état) ou `commands` (accepte aussi des commandes) ; un mot inconnu signifie éteint |
| `ble.requireEncryption` | activé | la caractéristique de commande est écrite, et l'état lu, seulement sur un lien chiffré ; seul `off` dans la variable le désactive |
| `mqtt.mode` | `off` | le pont MQTT vers le broker de la cellule : `off`, `state` ou `commands`, avec son URL, son préfixe et ses utilisateurs |
| `voice.includeHeardText` | désactivé | une réponse vocale répète ce qui a été dit ; ce sont des données personnelles, donc c'est désactivé, et dans la variable seul le mot exact `1` l'active |
| `voice.minConfidence` | `0.6` | la confiance minimale du moteur de reconnaissance vocale, de 0 à 1, pour accepter une demande qui lance un mouvement ; 0 désactive le contrôle, un arrêt n'est jamais retenu, et un nombre invalide dans la variable est ignoré |
| `mavlink.signingKeyFile` | vide (pas de signature) | signature MAVLink 2 de la passerelle UAV : le chemin d'un fichier avec la clé de 32 octets (32 octets bruts ou 64 caractères hexadécimaux) ; seul le chemin est enregistré, jamais la clé, et la passerelle le lit au démarrage |
| `mavlink.signingAllowUnsigned` | désactivé | continuer à accepter les messages non signés (un véhicule qui ne signe pas encore) ; l'écran avertit tant que c'est activé |

## 🚀 Démarrage rapide

Nécessite Node.js 22 ou plus récent avec npm, et un HYDRA-UMC-SERVER en marche (port 3000) : STUDIO est un client pur et n'a personne à qui parler sans lui.

```bash
npm install
./dev.sh                           # Vite dev server on port 5173, proxying /api, /ws and /WORKS to the server on port 3000 (dev.bat on Windows)
npm test                           # the Vitest suite
npm run typecheck && npm run lint  # types and lint
./build.sh                         # production build into dist/ (build.bat on Windows)
```

## 🧪 Tests

637 tests automatiques s'exécutent avec `npm test`. Ils n'ont besoin ni de matériel ni de rien en dehors de cette machine.

La CI exécute `HYDRA_UMC_CI=1 python tools/ci_validate.py`, qui vérifie le manifeste, les documents, les huit README et les images.

## 🏗️ Compilation et publication

### Prérequis
- [Node.js](https://nodejs.org/) (v22 ou supérieur)
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

### Tests Automatisés

```bash
npm test          # vitest run - 637 vrais tests sur src/examples/
npm run typecheck # tsc -b --noEmit (src/) + tsc -p tsconfig.test.json --noEmit (tests/)
```

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

`bump_manifest_version.py` (racine du dépôt) est le seul propriétaire à la fois de `hydra-umc.project.json` et du champ `version` de `package.json` - `npm run build` (`vite build`) est délibérément compilation-uniquement afin de ne jamais pouvoir créer de désynchronisation entre les deux en incrémentant l'un sans l'autre. `scripts/bump-version.mjs` est un ancien assistant natif conservé pour référence ; rien dans ce dépôt ne l'appelle plus. Le schéma lui-même reste le « compteur kilométrique » en base 10 de tout l'écosystème : patch +1 à chaque incrément réel, avec report vers minor (et de minor vers major) au-delà de 9, plutôt que d'atteindre un jour un segment à deux chiffres (`0.0.9` -> `0.1.0`, pas `0.0.10`). La version en cours est visible en direct dans la boîte de dialogue **About** (la version de Studio est lue dans le propre `package.json` de cette application ; la version du serveur affichée à côté vient de `GET /api/hydra-info`), et l'historique complet se trouve dans [`CHANGELOG.md`](CHANGELOG.md).

## 🩺 Dépannage

| Vous voyez | Parce que | Faites |
|---|---|---|
| La connexion échoue, ou chaque appel dit que le serveur est injoignable | Le serveur ne tourne pas, ou la page le cherche sur le mauvais hôte | Lancez HYDRA-UMC-SERVER (port 3000 en développement) ou construisez avec `VITE_API_BASE_URL` |
| Un déplacement ou une commande est refusé parce qu'un autre compte ou une autre fenêtre détient le robot | Le serveur réserve un robot pour le compte et la fenêtre qui l'ont demandé d'abord ; le déplacement doit aussi être armé | Libérez-le depuis la barre d'accès du robot, ou attendez ; un administrateur voit qui le détient |
| Un enregistrement est refusé avec 412 | Un autre client a modifié le robot après votre chargement, votre révision est périmée | Rechargez le robot et refaites la modification |
| Un interrupteur de Server Admin est grisé | La valeur vient de l'environnement du serveur, qui l'emporte sur ce qui est enregistré | Changez la variable du serveur et redémarrez-le ; l'écran indique l'origine de chaque valeur |
| La page est blanche après un redéploiement du serveur | L'onglet ouvert pointe encore vers des chunks qui n'existent plus | La page se recharge une fois d'elle-même ; si elle reste blanche, rechargez à la main et reconstruisez si un fichier manque vraiment |

## 📂 Structure du dépôt

<p align="center">
  <img src="images/repository-structure.svg" alt="Repository structure of HYDRA-UMC-STUDIO" width="100%">
</p>

<details>
<summary>Version texte de l'arborescence</summary>

```text
HYDRA-UMC-STUDIO/
├── src/                             code source
│   ├── App.tsx                      Le routeur et la mise en page, le point d'entrée et le fournisseur de l'état global
│   ├── Dashboard.tsx                Coquille principale de l'application - navigation, panneau Overview, métriques système en pied de page
│   ├── store.ts                     État global : RobotModel/RobotState/HydraController/SystemSettings -
│   ├── motionSource.ts              Ce que représente la pose dessinée (commandée ou suivie par la machine) et le noyau pur de transition d'état de sendRobotCommand()
│   ├── i18n.ts                      Configuration react-i18next - charge src/locales/*.json
│   ├── hooks/                       usePartColors.ts : couleurs par pièce enregistrées par HYDRA-UMC-EDITOR-STL
│   ├── assets/                      L'icône, l'écran de démarrage et les images de l'app, et les styles globaux
│   ├── assistant/                   Hydri, l'assistant : moteur de réponses, base de connaissances (8 langues), mascotte, préférences
│   ├── components/                  les écrans et panneaux : détail du robot, scène 3D, administration, outils CAN-OTA
│   ├── examples/                    cinématique directe et inverse des 24 vrais modèles de robots
│   ├── lib/canOta.ts                Couche de simulation/protocole CAN-OTA, téléchargement de firmware depuis GitHub
│   ├── lib/apiBase.ts               Résolution de l'URL du backend - relative+proxifiée en dev, VITE_API_BASE_URL en prod
│   ├── lib/mediaTicket.ts           Tickets de courte durée pour les images des caméras
│   ├── lib/claims.ts                Réservations, identifiant de contrôleur, limites de sécurité lues du serveur, mode Live/Sim
│   ├── lib/revisions.ts             Révision de chaque robot (If-Match, 412), déplacement atomique de la table, journal d'audit et vérification de sa chaîne
│   ├── lib/session.ts               Jetons de session, options d'accès du serveur, textes d'erreur pour l'opérateur, qui peut enregistrer les réglages, SHA-256 sans crypto.subtle
│   ├── lib/stopAll.ts               Le STOP global, la réponse à une commande de robot, les modifications d'un robot comme commandes, le robot sélectionné, la numérotation des pas de lecture, l'avertissement des trajectoires inatteignables, où l'outil se place sur la bride, angles par le plus court chemin
│   ├── lib/claimsFeed.ts            La liste en direct des réservations, contrôles avant l'import d'un fichier, limitation des entrées maintenues, répétition d'un bouton de jog maintenu, règles clavier des dialogues, l'analyseur des enregistrements MJPEG, le catalogue des modèles soumis par les éditeurs
│   └── locales/                     Fichiers de traduction en/es/de/fr/it/ja/zh/pt (react-i18next)
├── docs/                            guides des modèles de table à vide, lit chauffant, rack et machines
├── public/                          modèles 3D : robots, racks, lits chauffants, tables à vide, machines (STL et OpenSCAD)
├── images/                          Bannière du README
├── tests/                           Vraie suite Vitest (610 tests) - uniquement les maths FK/IK de src/examples/, sans React/DOM
├── tools/                           outils du projet et vérifications de la CI
├── scripts/                         bump-version.mjs (montée de version explicite) et csp.ts (la politique de sécurité du contenu de la page compilée)
├── .github/                         workflow de CI et modèles de tickets
├── index.html                       La page à partir de laquelle Vite construit l'app (la politique de sécurité du contenu est insérée à la compilation)
├── example_trajectory.json          Trajectoire d'exemple autonome (séquence d'angles articulaires, données d'exemple)
├── metadata.json                    Nom/description de l'app (utilisé par la plateforme d'hébergement)
├── bump_manifest_version.py         Synchronise la version de hydra-umc.project.json avec la version native (--sync)
├── build.sh / build.bat             Installe les dépendances + build de production
├── build-test.sh / build-test.bat   Contrôle build/compilation sans gestion de version
├── dev.sh / dev.bat                 Installe les dépendances + démarre le serveur de dev Vite
├── vitest.config.ts                 Configuration Vitest (tests/ uniquement, vrai environnement node - pas besoin de DOM)
├── tsconfig.test.json               Projet de verification de types autonome pour tests/ (separe des references app/node)
├── .env.example                     Modèle de VITE_API_BASE_URL - voir src/lib/apiBase.ts
├── CHANGELOG.md                     ce qui a changé à chaque version
├── hydra-umc.project.json           manifeste : version, maturité, famille
├── package.json                     métadonnées et scripts du paquet
└── test.sh                          lance les tests
```

</details>

## 🗺️ Feuille de route et limites connues

**Limites connues aujourd'hui**

* La chaîne CAN-OTA (Flasher et Tester) et l'étage du cerveau cinématique n'ont tourné que contre la simulation intégrée : aucune carte contrôleur HYDRA-UMC n'existe encore à flasher ou tester.
* Les tailles de table, de lit chauffant et de rack sont des réglages visuels, pas un étalonnage du robot ni une conception électrique ou de fabrication.
* L'ARRÊT passe par le serveur ; il n'y a ni arrêt d'urgence sans fil ni chemin d'arrêt matériel.
* Tout ce qui déplace un robot est décidé par le serveur (rôles, limites, réservations) ; cette application ne peut pas sécuriser un mouvement à elle seule.

**Ensuite :** chaque nouveauté de cette application est portée vers HYDRA-UMC-SUITE, et les outils CAN-OTA attendent les premières vraies cartes.

## 🌍 Langues

Ce README et les documents du dépôt existent en huit langues : anglais, espagnol, allemand, français, italien, japonais, chinois et portugais (Portugal). Ils sont écrits ensemble et la CI vérifie que les huit fichiers ont les mêmes sections et les mêmes liens.

## 🔗 Projets liés

Ce projet fait partie de l'écosystème robotique HYDRA-UMC du même auteur (JuanenRac / Electro Hobby 3D). Bon à savoir, car une demande pourrait en réalité concerner l'un de ceux-ci plutôt que ce dépôt.

**Projet Parent**
- **[HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** — le vrai backend headless (REST/WebSocket) auquel parle réellement chaque client de contrôle ; ce tableau de bord en est un client frontend pur, sans code backend propre.

**Projets Frères** — parlent également à la propre API de HYDRA-UMC-SERVER, chacun en tant que son propre client
- **[HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)** — centre de commande d'essaim de bureau (PySide6) pour plusieurs serveurs à la fois, empaqueté en exécutable autonome.
- **[HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL)** — application de contrôle Android native avec connexion biométrique et un compagnon Wear OS jumelé.
- **[HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL)** — application de contrôle iOS/iPadOS (Flutter) avec synchronisation WebSocket en temps réel.
- **[HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)** — interface tactile native pour l'écran tactile DSI 7" embarqué, intégrée directement sur le CM5.
- **[HYDRA-UMC-BRIDGE-AMR](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-AMR)** — frontière de coordination pour les flottes AGV/AMR via un éditeur MQTT VDA 5050 (testé uniquement contre une flotte émulée).
- **[HYDRA-UMC-BRIDGE-CNC](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-CNC)** — coordinateur haut niveau pour cellules CNC avec accès au statut/octets de contrôle GRBL (testé uniquement contre un émulateur).
- **[HYDRA-UMC-BRIDGE-DROIDS](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-DROIDS)** — frontière de coordination pour droïdes à pattes/humanoïdes, avec un émetteur de commandes Boston Dynamics Spot (testé uniquement contre un émulateur).
- **[HYDRA-UMC-BRIDGE-LASER](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-LASER)** — coordinateur de cellules laser lisant 3 signaux GPIO de clé/enceinte/verrouillage (testé uniquement contre une puce simulée ; il ne peut ni armer ni tirer un laser).
- **[HYDRA-UMC-BRIDGE-OPENPNP](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-OPENPNP)** — coordinateur haut niveau sûr pour le flux de cartes du pick-and-place OpenPnP.
- **[HYDRA-UMC-BRIDGE-PRINTER3D](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-PRINTER3D)** — frontière de coordination sûre pour imprimantes 3D Moonraker/Klipper, avec de vraies commandes de tâche contrôlées.
- **[HYDRA-UMC-BRIDGE-ROS2](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-ROS2)** — coordinateur avec un transport ROS 2 rclpy à importation paresseuse (pas encore exécuté contre une installation ROS 2).
- **[HYDRA-UMC-BRIDGE-UAV](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-UAV)** — frontière de coordination pour UAV équipés de caméra, avec un émetteur de commandes MAVLink (testé uniquement contre un émulateur).

**Projets Enfants**
- **[HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF)** — créateur/éditeur graphique de bureau pour URDF qui envoie les modèles terminés vers le propre catalogue de ce tableau de bord via `POST /api/models/submit`.
- **[HYDRA-UMC-EDITOR-STL](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-STL)** — éditeur de bureau de modèles STL pour la propre bibliothèque `public/models/` de ce tableau de bord (et le miroir qu'en tient HYDRA-UMC-SUITE) - transforme/remplace/retire/ajoute de vraies pièces, sans jamais rien supprimer définitivement.

**Directement Liés**
- **[HYDRA-UMC-DASHBOARD-AI](https://github.com/JuanenRac/HYDRA-UMC-DASHBOARD-AI)** — panneaux Smart Summaries et Anomaly Highlighting sur DATALAKE/ANOMALY-DETECTOR, avec un repli statistique honnête ; étend ce même tableau de bord avec des synthèses statistiques (pas encore de modèle de langage).
- **[HYDRA-UMC-COGNITIVE-NODE](https://github.com/JuanenRac/HYDRA-UMC-COGNITIVE-NODE)** — hub d'intégration pour le pipeline cognitif Hailo-10 (orchestration LLM/VLA/voix) ; ajoute un contrôle vocal/langage naturel sur ce tableau de bord.
- **[HYDRA-UMC-VOICE-UI](https://github.com/JuanenRac/HYDRA-UMC-VOICE-UI)** — vrai front-end vocal (VAD + analyseur d'intention) avec un relais Watch borné et soumis à confirmation ; ajoute un contrôle vocal/langage naturel sur ce tableau de bord.
- **[HYDRA-UMC-LOCAL-TECHNICIAN](https://github.com/JuanenRac/HYDRA-UMC-LOCAL-TECHNICIAN)** — technicien de maintenance IA local et à portes de politique pour l'écosystème lui-même - observe, diagnostique et propose des corrections ; les deux niveaux de risque les plus élevés ne sont délibérément pas encore implémentés.
- **[HYDRA-UMC-TWIN](https://github.com/JuanenRac/HYDRA-UMC-TWIN)** — hub d'intégration pour le moteur de jumeau numérique, avec un vrai contrat de synchronisation par compatibilité de version ; permet de prévisualiser sur le jumeau numérique avant de toucher le robot réel, directement depuis ce tableau de bord.
- **[HYDRA-UMC-HIL-BRIDGE](https://github.com/JuanenRac/HYDRA-UMC-HIL-BRIDGE)** — routeur hardware-in-the-loop avec un verrouillage logiciel de collision entre simulation et matériel réel (testé sans matériel réel) ; permet de prévisualiser sur le jumeau numérique avant de toucher le robot réel, directement depuis ce tableau de bord.

**Fait Également Partie de l'Écosystème**

*Matériel & Plateforme de Base*
- **[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)** — la conception de la carte mère du bras robotique : hôte CM5 + coprocesseur STM32H745 double cœur, destinée à coordonner jusqu'à 8 bras-outils via CAN-OTA/SPI-OTA (firmware à un stade précoce ; aucune carte assemblée pour l'instant).
- **[HYDRA-UMC-OS](https://github.com/JuanenRac/HYDRA-UMC-OS)** — couche produit reproductible sur Raspberry Pi OS pour le CM5 : agent en lecture seule, config/profils validés, provisionnement WiFi de premier contact.
- **[HYDRA-UMC-SDK](https://github.com/JuanenRac/HYDRA-UMC-SDK)** — le contrat JSON-Schema partagé et la barrière logicielle de contrôle des jobs contre laquelle chaque bridge valide ses commandes (pas une fonction de sécurité certifiée).
- **[HYDRA-UMC-CONNECTOR-HUB](https://github.com/JuanenRac/HYDRA-UMC-CONNECTOR-HUB)** — registre déclaratif et validateur de manifestes d'adaptateur pour les connecteurs de machines externes ; étend la propre idée de contrat du SDK aux machines externes sans remplacer les projets de passerelle industrielle.

*Plateforme d'Outils URTC*
- **[URTC](https://github.com/JuanenRac/URTC)** — firmware pour la carte physique Universal Robot Tool Controller, plus de 25 profils d'outil sur bus CAN.
- **[URTC-FLASHER](https://github.com/JuanenRac/URTC-FLASHER)** — outil de bureau à interface graphique pour flasher les cartes URTC, CAN-OTA plus SWD/JTAG puce complète.
- **[URTC-TESTER](https://github.com/JuanenRac/URTC-TESTER)** — outil de bureau de diagnostic CAN-bus en direct pour cartes URTC, un panneau par profil d'outil.
- **[URTC-WEB-STUDIO](https://github.com/JuanenRac/URTC-WEB-STUDIO)** — alternative basée navigateur à URTC-TESTER via la Web Serial API, sans installation locale.
- **[URTC-GATEWAY](https://github.com/JuanenRac/URTC-GATEWAY)** — passerelle devant le bus CAN d'URTC : liste d'identifiants autorisés, limite de débit et clé de session ; logiciel testé sur ordinateur, pas encore sur un bus réel.

*Nœud IA de Vision (Hailo-8)*
- **[HYDRA-UMC-VISION-NODE](https://github.com/JuanenRac/HYDRA-UMC-VISION-NODE)** — hub d'intégration pour le pipeline de vision Hailo-8, avec une vraie vérification de disponibilité matérielle par étape.
- **[HYDRA-UMC-DETECTION-HEF](https://github.com/JuanenRac/HYDRA-UMC-DETECTION-HEF)** — registre réel de modèles compilés avec vérification de chargement sécurisé par architecture Hailo/checksum.
- **[HYDRA-UMC-VISION-STREAMER](https://github.com/JuanenRac/HYDRA-UMC-VISION-STREAMER)** — générateur réel de pipeline GStreamer + config MediaMTX, avec une vraie frontière d'intégration HailoRT.
- **[HYDRA-UMC-VISUAL-SERVOING-API](https://github.com/JuanenRac/HYDRA-UMC-VISUAL-SERVOING-API)** — loi de correction Position-Based Visual Servoing avec autorisation conditionnée à l'état de zone ; pas encore d'estimation de pose par caméra.
- **[HYDRA-UMC-SAFETY-ZONES](https://github.com/JuanenRac/HYDRA-UMC-SAFETY-ZONES)** — logique v0 de violation de zone, de fraîcheur de calibration et de demande d'E-STOP qui lit les positions d'objets dans un fichier ; aucun détecteur ne l'alimente et aucun E-STOP physique n'y est encore relié.

*Nœud IA Cognitif (Hailo-10)*
- **[HYDRA-UMC-VLA-ENGINE](https://github.com/JuanenRac/HYDRA-UMC-VLA-ENGINE)** — vrai encodage/décodage de jetons d'action et génération de trajectoire pour un modèle Vision-Language-Action.
- **[HYDRA-UMC-SEMANTIC-PLANNER](https://github.com/JuanenRac/HYDRA-UMC-SEMANTIC-PLANNER)** — vraie décomposition de tâches basée sur des règles et récupération sémantique d'erreurs sur les codes d'erreur MCU.
- **[HYDRA-UMC-DOCS-QA](https://github.com/JuanenRac/HYDRA-UMC-DOCS-QA)** — vraie recherche documentaire TF-IDF (bibliothèque standard uniquement) sur les propres documents Markdown de cet écosystème.

*Orchestration & Essaim*
- **[HYDRA-UMC-ORCHESTRATOR](https://github.com/JuanenRac/HYDRA-UMC-ORCHESTRATOR)** — hub d'intégration avec un vrai contrat de rapport de santé gRPC/Protobuf et une machine à états de mission.
- **[HYDRA-UMC-JOB-DISPATCHER](https://github.com/JuanenRac/HYDRA-UMC-JOB-DISPATCHER)** — vraie file de tâches basée sur la priorité avec déduplication, via une vraie API HTTP.
- **[HYDRA-UMC-NODE-HEALING](https://github.com/JuanenRac/HYDRA-UMC-NODE-HEALING)** — vrai chien de garde de santé de flotte basé sur gRPC, avec retry/backoff et détection d'incohérence d'identité.
- **[HYDRA-UMC-PATH-PLANNER-3D](https://github.com/JuanenRac/HYDRA-UMC-PATH-PLANNER-3D)** — vrai planificateur de trajectoire 3D basé sur RRT, avec vraie validation des collisions obstacle/espace de travail.
- **[HYDRA-UMC-SWARM-SYNC](https://github.com/JuanenRac/HYDRA-UMC-SWARM-SYNC)** — vraie synchronisation d'état CRDT LWW-Element-Map, testée par propriétés pour la convergence multi-cellule.

*Jumeau Numérique & Simulation*
- **[HYDRA-UMC-PHYSICS-REPLICA](https://github.com/JuanenRac/HYDRA-UMC-PHYSICS-REPLICA)** — vraie cinématique directe et validation des limites articulaires sur un vrai sous-ensemble URDF.
- **[HYDRA-UMC-SYNTHETIC-DATA-GEN](https://github.com/JuanenRac/HYDRA-UMC-SYNTHETIC-DATA-GEN)** — vrai générateur procédural de scènes 2D avec export d'annotations YOLO/COCO.

*Données & Analytique*
- **[HYDRA-UMC-DATALAKE](https://github.com/JuanenRac/HYDRA-UMC-DATALAKE)** — vrai magasin de séries temporelles basé sur sqlite3, avec une vraie API HTTP d'ingestion/requête.
- **[HYDRA-UMC-ANOMALY-DETECTOR](https://github.com/JuanenRac/HYDRA-UMC-ANOMALY-DETECTOR)** — vrai détecteur d'anomalies FFT + ligne de base statistique, avec surveillance de dérive.
- **[HYDRA-UMC-PRODUCTION-REPORTS](https://github.com/JuanenRac/HYDRA-UMC-PRODUCTION-REPORTS)** — vrai calcul OEE/disponibilité sur l'historique de DATALAKE, avec export CSV reproductible.
- **[HYDRA-UMC-TELEMETRY-COLLECTOR](https://github.com/JuanenRac/HYDRA-UMC-TELEMETRY-COLLECTOR)** — vrai pipeline d'ingestion CAN/WebSocket vers DATALAKE, avec déduplication par séquence.

*Passerelle Industrielle*
- **[HYDRA-UMC-GATEWAY-INDUSTRIAL](https://github.com/JuanenRac/HYDRA-UMC-GATEWAY-INDUSTRIAL)** — hub d'intégration relayant vers les protocoles industriels, avec une vraie couche de liste blanche de commandes/contre-pression.
- **[HYDRA-UMC-OPCUA-SERVER](https://github.com/JuanenRac/HYDRA-UMC-OPCUA-SERVER)** — vrai espace d'adressage OPC-UA, vérifié avec une vraie session client du protocole binaire.
- **[HYDRA-UMC-MQTT-BROKER](https://github.com/JuanenRac/HYDRA-UMC-MQTT-BROKER)** — vrai broker MQTT avec authentification par client optionnelle et ACL de sujets.
- **[HYDRA-UMC-MTCONNECT-ADAPTER](https://github.com/JuanenRac/HYDRA-UMC-MTCONNECT-ADAPTER)** — vrais points de terminaison XML MTConnect `/probe` et `/current`, avec sortie en mode dégradé.

*Outils Complémentaires & Opérations de l'Écosystème*
- **[HYDRA-UMC-TOOL-CLI](https://github.com/JuanenRac/HYDRA-UMC-TOOL-CLI)** — CLI de flotte avec un vrai contrat de codes de sortie stable, un vrai client en direct de la propre API de HYDRA-UMC-SERVER.
- **[HYDRA-UMC-WATCH](https://github.com/JuanenRac/HYDRA-UMC-WATCH)** — application compagnon WearOS avec des motifs d'alerte haptique et un relais vocal vers le téléphone jumelé (pas encore exécutée sur une montre physique).
- **[URTC-SMART-RACK](https://github.com/JuanenRac/URTC-SMART-RACK)** — firmware pour un rack de montage de cartes avec décodage réel d'ID d'outil et logique de préchauffage Smart Idle.
- **[URTC-VISION-TOOL](https://github.com/JuanenRac/URTC-VISION-TOOL)** — firmware plus un vrai compagnon de vision Python pour une tête d'outil d'inspection thermique/RGB.
- **[HYDRA-UMC-UPDATER](https://github.com/JuanenRac/HYDRA-UMC-UPDATER)** — outil administratif de bureau qui découvre, clone et met à jour chaque dépôt de cet écosystème.
- **[HYDRA-UMC-OS-REBUILDER](https://github.com/JuanenRac/HYDRA-UMC-OS-REBUILDER)** — outil de bureau Windows/Linux qui construit une image de la CM5 prête à graver, préchargée avec les versions les plus actuelles de l'écosystème, avec une configuration de premier démarrage Wi-Fi/utilisateur/SSH façon Raspberry Pi Imager.
- **[HYDRA-UMC-OPS-AGENT](https://github.com/JuanenRac/HYDRA-UMC-OPS-AGENT)** — coordinateur d'incidents de maintenance : un rôle edge à faible privilège collecte un instantané d'inventaire/santé assaini, un rôle control-plane le rend en lecture seule et demande à un fournisseur d'IA de suggérer un diagnostic - n'applique jamais de correctif ni ne déploie rien.
- **[HYDRA-UMC-DEV-SERVER](https://github.com/JuanenRac/HYDRA-UMC-DEV-SERVER)** — hôte de développement reproductible (Raspberry Pi 5 / CM5) qui héberge le code source de l'écosystème et exécute des tâches de compilation/test délimitées via une file d'attente durable ; un rôle de développement dédié, explicitement distinct d'un CM5 opérationnel.

Dans l'ensemble, l'écosystème de cet auteur couvre bien plus de projets que celui-ci - ce qui précède est une carte, pas une liste exhaustive de fonctionnalités ; consultez le propre README de chaque dépôt pour savoir ce qu'il fait réellement aujourd'hui.

## 📚 Documentation

Où lire la suite :

* [Base de sécurité de l'écosystème](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md)
* [Modèle de menaces de l'écosystème](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md)
* [Journal des modifications de ce dépôt](CHANGELOG.md)
* [Licence de ce dépôt](LICENSE.md)

## 🤝 Contribuer et communauté

* Avant une pull request, exécutez `HYDRA_UMC_CI=1 py -3 tools/ci_validate.py` (ou `HYDRA_UMC_CI=1 python3 tools/ci_validate.py`) : il doit afficher `CI_VALIDATION=PASS`. N'exécutez pas `build.sh` ni `build.bat` pour cette vérification ; compiler n'est pas vérifier.
* Les huit README sont écrits à partir d'une source unique dans HYDRA-UMC-DOCS ; ne les modifiez pas à la main. Changez la source et réécrivez-les avec `tools/make_readmes.py`.
* N'affirmez pas dans un README ce qui n'a pas tourné : écrivez « simulé » ou « non essayé sur matériel » quand c'est la vérité.
* Voir [CONTRIBUTING.md](CONTRIBUTING.md), le [code de conduite](CODE_OF_CONDUCT.md), [SECURITY.md](SECURITY.md) et [SUPPORT.md](SUPPORT.md).

## 👤 AUTEUR

**JuanenRac (Electro Hobby 3D)** · electrohobby3d@gmail.com

## 📜 LICENCE

GPL-3.0-or-later - [LICENSE](LICENSE).
