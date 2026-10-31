<!-- =============================================================================
HYDRA-UMC-STUDIO - Web control dashboard of the HYDRA-UMC multi-robot micro-factory
Copyright (C) JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
GPL-3.0-or-later - see LICENSE
============================================================================= -->

<p align="center">
  <img src="images/HYDRA_UMC_BANNER.svg" alt="HYDRA-UMC-STUDIO banner" width="100%">
</p>

# 🤖 HYDRA-UMC-STUDIO

<p align="center"><a href="README.md">🇺🇸 English</a> | 🇪🇸 <b>Español</b> | <a href="README_fra.md">🇫🇷 Français</a> | <a href="README_ita.md">🇮🇹 Italiano</a> | <a href="README_deu.md">🇩🇪 Deutsch</a> | <a href="README_zho.md">🇨🇳 简体中文</a> | <a href="README_jpn.md">🇯🇵 日本語</a> | <a href="README_por.md">🇵🇹 Português</a></p>

### 🤖 Panel de Control Web para la Micro-Fábrica Multi-Robot HYDRA-UMC

<p align="center">
  <img src="https://img.shields.io/badge/License-GPL%203.0--or--later-blue.svg" alt="GPL 3.0 or later">
  <img src="https://img.shields.io/badge/Framework-React%2019-61DAFB.svg" alt="Framework">
  <img src="https://img.shields.io/badge/Tool-Vite-646CFF.svg" alt="Tool">
  <img src="https://img.shields.io/badge/3D-Three.js-black.svg" alt="3D">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6.svg" alt="Language">
  <img src="https://img.shields.io/badge/Tests-664%20passing-2ea44f.svg" alt="Tests">
  <img src="https://img.shields.io/badge/Version-0.8.0.5-0f6cbd.svg" alt="Version">
  <img src="https://img.shields.io/badge/Maturity-functional-0F6CBD.svg" alt="Maturity">
</p>

---

> **Estado de seguridad física y de ciberseguridad:** este ecosistema no es un sistema de seguridad certificado. Todavía no existe una ruta de E-STOP por hardware, ni límites ni enclavamientos aplicados por el firmware, ni un comando de movimiento verificado; las imágenes de firmware se comprueban con CRC-32 y una firma Ed25519, y una compilación de versión rechaza las claves de desarrollo publicadas (los cabezales de herramienta y las placas de expansión detrás del relé siguen con cargadores de URTC, que usan un HMAC-SHA256 de clave compartida en lugar de una firma); TLS y TLS mutuo son opcionales y están desactivados por defecto; aún no se ha poblado ni probado ninguna placa propia. Lee la [línea base de seguridad](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md) y el [modelo de amenazas](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md) antes de fiarte de cualquier afirmación de aquí para la seguridad de una persona.

---

## 📋 De un vistazo

| | |
|---|---|
| Versión | `0.8.0.5` |
| Madurez | Funcional |
| Tests | 664 (`npm test`) |
| Tecnología | React 19 / Vite / Three.js / Tailwind CSS |
| Destino | La Raspberry Pi CM5 de una celda HYDRA-UMC |
| En hardware real | Ejecutado en un banco de pruebas: la comprobación de honestidad de arriba dice qué partes funcionaron en hardware real |

**Ir a:** [Resumen](#-resumen) · [Arquitectura](#-arquitectura) · [Funciones](#-funciones) · [Seguridad y protección](#-seguridad-y-protección) · [Interfaces](#-interfaces) · [Configuración](#-configuración) · [Inicio rápido](#-inicio-rápido) · [Pruebas](#-pruebas) · [Resolución de problemas](#-resolución-de-problemas) · [Estructura del repositorio](#-estructura-del-repositorio) · [Proyectos relacionados](#-proyectos-relacionados)

## 🚦 Estado del proyecto

Cada línea es una parte de este repositorio y la luz dice hasta dónde llega hoy. Se escribe con lo que el repositorio puede demostrar (pruebas, compilaciones, ejecuciones), no con lo previsto.

🟢 Hecho y verificado · 🟡 Funciona, con límites conocidos · 🟠 Hecho a medias o sin verificar · 🔴 Sin hacer o sin funcionar

| Área | Estado | Qué significa aquí |
|---|---|---|
| Software | 🟡 | Funciona para su propósito principal; la comprobación de honestidad de arriba lista lo que aún falta |
| Pruebas | 🟢 | 664 pruebas automáticas, ejecutadas en cada cambio |
| Hardware real | 🟡 | Ejecutado en un banco de pruebas: la comprobación de honestidad de arriba dice qué partes funcionaron en hardware real |
| Documentación | 🟢 | README en ocho idiomas, comprobado contra el manifiesto en cada cambio |

## 🎯 Resumen

**HYDRA-UMC STUDIO** es el panel de control basado en navegador para [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) - la placa madre de la micro-fábrica multi-robot (host Raspberry Pi CM5 + coprocesador de tiempo real STM32H745 de doble núcleo) que orquesta hasta 8 brazos robóticos distribuidos sobre un único bus FDCAN. Mientras que el propio repositorio de HYDRA-UMC cubre el hardware y el firmware, este repositorio es la parte orientada al humano: una aplicación React de una sola página que visualiza cada robot en 3D real, jogea y graba su movimiento, gestiona las máquinas y accesorios que acompañan a una célula robótica, y flashea/prueba toda la cadena de firmware CAN-OTA - todo desde una sola pestaña del navegador, sin necesidad de instalación nativa más allá de Node.js.

**Nota de honestidad, siguiendo la misma convención de documentación que el resto de este ecosistema:** el propio hardware real de HYDRA-UMC todavía no existe como silicio probado (sus bootloaders compilan limpio pero no se han ejecutado en placas reales - ver el propio `docs/architecture.md` de ese repositorio). Por eso este panel ejecuta sus herramientas de Flasher/Tester CAN-OTA contra una simulación completa incorporada que sigue el esquema de direccionamiento real y documentado de cada nivel, en vez de fingir hablar con un hardware que no existe. La visualización 3D de los robots, la cinemática, la grabación de trayectorias, y cada panel de control de accesorios son completamente reales e independientes de eso - solo el transporte CAN-OTA en sí está simulado por ahora.

Construido con **React 19**, **Vite**, **Three.js** (vía `@react-three/fiber`/`@react-three/drei`), y **TypeScript** - un cliente puro sin código de backend propio. El estado persistente vive en el backend separado **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** con el que esta app habla por red.

## 🧩 Papel en HYDRA-UMC

**HYDRA-UMC-STUDIO** es el panel web de control de la celda: dibuja cada robot en 3D con su cinemática real, mueve y graba trayectorias, maneja los paneles de accesorios y máquinas, flashea y prueba firmware por la cadena CAN-OTA y administra el servidor, en ocho idiomas. No guarda estado propio y no decide nada de seguridad: los roles, los límites, las reservas y la parada los decide HYDRA-UMC-SERVER.

## 🏛️ Arquitectura

<p align="center">
  <img src="images/architecture.svg" alt="HYDRA-UMC-STUDIO architecture" width="100%">
</p>

## 🖼️ Capturas de pantalla

Capturadas a 1920×1080 en un banco de pruebas, con datos de ejemplo y sin ninguna instalación real detrás.

<table>
<tr><td width="50%" valign="top"><img src="images/screenshots/overview.png" alt="Resumen: los ocho nodos robot de la microfábrica con su función, modelo y herramienta, y el estado de la máquina en la barra inferior." width="100%"><br><sub>Resumen: los ocho nodos robot de la microfábrica con su función, modelo y herramienta, y el estado de la máquina en la barra inferior.</sub></td><td width="50%" valign="top"><img src="images/screenshots/robot-view.png" alt="Vista de robot: controles de articulaciones, jog XYZ, el modelo 3D del brazo y el panel de trayectorias con los puntos grabados." width="100%"><br><sub>Vista de robot: controles de articulaciones, jog XYZ, el modelo 3D del brazo y el panel de trayectorias con los puntos grabados.</sub></td></tr>
<tr><td width="50%" valign="top"><img src="images/screenshots/xy-table.png" alt="Mesa XY: el tamaño de la mesa, los botones de jog con su paso y la vista 3D en vivo de los ejes." width="100%"><br><sub>Mesa XY: el tamaño de la mesa, los botones de jog con su paso y la vista 3D en vivo de los ejes.</sub></td><td width="50%" valign="top"><img src="images/screenshots/flasher-studio.png" alt="Flasher Studio: elige la placa y la ranura del robot, escoge un fichero de firmware y flashéalo por CAN; aquí en simulación, así que no se envía nada a ninguna placa." width="100%"><br><sub>Flasher Studio: elige la placa y la ranura del robot, escoge un fichero de firmware y flashéalo por CAN; aquí en simulación, así que no se envía nada a ninguna placa.</sub></td></tr>
<tr><td width="50%" valign="top"><img src="images/screenshots/tester-center.png" alt="Tester Center: el LED de estado, la comprobación de persistencia, la telemetría de la herramienta, el autotest y el monitor de bus en bruto de una placa." width="100%"><br><sub>Tester Center: el LED de estado, la comprobación de persistencia, la telemetría de la herramienta, el autotest y el monitor de bus en bruto de una placa.</sub></td><td width="50%" valign="top"><img src="images/screenshots/safety-limits.png" alt="Límites de seguridad: armado del jog, regla de reservas y los techos de jog y de temperatura de cama por modelo de robot, guardados en el servidor." width="100%"><br><sub>Límites de seguridad: armado del jog, regla de reservas y los techos de jog y de temperatura de cama por modelo de robot, guardados en el servidor.</sub></td></tr>
</table>

## ✨ Funciones

### Control 3D Multi-Robot

Gestiona varios robots independientes de 6 grados de libertad (6-DOF) simultáneamente, cada uno con su propio modelo 3D real, cinemática, y estado de jog/trayectoria. El selector de modelo (RobotDetail → pestaña Config) agrupa cada robot disponible por fabricante:

- 🏭 **Source Robotics** - Parol6, Faze4 (mallas licenciadas bajo MIT y GPL-3.0 respectivamente, ver el propio `ATTRIBUTION.txt` de cada modelo)
- 🏭 **Annin Robotics** - AR3, AR4 (mallas licenciadas bajo MIT)
- 🏭 **Universal Robots** - UR3e, UR5e, UR10e, UR16e, UR20 - geometría oficial, límites de articulación, y cinemática de eslabones extraídos directamente del propio repositorio [Universal_Robots_ROS2_Description](https://github.com/UniversalRobots/Universal_Robots_ROS2_Description) de Universal Robots (BSD-3-Clause), cubriendo el rango de carga útil de pequeña a pesada de su gama e-Series
- 🏭 **Universal Robots (clásica)** - UR3, UR5, UR10 - la gama CB anterior a la e-Series, geometría/parámetros DH oficiales del propio repositorio [universal_robot](https://github.com/ros-industrial/universal_robot) de ROS-Industrial (BSD-3-Clause)
- 🏭 **UFACTORY** - xArm6, Lite 6 (mallas BSD-3-Clause, geometría/cinemática oficial de [xarm_ros2](https://github.com/xArm-Developer/xarm_ros2))
- 🏭 **Comau** - e.DO (mallas BSD-3-Clause, geometría/cinemática oficial de [eDO_description](https://github.com/ianathompson/eDO_description))
- 🏭 **Kinova** - Gen3 Lite, Gen2 (mallas BSD-3-Clause, geometría/cinemática oficial de [ros2_kortex](https://github.com/Kinovarobotics/ros2_kortex))
- 🏭 **FANUC** - M-710iC (mallas BSD-3-Clause, geometría/cinemática oficial de [fanuc_m710ic_description](https://github.com/robot-descriptions/fanuc_m710ic_description))
- 🏭 **The Robot Studio** - SO-ARM100, un brazo de bajo coste de 5-DOF (no 6) (mallas Apache-2.0, geometría/cinemática oficial de [SO-ARM100](https://github.com/TheRobotStudio/SO-ARM100))
- 🏭 **AgileX** - PiPER (mallas Apache-2.0, geometría/cinemática oficial de [agilex_piper_arm_description](https://github.com/renesas-rdk/agilex_piper_arm_description))
- 🏭 **Unitree** - Z1 (mallas BSD-3-Clause, vía [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie) de Google DeepMind - cada carpeta de robot ahí mantiene su propia licencia original del fabricante)
- 🏭 **Trossen Robotics** - ViperX 300, WidowX 250 (mallas BSD-3-Clause, geometría/cinemática oficial de [interbotix_ros_manipulators](https://github.com/Interbotix/interbotix_ros_manipulators))
- 🏭 **Koch / Low-Cost Robot Arm** - Koch v1.1, otro brazo de bajo coste de 5-DOF (no 6) (mallas Apache-2.0, vía [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie))
- ⚙️ **Genérico** - un brazo simplificado de dos eslabones para cualquier configuración sin un modelo dedicado

Son 24 modelos de robot reales repartidos en 13 fabricantes, más el placeholder Genérico - ver la tabla de licencias más abajo para el mapeo exacto modelo↔fabricante↔licencia que resume esta lista. Cada modelo real (todos excepto el Genérico) carga la geometría de malla STL real por eslabón y la mueve a través de la cadena real de transformación de articulaciones propia de ese fabricante - no un placeholder estilizado. La cinemática directa/inversa se calcula contra la geometría real propia de cada robot (resolución Newton-Raphson para la posición, límites reales por articulación donde el robot los define), de modo que una trayectoria grabada o un objetivo cartesiano jogeado mueve el brazo correcto tal como lo haría el robot físico real. Los 5 modelos e-Series de Universal Robots comparten además un único motor FK/IK común (`src/examples/urKinematicsShared.ts`) y un único renderizador de rig 3D común (`src/components/3d/URArm.tsx`), ya que cada articulación de la e-Series de UR comparte exactamente la misma estructura cinemática - solo difieren por modelo las longitudes numéricas de los eslabones. Los 3 modelos clásicos de UR (UR3/UR5/UR10) comparten en cambio su propio motor y renderizador separados (`src/examples/urClassicKinematics.ts`, `src/components/3d/UrClassicArm.tsx`), ya que esa generación anterior no comparte un mismo eje Z local en todas sus articulaciones como sí lo hace la e-Series.

Los controles de jog por robot incluyen una perilla giratoria + deslizador tanto para **velocidad** como para **aceleración** en cada eje, y una lectura completa de endstop/estado junto a una tarjeta de estado "Robot Controller Board" en vivo una vez que CAN-OTA está conectado a hardware real. Cada perilla/deslizador se ajusta al valor de **Step** de jog seleccionado en su propio combobox (de 0.1° hasta 100°/mm) en vez de moverse de forma continua. El robot **A1** es una prueba de concepto en marcha para una disposición distinta: sus controles de jog Speed/Acceleration/J1-J6/XYZ viven en un panel flotante arrastrable sobre el propio visor 3D (`Joystick3D.tsx` para el pad XYZ) en vez del panel debajo que todos los demás robots siguen usando - ver `src/components/robots/A1.tsx`.

### Etapa Kinematic Brain

Un panel de control dedicado al propio subsistema de movimiento local de la placa madre HYDRA-UMC - los ejes accionados directamente por el STM32H745, separados de los brazos robóticos distribuidos en STACK A:

- 📐 Control de jog del **pórtico XY** para los ejes X, Y1, Y2 (pórtico Y dual), y Z
- 🔥 Control de **cama caliente** (conmutada por SSR, 230VAC)
- 🔄 **Revolver ATC** - control de índice de herramienta rotativo para el cambiador automático de herramientas accionado por E0
- 🎢 **Transportador** - control de instalado/en marcha/velocidad para la cinta de transporte accionada por E1
- 🛑 Una rejilla completa de 12 endstops, 3 canales de ventilador, y 10 bombas/10 válvulas para la fluídica del proceso

### Paneles de Control de Accesorios y Máquinas

Paneles dedicados para las máquinas y accesorios que acompañan a una célula robótica: **Mesa XY**, **Herramientas ATC**, **Gestor de Racks**, **Pick & Place** (incluyendo configuración específica de JuanenPnP/LumenPnP), **CNC** (incluyendo configuración específica de JuanenCNC), **Láser** (incluyendo configuración específica de JuanenLaser), **Mesa de Vacío**, y **Cama Caliente**.

---

### 🧩 Mesas de vacío seleccionables

Elige uno de seis modelos STL reales en Mesa de Vacío: 160 × 120, 230 × 210, 230 × 250, 232 × 217, 240 × 240 o 250 × 250 mm. La base tiene 15 mm de grosor; con las paredes de alineación, la altura total es 16,2 mm. Ancho y largo son editables en pasos de 5 mm (10–5000 mm). Se escala la superficie, no el grosor. Elegir un modelo restaura sus medidas originales. El tamaño personalizado se sincroniza mediante SERVER; los agujeros y canales escalados son una vista de distribución, no un STL regenerado para fabricar. Elegir modelo conserva posición, bomba y válvula; reiniciar selecciona 160 × 120 mm y apaga bomba y válvula. Los identificadores antiguos o desconocidos muestran el primer modelo. STUDIO y las dos interfaces de SUITE usan el mismo catálogo y modelId en la configuración del robot.

[Guía de modelos, configuración y regeneración](docs/VACUUM_TABLE_MODELS.md).

### 🔥 Modelo de cama calefactada

Cuatro modelos STL: 100×100, 200×100, 200×200 y 255×255 mm, todos de 5 mm de grosor. Ancho/largo ajustables en pasos de 5 mm (25–5000 mm); elegir un modelo restaura sus medidas sin cambiar la calefacción. Modelo visual, no un diseño eléctrico ni de fabricación.

[Modelo de cama calefactada — STL / OpenSCAD](docs/HEATED_BED_MODELS.md).

### 🗄️ Racks STL configurables

Rack STL: ancho y fondo de 40–1000 mm en pasos de 1 mm; 1–24 placas con separación fija de 10 mm. Son ajustes visuales, no una calibración del robot.

[Racks STL configurables — STL / OpenSCAD](docs/RACK_MODELS.md).

### 🛠️ Modelos independientes de máquinas

Copias STL independientes para JuanenPnP, JuanenCNC y JuanenLaser; LumenPnP conserva el original. Edita cada modelo en su carpeta. Se usan las dimensiones CAD; los antiguos ajustes de tamaño no estiran el modelo.

[Modelos independientes de máquinas — STL](docs/MACHINE_ASSETS.md).

Estos diseños originales JuanenPNP / HYDRA-UMC y sus fuentes SCAD usan GPL-3.0; no son el CAD de la máquina de Opulo.

### Trabajos y Trayectorias

Carga trayectorias de ejemplo predefinidas, jogea y graba tus propios puntos en vivo, o carga/guarda/edita/reproduce trayectorias complejas multi-punto (JSON) por robot. Las trayectorias son portables entre modelos de robot - cada punto grabado se resuelve a través de la cinemática real propia de ese robot específico (`src/examples/robotKinematicsDispatch.ts`) en el momento de cargar/dibujar/reproducir, no se calcula de forma fija contra el robot con el que se grabó, de modo que el mismo archivo de trayectoria mueve correctamente a un Parol6 y a un UR10e a lo largo de su propia geometría alcanzable real.

### Herramientas de Firmware CAN-OTA

Flashea y auto-prueba el firmware a través de toda la cadena CAN-OTA de HYDRA-UMC + URTC desde un solo panel, con dos puntos de entrada dedicados:

- **URTC → Flasher / Tester** - para la placa URTC Tool Head y sus propias placas de expansión (coincide con la cobertura de protocolo propia de las herramientas de escritorio independientes [URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)/[URTC Tester](https://github.com/JuanenRac/URTC-TESTER))
- **HYDRA-UMC → Flasher / Tester** - para los niveles Robot Controller Board y Kinematic Brain, relevado todo el camino desde CM5 → SPI → STM32H745 → FDCAN1 → Robot Controller Board → CAN → URTC Tool Head, sin necesitar sonda JTAG/SWD ni adaptador USB-CAN (ver el propio [`docs/architecture.md` de HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC/blob/main/docs/architecture.md) para el diseño completo de direccionamiento/relevo)

Ambos pueden descargar releases de firmware reales directamente desde GitHub (basado en `firmware_manifest.json`, verificado por CRC32) tanto para el repositorio `URTC` como para `HYDRA-UMC`. Como se indica arriba, el propio transporte se ejecuta contra una simulación completa incorporada hasta que exista firmware STM32H745 real en hardware real con el que hablar.

### Soporte de Mando

Integración de mandos USB y Bluetooth con mapeos personalizados por botón/por eje, para jogear robots y accesorios sin ratón/teclado. Las acciones en tiempo real (jog de articulaciones/mesa, E-STOP, START/STOP, velocidad de reproducción) disparan la misma vía atómica `sendRobotCommand()` que usan los botones de jog en el panel de detalle del robot, no el guardado de ajustes con debounce - ver `GamepadController.tsx`.

### Integración de Cámaras

Hasta 8 feeds en vivo simultáneos (visión USB o sensores térmicos de la familia MLX90640/41/42) con grabación y estado de inferencia - la matriz de cámaras alrededor de la cual está construido el propio subsistema de hub USB 3.0 dual de HYDRA-UMC.

### Interfaz Multi-Idioma

Traducción completa de la interfaz en **inglés, español, alemán, francés, italiano, chino simplificado, japonés y portugués** (`src/locales/`), incluyendo el menú de Ayuda dentro de la app con sus guías paso a paso, el asistente, el diálogo Acerca de (versión/autor/licencia) y cada pestaña del diálogo de Configuración del Sistema. La cobertura aún no es del 100 % de cada pantalla: unos pocos paneles accesorios independientes siguen con el inglés fijo en el código, sin llegar todavía al trabajo de traducción.

### Ayuda, guías y asistente

La ventana de Ayuda tiene una pestaña de **Guías paso a paso**: una guía por tarea (añadir un controlador, mover un robot, grabar una trayectoria, usar las cámaras, flashear firmware, gestionar usuarios, acceso remoto, seguridad...), cada una con un nivel (básico, avanzado, técnico), un buscador y un botón que lleva a la pantalla donde se hace la tarea. **Hydri**, el asistente, es una pequeña mascota animada que flota sobre el panel: explica la pantalla en la que estás, te guía en una tarea paso a paso, responde a preguntas escritas con palabras sin servidor ni modelo de IA (en cualquiera de los 8 idiomas), puede leer las respuestas en voz alta con la voz del propio navegador, se puede arrastrar a cualquier sitio y fijar allí, y se activa o desactiva desde la ventana de Ayuda. Sus preferencias se guardan en el navegador (`src/assistant/`).

### ℹ️ Acerca de y Configuración del Sistema

Dos diálogos independientes, ambos accesibles desde la cabecera (botones `Config`/`About`): **About** muestra la versión de la app en ejecución (leída en vivo desde `GET /api/hydra-info`), el autor, y la licencia; **Config** cubre la identidad del servidor, gestión de controladores/nodos, tema de UI + idioma, renombrado de robots, mapeo cámara↔robot con detección de conflictos, la biblioteca de URDF personalizados, integraciones de software de terceros (backends de OpenPnP/CNC/Láser), acceso remoto por cliente (interruptores independientes para SUITE/Android/iOS), cuentas de usuario, directorios de trabajo por robot, transporte CAN-OTA, y mapeo de mando - cada uno en su propia pestaña. Ambos son sus propios componentes (`src/components/About.tsx`, `src/components/Config.tsx`), no están integrados en línea dentro del shell principal del dashboard.

### Fiabilidad

La app se protege a sí misma contra dos clases distintas de fallo en tiempo de ejecución, ambas nacidas de un incidente real de producción (una pantalla kiosco quedándose en negro tras un redeploy). `src/main.tsx` escucha el propio evento `vite:preloadError` de Vite - emitido cuando una pestaña del navegador dejada abierta a través de un redeploy intenta descargar un chunk de panel cargado con `React.lazy()` (cada panel de `Dashboard.tsx`, con hash de contenido según `vite.config.ts`) que ya no existe bajo su hash antiguo - y recarga la página una vez automáticamente, de modo que una pestaña kiosco de larga duración o una pestaña de fondo obsoleta se autorrepara sin que nadie lo note. Una protección con `sessionStorage` evita que esto entre en un bucle de recarga infinito si un chunk falta genuinamente por alguna otra razón. Por separado, `src/components/ErrorBoundary.tsx` envuelve el área de paneles `<Suspense>` como respaldo ante cualquier otro fallo de renderizado; está indexado por la pestaña activa, así que cambiar de un panel caído realmente reintenta el siguiente en vez de dejar todo el dashboard atascado en una pantalla de fallback.
Las órdenes nunca fallan en silencio: cada orden de jog, reproducción, alimentación, visión y herramienta devuelve un resultado tipado, una sesión caducada se renueva una vez y se reintenta, y todo lo que siga rechazado se muestra en un aviso. El botón rojo **STOP** es global: un clic, sin confirmación, detiene todos los robots de todos los controladores y apaga todas las válvulas y bombas en una sola llamada (`POST /api/stop-all`). Está en la cabecera y el pie, en el panel del robot y en la superposición de control remoto, y Ctrl+Shift+Espacio lo pulsa desde el teclado (una combinación que no se escribe por accidente y se ignora con la tecla mantenida). El resultado se lista robot a robot (aviso si un robot no se detuvo o el servidor no pudo guardar la parada; los robots reservados por otra cuenta se marcan); un fallo de red se reintenta una vez, un servidor que superó su límite (429) o sin la ruta (404) se atiende con la parada por robot, y un aviso persistente «STOP no confirmado» permanece hasta que un STOP posterior obtenga respuesta. El jog con el joystick es un control de hombre muerto (termina al cancelar el puntero, perder el foco, ocultar la pestaña o a los 8 segundos), un movimiento de J1 se queda en el ángulo equivalente más cercano y se rechaza un paso de jog superior a 20 grados. El mando sigue al robot seleccionado en la interfaz y tiene límite de frecuencia. El firmware de una versión se comprueba con su sha256 antes de flashear por CAN-OTA, las imágenes de bootloader son opcionales y las trayectorias y escenas importadas se validan antes de llegar al estado compartido.

El servidor decide, para todos los clientes, quién puede mover un robot y hasta dónde. Un robot puede **reservarse** para la cuenta y la ventana (un identificador de controlador elegido por ventana) que lo pide: la misma cuenta desde otra ventana, u otra cuenta, recibe un rechazo con un mensaje que dice cuál es el caso (`other-controller`, `other-account`, `controller-id-required`), la lista de reservas sale de `GET /api/claims` y un administrador puede tomar el control de un robot. El tamaño de un jog, el rango de un jog absoluto y la temperatura objetivo máxima de la cama se leen de `GET /api/safety-limits` en lugar de guardarse en la app; un administrador los edita por modelo en **Ecosistema > Límites de seguridad**, junto con el armado opcional del jog (desactivado por defecto; si se activa, un botón arma el jog durante un tiempo limitado) y el identificador de controlador obligatorio. Cada robot tiene un interruptor **Live / Sim** (Live por defecto): en Sim, esa ventana no envía nada que mueva el robot o encienda algo, mientras que STOP siempre pasa. Un Work o ejemplo con puntos que el brazo no alcanza se rechaza con la lista de esos puntos, y puede escalarse al alcance del modelo. La lista de reservas también la envía el servidor por el WebSocket (el mensaje `claims`, para las conexiones que pidieron `remoteApiVersion=2`), de modo que la barra de acceso muestra un cambio al instante en lugar de esperar a su siguiente consulta; mientras llegan los envíos, la consulta solo se hace de vez en cuando. Las escrituras son condicionales: cada una lleva la revisión del robot que esta ventana vio por última vez (`If-Match`) y, si otra persona cambió el robot entretanto, el servidor responde 412, se vuelve a leer el robot y el aviso lo dice (Estándar comprueba reservas, mesa y comandos puntuales; Estricto comprueba todo salvo STOP; Desactivado no comprueba nada; STOP nunca se comprueba). La mesa XY se mueve con el comando atómico `table`, y los administradores leen el registro de auditoría de solo añadir, con su cadena SHA-256 verificada, en **Ecosistema > Registro de auditoría**.

### Cuentas y Acceso

Cada servidor siembra una cuenta en su propio primer arranque - usuario `admin`, contraseña `admin` - cámbiala desde **Config > Users** tan pronto como el servidor sea alcanzable más allá de una LAN totalmente de confianza. Esa misma pestaña permite a una cuenta admin crear cuentas adicionales de **operador**: un operador puede iniciar sesión, observar el estado en vivo, y manejar robots (jog/reproducir/pausar/detener/herramienta/válvula/bomba/velocidad), pero no puede sobrescribir los ajustes globales ni gestionar otras cuentas. No se requiere ninguna cuenta solo para mirar - el propio "Continuar en solo lectura" de la pantalla de inicio de sesión salta directamente al dashboard con las escrituras deshabilitadas. Contrato completo (roles, tokens, las rutas `/api/users`) documentado en el propio [`docs/REMOTE_API.md` de HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md), secciones 2a/2b. En producción el primer administrador sale de los ajustes de arranque de la implantación y el servidor rechaza secretos de ejemplo (ver [`docs/PRODUCTION_BOOTSTRAP.md` de HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/PRODUCTION_BOOTSTRAP.md)).

Cada uno de los 5 clientes remotos (SUITE, Android, iOS, Watch, DSI) se auto-identifica mediante una cabecera de petición `X-Hydra-Client`, de modo que **Config > Remote Access** puede permitir o bloquear cada uno de forma independiente en vez de un único interruptor combinado para los cinco.

**Server Admin** tiene una tarjeta de **inicio de sesión en dos pasos** para la cuenta con la que has entrado (desactivado hasta que su dueño lo activa): la contraseña, un código QR de la dirección otpauth (dibujado en la app, sin paquetes extra) y la clave para escribir a mano, el primer código de la app de autenticación y diez códigos de recuperación de un solo uso que se muestran una vez. Entonces el formulario de acceso pide el código de una cuenta que lo tiene activado, y **Config > Users** permite a un administrador quitar el segundo paso de una cuenta que perdió el móvil y los códigos de recuperación.

### Estado Persistente

HYDRA-UMC STUDIO en sí es un cliente puro - no mantiene ningún estado propio más allá de lo que está en memoria para la sesión actual. Toda la persistencia (`settings.json`, `users.json`, trayectorias guardadas bajo `WORKS/`, modelos enviados) vive en el backend separado **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** con el que esta app habla por red (ver el propio `data/` y README de ese proyecto para el panorama completo) - el estado sobrevive a una recarga de página o a un redespliegue de esta app, ya que ninguno de los dos toca el proceso del backend en absoluto. `settings.json` en sí está deliberadamente excluido del servicio de archivos estáticos de ese backend (contiene IPs de controladores, configuración CAN-OTA, y el estado completo por robot), aunque su carpeta `WORKS/` se sirve con normalidad.

El inicio de sesión dura lo que la pestaña del navegador: la sesión y su token de renovación se guardan en `sessionStorage`, así que cerrar la pestaña la termina. La opción de acceso **Mantener la sesión en este dispositivo** los guarda en `localStorage`, y sobreviven a reiniciar el navegador (desactivada por defecto). La página de producción lleva una Content-Security-Policy como etiqueta meta (scripts solo de la propia página, sin scripts en línea, sin plugins); `HYDRA_STUDIO_CSP=off` al compilar la omite, para un despliegue que fija la cabecera por su cuenta, y cualquier otro valor se usa como política.

El mismo contrato `GET`/`POST /api/settings`, más un endpoint de descubrimiento (`GET /api/hydra-info`) y un `WebSocket /ws` para actualizaciones push en vivo, es también cómo se conectan los clientes externos a ese mismo backend - esto es lo que permite a [HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) descubrir una instancia de HYDRA-UMC SERVER en marcha en la red, leer/modificar su estado, y ver cambios hechos desde la propia pestaña del navegador de esta app reflejados en vivo (y viceversa). Contrato completo en el propio [`docs/REMOTE_API.md` de HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md).

`GET /api/system/metrics` alimenta el pie del dashboard Overview: la carga de CPU y el uso de memoria son siempre reales (el propio módulo `os` de Node); la temperatura lee la salida real de `vcgencmd measure_temp` cuando se ejecuta en una Raspberry Pi real, y recurre a un valor simulado claramente marcado en caso contrario (`temp_is_real` en la respuesta); el estado de Wi-Fi/Ethernet/Bluetooth se lee de `/sys/class/net`/`/sys/class/bluetooth` (solo Linux, `null`/desconocido en cualquier otro host en vez de un valor adivinado).

## 🔒 Seguridad y protección

| Amenaza | Defensa | Dónde |
|---|---|---|
| Scripts inyectados que se ejecutan en la página | La compilación pone una Content-Security-Policy en la página: scripts solo de la propia página (más WebAssembly y el host del decodificador 3D), sin objetos, base y formularios limitados a la página; `HYDRA_STUDIO_CSP` puede apagarla o sustituirla | `scripts/csp.ts`, `vite.config.ts` |
| Un token de sesión leído de nuevo desde el almacenamiento | Un inicio de sesión escrito aquí vive en `sessionStorage` (sobrevive a recargar, no a cerrar la pestaña); `localStorage` solo si se marca «mantener la sesión». Un token que llega en la dirección va solo a `sessionStorage`, llega en el fragmento `#token=` que un navegador nunca envía, y se quita de la dirección en cuanto se lee | `src/lib/session.ts` |
| Dos operadores cambiando el mismo robot | Cada robot tiene una revisión: una escritura la envía con `If-Match` y una caducada se rechaza con 412; la mesa se mueve de forma atómica; las reservas y quién puede mover las decide el servidor para todos los clientes | `src/lib/revisions.ts`, `src/lib/tableMove.ts`, `src/lib/robotEdits.ts` |
| Una parada que espera una confirmación o una pantalla lenta | El STOP rojo es global y no pregunta nada: un `POST /api/stop-all` detiene todos los robots y apaga todas las válvulas y bombas; si la ruta está limitada o no existe, recurre a la parada de cada robot, y un robot que no paró se muestra en un aviso | `src/lib/stopAll.ts`, `src/components/StopAll.tsx` |
| Una opción de acceso rebajada por error (voz, MAVLink, Bluetooth, TLS...) | Server Admin muestra de dónde viene cada valor y bloquea los que fija el entorno del servidor; rebajar uno pide confirmación y, una vez guardado, queda un aviso en pantalla: una respuesta de voz que repite lo dicho, una confianza del reconocedor de 0, mensajes MAVLink sin firmar o la firma MAVLink apagada | `src/components/AdminServer.tsx`, `src/lib/serverSecurity.ts` |
| Un panel roto o una página antigua tras un redespliegue que deja la pantalla en negro | Cada pestaña está en su propio límite de errores, y un fragmento antiguo tras un despliegue provoca una recarga automática (con guarda, para que un fichero realmente ausente no entre en bucle) | `src/main.tsx`, `src/components/ErrorBoundary.tsx` |

**Lo que nunca hace:** decidir sobre seguridad. No guarda estado propio y no es una vía de parada de emergencia en hardware; la etapa del cerebro cinemático y las herramientas CAN-OTA solo se han ejecutado contra la simulación integrada.

## 🔌 Interfaces

| Topic o ruta | Qué lleva |
|---|---|
| `/api/login`, `/api/refresh`, `/api/logout` | iniciar sesión, renovar el token una vez al caducar y cerrar sesión |
| `/api/settings`, `/api/robot/:id`, `/api/robot/:id/command` | el árbol de estado y las órdenes tipadas (mover, reproducir, herramienta, válvula, bomba, visión) con `If-Match` |
| `/api/robot/:id/claim`, `/release`, `/jog-arm`, `/api/claims` | reservar un robot para esta cuenta y ventana, liberarlo, armar el movimiento, ver quién tiene qué |
| `/api/stop-all`, `/api/safety-limits` | la parada global y los límites de seguridad que impone el servidor |
| `/ws` | envío en vivo del estado (token como subprotocolo `hydra.bearer`, `remoteApiVersion=2`) |
| `/api/camera/*`, `/api/cameras/status` | flujos de cámara, instantáneas, grabaciones, PTZ y el ticket de imagen de corta vida |
| `/api/hardware/canota/version`, `/api/hardware/canota/flash` | la cadena CAN-OTA que usan Flasher y Tester (una simulación completa hasta que existan placas reales) |
| `/api/admin/server-config`, `/api/admin/clients`, `/api/admin/logs`, `/api/audit` | Server Admin: los interruptores de acceso, las aplicaciones conectadas, el registro del servidor y el registro de auditoría (administradores) |

## ⚙️ Configuración

Dos tipos de ajustes: la compilación y el navegador de esta aplicación, y los interruptores de acceso del servidor que edita Server Admin (el entorno del servidor gana sobre lo guardado; la pantalla muestra cuál se aplica y bloquea los demás).

| Variable | Por defecto | Qué fija |
|---|---|---|
| `HYDRA_STUDIO_CSP` | `default` | al compilar: `default`, `off` (sin política, para un anfitrión que fija la cabecera) o una política completa propia |
| `VITE_API_BASE_URL` | el anfitrión de esta página en el puerto 3000 | al compilar: dónde está el servidor cuando no está en el mismo anfitrión (véase `.env.example`) |
| `server.proxy` (`vite.config.ts`) | `localhost:3000` | solo en el servidor de desarrollo: reenvía `/api`, `/ws` y `/WORKS` al servidor, sin configurar CORS |
| `aiAccess` | `open` | quién puede usar el relé de IA local: `open` es cualquier cuenta con sesión, `admin` solo administradores |
| `infoAuth` | desactivado | pedir inicio de sesión para la información de solo lectura del equipo (métricas, supervisor de procesos, estado del ecosistema) |
| `tls.enabled` | desactivado (HTTP sin cifrar) | HTTPS y WSS con el certificado y la clave que indiques; la pantalla muestra la huella del certificado en uso |
| `ble.mode` | `off` | Bluetooth LE para teléfonos cerca del servidor: `off`, `state` (solo publica el estado) o `commands` (también acepta órdenes); una palabra desconocida significa apagado |
| `ble.requireEncryption` | activado | la característica de órdenes se escribe, y el estado se lee, solo por un enlace cifrado; solo `off` en la variable lo desactiva |
| `mqtt.mode` | `off` | el puente MQTT al broker de la celda: `off`, `state` o `commands`, con su URL, prefijo y usuarios |
| `voice.includeHeardText` | desactivado | una respuesta de voz repite lo que se dijo; son datos personales, así que está apagado, y en la variable solo la palabra exacta `1` lo activa |
| `voice.minConfidence` | `0.6` | la confianza mínima del reconocedor de voz, de 0 a 1, para aceptar una petición que inicia un movimiento; 0 desactiva la comprobación, una parada nunca se retiene, y un número erróneo en la variable se ignora |
| `mavlink.signingKeyFile` | vacío (sin firma) | firma MAVLink 2 del puente UAV: la ruta de un fichero con la clave de 32 bytes (32 bytes en bruto o 64 caracteres hexadecimales); solo se guarda la ruta, nunca la clave, y el puente la lee al arrancar |
| `mavlink.signingAllowUnsigned` | desactivado | seguir aceptando mensajes sin firmar (un vehículo que aún no firma); la pantalla avisa mientras está activo |

## 🚀 Inicio rápido

Requiere Node.js 22 o superior con npm, y un HYDRA-UMC-SERVER en marcha (puerto 3000): STUDIO es un cliente puro y no tiene con quién hablar sin él.

```bash
npm install
./dev.sh                           # Vite dev server on port 5173, proxying /api, /ws and /WORKS to the server on port 3000 (dev.bat on Windows)
npm test                           # the Vitest suite
npm run typecheck && npm run lint  # types and lint
./build.sh                         # production build into dist/ (build.bat on Windows)
```

## 🧪 Pruebas

664 pruebas automáticas se ejecutan con `npm test`. No necesitan hardware ni nada fuera de esta máquina.

El CI ejecuta `HYDRA_UMC_CI=1 python tools/ci_validate.py`, que comprueba el manifiesto, los documentos, los ocho README y las imágenes.

## 🏗️ Compilación y publicación

### Requisitos
- [Node.js](https://nodejs.org/) (v22 o superior)
- npm
- Un backend **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** en marcha (`npm run dev` también ahí, puerto `3000` por defecto) - esta app es un cliente puro y no tiene con quién hablar sin él.

### Instalación

```bash
npm install
```

### Modo Desarrollo

Ejecuta el propio servidor de desarrollo de Vite (`vite` simple, puerto `5173`) con recarga en vivo. El propio `server.proxy` de `vite.config.ts` reenvía de forma transparente `/api`, `/ws`, y `/WORKS` a `http://localhost:3000`, de modo que las llamadas fetch/WebSocket de ruta relativa de la app llegan al backend HYDRA-UMC SERVER sin necesidad de configurar CORS - solo asegúrate de que ese backend esté en marcha primero:
- **Windows:** doble clic en `dev.bat` o ejecuta `npm run dev`
- **Linux/Mac:** ejecuta `./dev.sh` o `npm run dev`

### Pruebas Automatizadas

```bash
npm test          # vitest run - 664 pruebas reales sobre src/examples/
npm run typecheck # tsc -b --noEmit (src/) + tsc -p tsconfig.test.json --noEmit (tests/)
```

### Compilación de Producción

Compila en un build estático optimizado (`vite build` simple - sin empaquetado de servidor, esta app ya no tiene código de backend):
- **Windows:** doble clic en `build.bat` o ejecuta `npm run build`
- **Linux/Mac:** ejecuta `./build.sh` o `npm run build`

Previsualiza el build de producción localmente con:
```bash
npm run preview
```

Despliega la carpeta `dist/` resultante en cualquier host estático. Por defecto la app compilada busca su backend en el mismo hostname de esta página en el puerto `3000` (coincide con el despliegue habitual de "todo en la CM5"); define `VITE_API_BASE_URL` en tiempo de compilación (ver `.env.example`) para apuntarla a una instancia de HYDRA-UMC SERVER alojada en otro sitio. Todo el estado y los datos reales persisten en el propio directorio `data/` de ese backend, no en este repositorio.

### Versionado

`bump_manifest_version.py` (raíz del repo) es el único dueño tanto de `hydra-umc.project.json` como del campo `version` de `package.json` - `npm run build` (`vite build`) es deliberadamente solo-compilación para que nunca pueda crear desincronización entre ambos incrementando uno sin el otro. `scripts/bump-version.mjs` es un ayudante nativo heredado que se conserva como referencia; nada en este repo lo llama ya. El esquema en sí sigue siendo el "cuentakilómetros" en base 10 de todo el ecosistema: patch +1 por cada incremento real, con acarreo hacia minor (y de minor hacia major) al superar 9, en vez de llegar nunca a un segmento de dos dígitos (`0.0.9` -> `0.1.0`, no `0.0.10`). La versión en ejecución es visible en vivo en el diálogo **About** (la versión de Studio se lee del `package.json` de esta propia app; la versión del servidor mostrada al lado viene de `GET /api/hydra-info`), y el historial completo está en [`CHANGELOG.md`](CHANGELOG.md).

## 🩺 Resolución de problemas

| Ves | Porque | Haz |
|---|---|---|
| El inicio de sesión falla, o cada llamada dice que no se alcanza el servidor | El servidor no está en marcha, o la página lo busca en el anfitrión equivocado | Arranca HYDRA-UMC-SERVER (puerto 3000 en desarrollo) o compila con `VITE_API_BASE_URL` |
| Un movimiento u orden se rechaza porque otra cuenta o ventana tiene el robot | El servidor reserva un robot para la cuenta y la ventana que lo pidió primero; además hay que armar el movimiento | Libéralo desde la barra de acceso del robot, o espera; un administrador puede ver quién lo tiene |
| Un guardado se rechaza con 412 | Otro cliente cambió el robot después de que lo cargaras, y tu revisión está caducada | Recarga el robot y repite el cambio |
| Un interruptor de Server Admin está en gris | El valor viene del entorno del servidor, que gana sobre lo guardado | Cambia la variable del servidor y reinícialo; la pantalla indica el origen de cada valor |
| La página está en blanco tras redesplegar el servidor | La pestaña abierta aún apunta a fragmentos que ya no existen | La página se recarga sola una vez; si sigue en blanco, recarga a mano y recompila si de verdad falta un fichero |

## 📂 Estructura del repositorio

<p align="center">
  <img src="images/repository-structure.svg" alt="Repository structure of HYDRA-UMC-STUDIO" width="100%">
</p>

<details>
<summary>Versión en texto del árbol</summary>

```text
HYDRA-UMC-STUDIO/
├── src/                             código fuente
│   ├── App.tsx                      El enrutador y la maquetación, el punto de entrada y el proveedor del estado global
│   ├── Dashboard.tsx                Shell principal de la app - navegación, panel Overview, métricas del sistema en el pie
│   ├── store.ts                     Estado global: RobotModel/RobotState/HydraController/SystemSettings -
│   ├── motionSource.ts              Qué representa la pose dibujada (ordenada o seguida por la máquina) y el núcleo puro de transición de estado de sendRobotCommand()
│   ├── i18n.ts                      Configuración de react-i18next - carga src/locales/*.json
│   ├── hooks/                       usePartColors.ts: colores por pieza guardados por HYDRA-UMC-EDITOR-STL
│   ├── assets/                      El icono, la pantalla de arranque y las imágenes de la app, y los estilos globales
│   ├── assistant/                   Hydri, el asistente: motor de respuestas, base de conocimiento (8 idiomas), mascota, preferencias
│   ├── components/                  las pantallas y paneles: detalle de robot, escena 3D, administración, herramientas CAN-OTA
│   ├── examples/                    cinemática directa e inversa de los 24 modelos reales de robot
│   ├── lib/canOta.ts                Capa de simulación/protocolo CAN-OTA, descarga de firmware desde GitHub
│   ├── lib/apiBase.ts               Resolución de la URL del backend - relativa+proxeada en dev, VITE_API_BASE_URL en prod
│   ├── lib/mediaTicket.ts           Tickets de vida corta para las imágenes de las cámaras
│   ├── lib/claims.ts                Reservas, identificador de controlador, límites de seguridad leídos del servidor, modo Live/Sim
│   ├── lib/revisions.ts             Revisión de cada robot (If-Match, 412), movimiento atómico de la mesa, registro de auditoría y comprobación de su cadena
│   ├── lib/session.ts               Tokens de sesión, opciones de acceso del servidor, textos de error para el operador, quién puede guardar los ajustes, SHA-256 sin crypto.subtle
│   ├── lib/stopAll.ts               El STOP global, la respuesta a una orden de robot, las ediciones de un robot como órdenes, el robot seleccionado, la numeración de pasos de reproducción, el aviso de trayectorias inalcanzables, dónde va la herramienta en la brida, ángulos por el camino más corto
│   ├── lib/claimsFeed.ts            La lista en vivo de reservas, comprobaciones antes de importar un fichero, limitación de la entrada mantenida, repetición de un botón de jog mantenido, reglas de teclado de los diálogos, el analizador de grabaciones MJPEG guardadas, el catálogo de modelos enviados por los editores
│   └── locales/                     Archivos de traducción en/es/de/fr/it/ja/zh/pt (react-i18next)
├── docs/                            guías de los modelos de mesa de vacío, cama caliente, rack y máquinas
├── public/                          modelos 3D: robots, racks, camas calientes, mesas de vacío, máquinas (STL y OpenSCAD)
├── images/                          Banner del README
├── tests/                           Suite real de Vitest (610 pruebas) - solo la matematica FK/IK de src/examples/, sin React/DOM
├── tools/                           herramientas del proyecto y comprobaciones del CI
├── scripts/                         bump-version.mjs (subida de versión explícita) y csp.ts (la política de seguridad de contenido de la página compilada)
├── .github/                         flujo de CI y plantillas de incidencias
├── index.html                       La página desde la que Vite construye la app (la política de seguridad de contenido se inserta al compilar)
├── example_trajectory.json          Trayectoria de ejemplo independiente (secuencia de ángulos de junta, datos de muestra)
├── metadata.json                    Nombre/descripción de la app (usado por la plataforma de hosting)
├── bump_manifest_version.py         Sincroniza la versión de hydra-umc.project.json con la nativa (--sync)
├── build.sh / build.bat             Instala dependencias + build de producción
├── build-test.sh / build-test.bat   Comprobación de build/compilación sin subir versión
├── dev.sh / dev.bat                 Instala dependencias + inicia el servidor de desarrollo de Vite
├── vitest.config.ts                 Configuracion de Vitest (solo tests/, entorno node real - no hace falta DOM)
├── tsconfig.test.json               Proyecto de verificacion de tipos independiente para tests/ (separado de las referencias app/node)
├── .env.example                     Plantilla de VITE_API_BASE_URL - ver src/lib/apiBase.ts
├── CHANGELOG.md                     qué cambió en cada versión
├── hydra-umc.project.json           manifiesto: versión, madurez, familia
├── package.json                     metadatos y scripts del paquete
└── test.sh                          ejecuta las pruebas
```

</details>

## 🗺️ Hoja de ruta y límites conocidos

**Límites conocidos hoy**

* La cadena CAN-OTA (Flasher y Tester) y la etapa del cerebro cinemático solo se han ejecutado contra la simulación integrada: todavía no existe ninguna placa controladora HYDRA-UMC que flashear o probar.
* Los tamaños de mesa, cama caliente y rack son ajustes visuales, no una calibración del robot ni un diseño eléctrico o de fabricación.
* La PARADA pasa por el servidor; no hay parada de emergencia inalámbrica ni una vía de parada en hardware.
* Todo lo que mueve un robot lo decide el servidor (roles, límites, reservas); esta aplicación no puede hacer segura por sí sola una maniobra.

**Siguiente:** cada novedad de esta aplicación se porta a HYDRA-UMC-SUITE, y las herramientas CAN-OTA esperan a las primeras placas reales.

## 🌍 Idiomas

Este README y los documentos del repositorio existen en ocho idiomas: inglés, español, alemán, francés, italiano, japonés, chino y portugués (Portugal). Se escriben a la vez y el CI comprueba que los ocho ficheros tengan las mismas secciones y los mismos enlaces.

## 🔗 Proyectos relacionados

Este proyecto es parte del ecosistema de robótica HYDRA-UMC del mismo autor (JuanenRac / Electro Hobby 3D). Vale la pena conocerlo, ya que una petición podría en realidad ser sobre alguno de estos en vez de sobre este repositorio.

**Proyecto Padre**
- **[HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** — el backend headless real (REST/WebSocket) con el que habla de verdad cada cliente de control; este panel es un cliente frontend puro del mismo, sin código de backend propio.

**Proyectos Hermanos** — también hablan con la propia API de HYDRA-UMC-SERVER, cada uno como su propio cliente
- **[HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)** — centro de mando de enjambre de escritorio (PySide6) para varios servidores a la vez, empaquetado como ejecutable independiente.
- **[HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL)** — app nativa de control para Android con inicio de sesión biométrico y un compañero Wear OS emparejado.
- **[HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL)** — app de control para iOS/iPadOS (Flutter) con sincronización en tiempo real por WebSocket.
- **[HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)** — interfaz táctil nativa para la pantalla táctil DSI de 7" a bordo, embebida en el propio CM5.
- **[HYDRA-UMC-BRIDGE-AMR](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-AMR)** — barrera de coordinación para flotas AGV/AMR mediante un publicador MQTT VDA 5050 (probado solo contra una flota emulada).
- **[HYDRA-UMC-BRIDGE-CNC](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-CNC)** — coordinador de alto nivel para celdas CNC con acceso a estado/bytes de control GRBL (probado solo contra un emulador).
- **[HYDRA-UMC-BRIDGE-DROIDS](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-DROIDS)** — barrera de coordinación para droides con patas/humanoides, con un emisor de comandos para Boston Dynamics Spot (probado solo contra un emulador).
- **[HYDRA-UMC-BRIDGE-LASER](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-LASER)** — coordinador de celdas láser que lee 3 señales GPIO de llave/carcasa/enclavamiento (probado solo contra un chip simulado; no puede armar ni disparar un láser).
- **[HYDRA-UMC-BRIDGE-OPENPNP](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-OPENPNP)** — coordinador de alto nivel seguro para el flujo de placas de pick-and-place OpenPnP.
- **[HYDRA-UMC-BRIDGE-PRINTER3D](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-PRINTER3D)** — barrera de coordinación segura para impresoras 3D Moonraker/Klipper, con comandos de trabajo reales y controlados.
- **[HYDRA-UMC-BRIDGE-ROS2](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-ROS2)** — coordinador con un transporte ROS 2 rclpy importado de forma perezosa (todavía no ejecutado contra una instalación de ROS 2).
- **[HYDRA-UMC-BRIDGE-UAV](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-UAV)** — barrera de coordinación para UAV equipados con cámara, con un emisor de comandos MAVLink (probado solo contra un emulador).

**Proyectos Hijos**
- **[HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF)** — creador/editor gráfico de URDF de escritorio que envía los modelos terminados al propio catálogo de este panel vía `POST /api/models/submit`.
- **[HYDRA-UMC-EDITOR-STL](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-STL)** — editor de escritorio de modelos STL para la propia librería `public/models/` de este panel (y el espejo que mantiene HYDRA-UMC-SUITE) - transforma/reemplaza/quita/añade piezas reales, sin borrar nunca nada de forma permanente.

**Directamente Relacionados**
- **[HYDRA-UMC-DASHBOARD-AI](https://github.com/JuanenRac/HYDRA-UMC-DASHBOARD-AI)** — paneles de Resúmenes Inteligentes y Resaltado de Anomalías sobre DATALAKE/ANOMALY-DETECTOR, con un respaldo estadístico honesto; extiende este mismo panel con resúmenes estadísticos (todavía sin modelo de lenguaje).
- **[HYDRA-UMC-COGNITIVE-NODE](https://github.com/JuanenRac/HYDRA-UMC-COGNITIVE-NODE)** — nodo de integración para el pipeline cognitivo Hailo-10 (orquestación de LLM/VLA/voz); añade control por voz/lenguaje natural sobre este panel.
- **[HYDRA-UMC-VOICE-UI](https://github.com/JuanenRac/HYDRA-UMC-VOICE-UI)** — front-end de voz real (VAD + analizador de intención) con un relé a Watch acotado y con confirmación; añade control por voz/lenguaje natural sobre este panel.
- **[HYDRA-UMC-LOCAL-TECHNICIAN](https://github.com/JuanenRac/HYDRA-UMC-LOCAL-TECHNICIAN)** — técnico de mantenimiento con IA local y con puertas de política para el propio ecosistema - observa, diagnostica y propone arreglos; los dos niveles de riesgo más altos están deliberadamente sin implementar todavía.
- **[HYDRA-UMC-TWIN](https://github.com/JuanenRac/HYDRA-UMC-TWIN)** — nodo de integración para el motor de gemelo digital, con un contrato real de sincronización por compatibilidad de versión; permite previsualizar en el gemelo digital antes de tocar el robot real, directamente desde este panel.
- **[HYDRA-UMC-HIL-BRIDGE](https://github.com/JuanenRac/HYDRA-UMC-HIL-BRIDGE)** — enrutador hardware-in-the-loop con un enclavamiento de software por colisión entre simulación y hardware real (probado sin hardware real); permite previsualizar en el gemelo digital antes de tocar el robot real, directamente desde este panel.

**También Forma Parte del Ecosistema**

*Hardware y Plataforma Base*
- **[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)** — el diseño de la placa madre del brazo robótico: host CM5 + coprocesador STM32H745 de doble núcleo, pensado para coordinar hasta 8 brazos herramienta por CAN-OTA/SPI-OTA (firmware en fase temprana; todavía no hay ninguna placa poblada).
- **[HYDRA-UMC-OS](https://github.com/JuanenRac/HYDRA-UMC-OS)** — capa de producto reproducible sobre Raspberry Pi OS para el CM5: agente de solo lectura, config/perfiles validados, aprovisionamiento WiFi de primer contacto.
- **[HYDRA-UMC-SDK](https://github.com/JuanenRac/HYDRA-UMC-SDK)** — el contrato JSON-Schema compartido y la barrera de software de puerta de trabajos contra la que cada bridge valida sus comandos (no es una función de seguridad certificada).
- **[HYDRA-UMC-CONNECTOR-HUB](https://github.com/JuanenRac/HYDRA-UMC-CONNECTOR-HUB)** — registro declarativo y validador de manifiestos de adaptador para conectores de máquinas externas; extiende la propia idea de contrato del SDK a máquinas externas sin sustituir a los proyectos de pasarela industrial.

*Plataforma de Herramientas URTC*
- **[URTC](https://github.com/JuanenRac/URTC)** — firmware para la placa física del Universal Robot Tool Controller, más de 25 perfiles de herramienta por bus CAN.
- **[URTC-FLASHER](https://github.com/JuanenRac/URTC-FLASHER)** — herramienta de escritorio con GUI para flashear placas URTC, CAN-OTA más SWD/JTAG de chip completo.
- **[URTC-TESTER](https://github.com/JuanenRac/URTC-TESTER)** — herramienta de escritorio de diagnóstico CAN-bus en vivo para placas URTC, un panel por perfil de herramienta.
- **[URTC-WEB-STUDIO](https://github.com/JuanenRac/URTC-WEB-STUDIO)** — alternativa basada en navegador a URTC-TESTER mediante la Web Serial API, sin instalación local.
- **[URTC-GATEWAY](https://github.com/JuanenRac/URTC-GATEWAY)** — pasarela delante del bus CAN de URTC: lista de identificadores permitidos, límite de tasa y clave de sesión; software probado en ordenador, aún no en un bus real.

*Nodo IA de Visión (Hailo-8)*
- **[HYDRA-UMC-VISION-NODE](https://github.com/JuanenRac/HYDRA-UMC-VISION-NODE)** — nodo de integración para el pipeline de visión Hailo-8, con una comprobación real de disponibilidad de hardware por etapa.
- **[HYDRA-UMC-DETECTION-HEF](https://github.com/JuanenRac/HYDRA-UMC-DETECTION-HEF)** — registro real de modelos compilados con verificación de carga segura por arquitectura Hailo/checksum.
- **[HYDRA-UMC-VISION-STREAMER](https://github.com/JuanenRac/HYDRA-UMC-VISION-STREAMER)** — generador real de pipeline GStreamer + config MediaMTX, con una frontera de integración HailoRT real.
- **[HYDRA-UMC-VISUAL-SERVOING-API](https://github.com/JuanenRac/HYDRA-UMC-VISUAL-SERVOING-API)** — ley de corrección Position-Based Visual Servoing con autorización condicionada al estado de zona; todavía sin estimación de pose por cámara.
- **[HYDRA-UMC-SAFETY-ZONES](https://github.com/JuanenRac/HYDRA-UMC-SAFETY-ZONES)** — lógica v0 de invasión de zona, vigencia de calibración y solicitud de E-STOP que toma las posiciones de los objetos de un fichero; ningún detector la alimenta y todavía no hay un E-STOP físico conectado.

*Nodo IA Cognitivo (Hailo-10)*
- **[HYDRA-UMC-VLA-ENGINE](https://github.com/JuanenRac/HYDRA-UMC-VLA-ENGINE)** — codificación/decodificación real de tokens de acción y generación de trayectoria para un modelo Vision-Language-Action.
- **[HYDRA-UMC-SEMANTIC-PLANNER](https://github.com/JuanenRac/HYDRA-UMC-SEMANTIC-PLANNER)** — descomposición real de tareas basada en reglas y recuperación semántica de errores sobre códigos de error del MCU.
- **[HYDRA-UMC-DOCS-QA](https://github.com/JuanenRac/HYDRA-UMC-DOCS-QA)** — búsqueda real de documentos TF-IDF (solo librería estándar) sobre los propios documentos Markdown de este ecosistema.

*Orquestación y Enjambre*
- **[HYDRA-UMC-ORCHESTRATOR](https://github.com/JuanenRac/HYDRA-UMC-ORCHESTRATOR)** — nodo de integración con un contrato real de informe de salud gRPC/Protobuf y una máquina de estados de misión.
- **[HYDRA-UMC-JOB-DISPATCHER](https://github.com/JuanenRac/HYDRA-UMC-JOB-DISPATCHER)** — cola de trabajos real basada en prioridad con deduplicación, sobre una API HTTP real.
- **[HYDRA-UMC-NODE-HEALING](https://github.com/JuanenRac/HYDRA-UMC-NODE-HEALING)** — watchdog de salud de flota real basado en gRPC, con reintento/backoff y detección de discrepancia de identidad.
- **[HYDRA-UMC-PATH-PLANNER-3D](https://github.com/JuanenRac/HYDRA-UMC-PATH-PLANNER-3D)** — planificador de rutas 3D real basado en RRT, con validación real de colisión de obstáculos/espacio de trabajo.
- **[HYDRA-UMC-SWARM-SYNC](https://github.com/JuanenRac/HYDRA-UMC-SWARM-SYNC)** — sincronización de estado real mediante CRDT LWW-Element-Map, con pruebas de propiedades para convergencia multi-celda.

*Gemelo Digital y Simulación*
- **[HYDRA-UMC-PHYSICS-REPLICA](https://github.com/JuanenRac/HYDRA-UMC-PHYSICS-REPLICA)** — cinemática directa real y validación de límites articulares sobre un subconjunto real de URDF.
- **[HYDRA-UMC-SYNTHETIC-DATA-GEN](https://github.com/JuanenRac/HYDRA-UMC-SYNTHETIC-DATA-GEN)** — generador real de escenas 2D procedurales con exportación de anotaciones YOLO/COCO.

*Datos y Analítica*
- **[HYDRA-UMC-DATALAKE](https://github.com/JuanenRac/HYDRA-UMC-DATALAKE)** — almacén de series temporales real respaldado por sqlite3, con una API HTTP real de ingesta/consulta.
- **[HYDRA-UMC-ANOMALY-DETECTOR](https://github.com/JuanenRac/HYDRA-UMC-ANOMALY-DETECTOR)** — detector de anomalías real basado en FFT + línea base estadística, con monitorización de deriva.
- **[HYDRA-UMC-PRODUCTION-REPORTS](https://github.com/JuanenRac/HYDRA-UMC-PRODUCTION-REPORTS)** — cálculo real de OEE/disponibilidad sobre el histórico de DATALAKE, con exportación CSV reproducible.
- **[HYDRA-UMC-TELEMETRY-COLLECTOR](https://github.com/JuanenRac/HYDRA-UMC-TELEMETRY-COLLECTOR)** — pipeline real de ingesta CAN/WebSocket hacia DATALAKE, con deduplicación por secuencia.

*Pasarela Industrial*
- **[HYDRA-UMC-GATEWAY-INDUSTRIAL](https://github.com/JuanenRac/HYDRA-UMC-GATEWAY-INDUSTRIAL)** — nodo de integración que retransmite a protocolos industriales, con una capa real de lista blanca de comandos/contrapresión.
- **[HYDRA-UMC-OPCUA-SERVER](https://github.com/JuanenRac/HYDRA-UMC-OPCUA-SERVER)** — espacio de direcciones OPC-UA real, verificado con una sesión de cliente real del protocolo binario.
- **[HYDRA-UMC-MQTT-BROKER](https://github.com/JuanenRac/HYDRA-UMC-MQTT-BROKER)** — broker MQTT real con autenticación por cliente opcional y ACL de tópicos.
- **[HYDRA-UMC-MTCONNECT-ADAPTER](https://github.com/JuanenRac/HYDRA-UMC-MTCONNECT-ADAPTER)** — endpoints XML reales `/probe` y `/current` de MTConnect, con salida en modo degradado.

*Herramientas Complementarias y Operaciones del Ecosistema*
- **[HYDRA-UMC-TOOL-CLI](https://github.com/JuanenRac/HYDRA-UMC-TOOL-CLI)** — CLI de flota con un contrato real y estable de códigos de salida, cliente real y en vivo de la propia API de HYDRA-UMC-SERVER.
- **[HYDRA-UMC-WATCH](https://github.com/JuanenRac/HYDRA-UMC-WATCH)** — app compañera de WearOS con patrones de alerta háptica y un relé de voz al teléfono emparejado (todavía no ejecutada en un reloj físico).
- **[URTC-SMART-RACK](https://github.com/JuanenRac/URTC-SMART-RACK)** — firmware para un rack de montaje de placas con decodificación real de ID de herramienta y lógica de precalentamiento Smart Idle.
- **[URTC-VISION-TOOL](https://github.com/JuanenRac/URTC-VISION-TOOL)** — firmware más un compañero de visión real en Python para un cabezal de inspección térmica/RGB.
- **[HYDRA-UMC-UPDATER](https://github.com/JuanenRac/HYDRA-UMC-UPDATER)** — herramienta administrativa de escritorio que descubre, clona y actualiza cada repositorio de este ecosistema.
- **[HYDRA-UMC-OS-REBUILDER](https://github.com/JuanenRac/HYDRA-UMC-OS-REBUILDER)** — herramienta de escritorio Windows/Linux que construye una imagen de la CM5 lista para grabar, precargada con las versiones más actuales del ecosistema, con configuración de primer arranque de Wi-Fi/usuario/SSH al estilo de Raspberry Pi Imager.
- **[HYDRA-UMC-OPS-AGENT](https://github.com/JuanenRac/HYDRA-UMC-OPS-AGENT)** — coordinador de incidencias de mantenimiento: un rol edge de bajo privilegio recopila un snapshot de inventario/salud saneado, un rol control-plane lo renderiza de solo lectura y pide a un proveedor de IA que sugiera un diagnóstico - nunca aplica un parche ni despliega nada.
- **[HYDRA-UMC-DEV-SERVER](https://github.com/JuanenRac/HYDRA-UMC-DEV-SERVER)** — host de desarrollo reproducible (Raspberry Pi 5 / CM5) que almacena el código del ecosistema y ejecuta tareas acotadas de compilación/pruebas bajo una cola duradera; un rol de desarrollo dedicado, explícitamente distinto de un CM5 operativo.

En conjunto, el ecosistema de este autor abarca muchos proyectos más allá de este - lo anterior es un mapa, no una lista exhaustiva de funciones; consulta el propio README de cada repositorio para saber qué hace realmente hoy.

## 📚 Documentación

Dónde leer más:

* [Base de seguridad del ecosistema](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md)
* [Modelo de amenazas del ecosistema](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md)
* [Historial de cambios de este repositorio](CHANGELOG.md)
* [Licencia de este repositorio](LICENSE.md)

## 🤝 Contribuir y comunidad

* Antes de un pull request ejecuta `HYDRA_UMC_CI=1 py -3 tools/ci_validate.py` (o `HYDRA_UMC_CI=1 python3 tools/ci_validate.py`): debe imprimir `CI_VALIDATION=PASS`. No ejecutes `build.sh` ni `build.bat` para esta comprobación; compilar no es comprobar.
* Los ocho README se escriben desde una sola fuente en HYDRA-UMC-DOCS; no los edites a mano. Cambia la fuente y vuelve a escribirlos con `tools/make_readmes.py`.
* No afirmes en un README lo que no se ha ejecutado: di «simulado» o «sin probar en hardware» cuando esa sea la verdad.
* Mira [CONTRIBUTING.md](CONTRIBUTING.md), el [código de conducta](CODE_OF_CONDUCT.md), [SECURITY.md](SECURITY.md) y [SUPPORT.md](SUPPORT.md).

## 👤 AUTOR

**JuanenRac (Electro Hobby 3D)** · electrohobby3d@gmail.com

## 📜 LICENCIA

GPL-3.0-or-later - [LICENSE](LICENSE).
