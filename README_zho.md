<!-- =============================================================================
HYDRA-UMC-STUDIO - Web control dashboard of the HYDRA-UMC multi-robot micro-factory
Copyright (C) JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
GPL-3.0-or-later - see LICENSE
============================================================================= -->

<p align="center">
  <img src="images/HYDRA_UMC_BANNER.svg" alt="HYDRA-UMC-STUDIO banner" width="100%">
</p>

# 🤖 HYDRA-UMC-STUDIO

<p align="center"><a href="README.md">🇺🇸 English</a> | <a href="README_spa.md">🇪🇸 Español</a> | <a href="README_fra.md">🇫🇷 Français</a> | <a href="README_ita.md">🇮🇹 Italiano</a> | <a href="README_deu.md">🇩🇪 Deutsch</a> | 🇨🇳 <b>简体中文</b> | <a href="README_jpn.md">🇯🇵 日本語</a> | <a href="README_por.md">🇵🇹 Português</a></p>

### 🤖 HYDRA-UMC 多机器人微工厂的网页版控制仪表盘

<p align="center">
  <img src="https://img.shields.io/badge/License-GPL%203.0--or--later-blue.svg" alt="GPL 3.0 or later">
  <img src="https://img.shields.io/badge/Framework-React%2019-61DAFB.svg" alt="Framework">
  <img src="https://img.shields.io/badge/Tool-Vite-646CFF.svg" alt="Tool">
  <img src="https://img.shields.io/badge/3D-Three.js-black.svg" alt="3D">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6.svg" alt="Language">
  <img src="https://img.shields.io/badge/Tests-664%20passing-2ea44f.svg" alt="Tests">
  <img src="https://img.shields.io/badge/Version-0.8.0.3-0f6cbd.svg" alt="Version">
  <img src="https://img.shields.io/badge/Maturity-functional-0F6CBD.svg" alt="Maturity">
</p>

---

> **安全与安防现状:**本生态系统不是经认证的安全系统。目前尚无硬件 E-STOP 通路,没有由固件强制执行的限位或联锁,也没有经过验证的运动指令;固件映像使用 CRC-32 和 Ed25519 签名校验,发布构建会拒绝已公开的开发密钥(中继之后的工具头和扩展板仍运行 URTC 的引导程序,它们使用共享密钥的 HMAC-SHA256 而不是签名);TLS 与双向 TLS 均为可选项,默认关闭;自制电路板尚未组装或测试。在依赖此处任何说法来保障人身安全之前,请先阅读[安全基线](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md)和[威胁模型](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md)。

---

## 📋 速览

| | |
|---|---|
| 版本 | `0.8.0.3` |
| 成熟度 | 可用 |
| 测试 | 664 (`npm test`) |
| 技术栈 | React 19 / Vite / Three.js / Tailwind CSS |
| 目标 | HYDRA-UMC 工作单元的 Raspberry Pi CM5 |
| 真实硬件 | 已在试验台上运行：上面的诚实性检查说明了哪些部分在真实硬件上运行过 |

**跳转：** [概述](#-概述) · [架构](#-架构) · [功能](#-功能) · [安全与防护](#-安全与防护) · [接口](#-接口) · [配置](#-配置) · [快速开始](#-快速开始) · [测试](#-测试) · [故障排除](#-故障排除) · [仓库结构](#-仓库结构) · [相关项目](#-相关项目)

## 🚦 项目状态

每一行是本仓库的一个部分，灯号表示它今天做到了哪一步。内容依据仓库能够展示的证据（测试、构建、运行），而不是计划。

🟢 已完成并验证 · 🟡 可用，有已知限制 · 🟠 部分完成或尚未验证 · 🔴 未完成或不可用

| 领域 | 状态 | 在这里的含义 |
|---|---|---|
| 软件 | 🟡 | 主要用途可用；上面的诚实性检查列出了仍然缺少的内容 |
| 测试 | 🟢 | 664 项自动测试，每次变更都会运行 |
| 真实硬件 | 🟡 | 已在试验台上运行：上面的诚实性检查说明了哪些部分在真实硬件上运行过 |
| 文档 | 🟢 | 八种语言的 README，每次变更都会与清单核对 |

## 🎯 概述

**HYDRA-UMC STUDIO** 是 [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)——多机器人微工厂主板（Raspberry Pi CM5 主机 + 双核 STM32H745 实时协处理器，通过单一 FDCAN 总线协调最多 8 个分布式机器人手臂）——的浏览器端控制仪表盘。HYDRA-UMC 自身的仓库涵盖硬件与固件，而本仓库则是面向人的一侧：一个单页 React 应用程序，以真实的 3D 方式可视化每一个机器人、点动并记录其运动、管理机器人单元周边的机器与配件，并对整条 CAN-OTA 固件链进行刷写/测试——所有这些都在一个浏览器标签页中完成，除 Node.js 外无需任何原生安装。

**诚实说明，与本生态系统其余文档所采用的惯例一致：** HYDRA-UMC 自身的真实硬件尚不存在于经过测试的芯片形态（其引导程序编译干净，但尚未在真实板卡上运行过——参见该仓库自身的 `docs/architecture.md`）。因此，本仪表盘的 CAN-OTA Flasher/Tester 工具是针对一套完整的内置仿真运行的，该仿真遵循每一层已记录的真实寻址方案，而不是假装在与并不存在的硬件通信。3D 机器人可视化、运动学、轨迹记录以及每一个配件控制面板都是完全真实且独立于此的——目前仅 CAN-OTA 传输本身是被仿真的。

使用 **React 19**、**Vite**、**Three.js**（通过 `@react-three/fiber`/`@react-three/drei`）和 **TypeScript** 构建——一个纯粹的客户端，自身不含任何后端代码。持久化状态存放在本应用通过网络通信的独立后端 **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** 上。

## 🧩 在 HYDRA-UMC 中的角色

**HYDRA-UMC-STUDIO** 是单元的 Web 控制面板：用真实运动学以 3D 绘制每个机器人，点动并录制轨迹，操作附件和机器面板，通过 CAN-OTA 链刷写并测试固件，并管理服务器，支持八种语言。它不保存自己的状态，也不做任何安全决定：角色、限制、预约和停止都由 HYDRA-UMC-SERVER 决定。

## 🏛️ 架构

<p align="center">
  <img src="images/architecture.svg" alt="HYDRA-UMC-STUDIO architecture" width="100%">
</p>

## 🖼️ 屏幕截图

在测试台上以 1920×1080 截取，使用示例数据，背后没有真实的安装。

<table>
<tr><td width="50%" valign="top"><img src="images/screenshots/overview.png" alt="概览：微型工厂的八个机器人节点，包含其角色、型号和工具，底部状态栏显示机器状态。" width="100%"><br><sub>概览：微型工厂的八个机器人节点，包含其角色、型号和工具，底部状态栏显示机器状态。</sub></td><td width="50%" valign="top"><img src="images/screenshots/robot-view.png" alt="机器人视图：关节控制、XYZ 点动、机械臂的 3D 模型，以及带有已记录点位的轨迹面板。" width="100%"><br><sub>机器人视图：关节控制、XYZ 点动、机械臂的 3D 模型，以及带有已记录点位的轨迹面板。</sub></td></tr>
<tr><td width="50%" valign="top"><img src="images/screenshots/xy-table.png" alt="XY 工作台：工作台尺寸、带步长的点动按钮和各轴的实时 3D 视图。" width="100%"><br><sub>XY 工作台：工作台尺寸、带步长的点动按钮和各轴的实时 3D 视图。</sub></td><td width="50%" valign="top"><img src="images/screenshots/flasher-studio.png" alt="Flasher Studio：选择开发板和机器人插槽，选择固件文件并通过 CAN 烧录；此处为模拟模式，不会向任何板子发送数据。" width="100%"><br><sub>Flasher Studio：选择开发板和机器人插槽，选择固件文件并通过 CAN 烧录；此处为模拟模式，不会向任何板子发送数据。</sub></td></tr>
<tr><td width="50%" valign="top"><img src="images/screenshots/tester-center.png" alt="Tester Center：开发板的状态 LED、持久化检查、工具遥测、自检和原始总线监视器。" width="100%"><br><sub>Tester Center：开发板的状态 LED、持久化检查、工具遥测、自检和原始总线监视器。</sub></td><td width="50%" valign="top"><img src="images/screenshots/safety-limits.png" alt="安全限制：点动的启用、预约规则，以及按机器人型号设置的点动和热床温度上限，均保存在服务器中。" width="100%"><br><sub>安全限制：点动的启用、预约规则，以及按机器人型号设置的点动和热床温度上限，均保存在服务器中。</sub></td></tr>
</table>

## ✨ 功能

### 多机器人 3D 控制

同时管理多个独立的 6 自由度机器人，每一个都拥有自己真实的 3D 模型、运动学和点动/轨迹状态。型号选择器（RobotDetail → Config 选项卡）按制造商对所有可用机器人进行分组：

- 🏭 **Source Robotics** —— Parol6、Faze4（网格分别采用 MIT 与 GPL-3.0 许可，参见各型号自身的 `ATTRIBUTION.txt`）
- 🏭 **Annin Robotics** —— AR3、AR4（MIT 许可网格）
- 🏭 **Universal Robots** —— UR3e、UR5e、UR10e、UR16e、UR20 —— 官方几何数据、关节限位和连杆运动学直接取自 Universal Robots 自身的 [Universal_Robots_ROS2_Description](https://github.com/UniversalRobots/Universal_Robots_ROS2_Description) 仓库（BSD-3-Clause），涵盖其 e-Series 系列从小到大的负载范围
- 🏭 **Universal Robots（经典系列）** —— UR3、UR5、UR10 —— e-Series 之前的 CB 系列，官方几何数据/DH 参数取自 Universal Robots 自身的 [universal_robot](https://github.com/ros-industrial/universal_robot) ROS-Industrial 仓库（BSD-3-Clause）
- 🏭 **UFACTORY** —— xArm6、Lite 6（BSD-3-Clause 许可网格，官方 [xarm_ros2](https://github.com/xArm-Developer/xarm_ros2) 几何数据/运动学）
- 🏭 **Comau** —— e.DO（BSD-3-Clause 许可网格，官方 [eDO_description](https://github.com/ianathompson/eDO_description) 几何数据/运动学）
- 🏭 **Kinova** —— Gen3 Lite、Gen2（BSD-3-Clause 许可网格，官方 [ros2_kortex](https://github.com/Kinovarobotics/ros2_kortex) 几何数据/运动学）
- 🏭 **FANUC** —— M-710iC（BSD-3-Clause 许可网格，官方 [fanuc_m710ic_description](https://github.com/robot-descriptions/fanuc_m710ic_description) 几何数据/运动学）
- 🏭 **The Robot Studio** —— SO-ARM100，一款 5 自由度（非 6）低成本机械臂（Apache-2.0 许可网格，官方 [SO-ARM100](https://github.com/TheRobotStudio/SO-ARM100) 几何数据/运动学）
- 🏭 **AgileX** —— PiPER（Apache-2.0 许可网格，官方 [agilex_piper_arm_description](https://github.com/renesas-rdk/agilex_piper_arm_description) 几何数据/运动学）
- 🏭 **Unitree** —— Z1（BSD-3-Clause 许可网格，通过 Google DeepMind 的 [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie)——该仓库中每个机器人文件夹均保留其原始制造商许可）
- 🏭 **Trossen Robotics** —— ViperX 300、WidowX 250（BSD-3-Clause 许可网格，官方 [interbotix_ros_manipulators](https://github.com/Interbotix/interbotix_ros_manipulators) 几何数据/运动学）
- 🏭 **Koch / Low-Cost Robot Arm** —— Koch v1.1，另一款 5 自由度（非 6）低成本机械臂（Apache-2.0 许可网格，通过 [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie)）
- ⚙️ **通用** —— 适用于任何没有专属型号的装置的简化双连杆机械臂

也就是横跨 13 家制造商的 24 个真实机器人型号，外加通用占位型号——具体的型号↔制造商↔许可证映射汇总见下方的许可证表。每一个真实型号（除通用型号外的全部）都会为每个连杆加载其实际的 STL 网格几何，并通过该制造商自身真实的关节变换链驱动它——而非风格化的占位符。正向/逆向运动学是针对每个机器人自身真实的几何数据进行计算的（位置采用牛顿-拉夫逊求解，在机器人自身定义了限位的地方使用真实的每关节限位），因此一条已记录的轨迹或一个点动的笛卡尔目标，会像真实的物理机器人那样移动正确的机械臂。Universal Robots 的 5 个 e-Series 型号还共享同一个通用的正向/逆向运动学引擎（`src/examples/urKinematicsShared.ts`）和同一个通用的 3D 装配渲染器（`src/components/3d/URArm.tsx`），因为每一个 UR e-Series 关节都共享完全相同的运动学结构——每个型号之间只有数值上的连杆长度不同。3 个经典 UR 型号（UR3/UR5/UR10）则共享它们自己独立的引擎和渲染器（`src/examples/urClassicKinematics.ts`、`src/components/3d/UrClassicArm.tsx`），因为那一代较早的关节并不像 e-Series 那样都共享一个共同的局部 Z 轴。

每个机器人的点动控制在每根轴上都包含用于**速度**和**加速度**的旋钮 + 滑块，还有完整的限位/状态读数，一旦 CAN-OTA 与真实硬件连通后，还会附带一张实时的“机器人控制器板”状态卡。每个旋钮/滑块都会吸附到其自身组合框中所选的点动**步进**值（0.1° 到 100°/mm），而非连续移动。机器人 **A1** 是一种不同布局的实验性概念验证：其速度/加速度/J1-J6/XYZ 点动控制位于 3D 视口本身上方的一个可拖动浮动面板中（XYZ 面板对应 `Joystick3D.tsx`），而不是所有其他机器人仍在使用的下方面板——参见 `src/components/robots/A1.tsx`。

### 运动大脑阶段

一个专用的控制面板，用于 HYDRA-UMC 主板自身的本地运动子系统——STM32H745 直接驱动的各轴，与 STACK A 上的分布式机器人手臂相独立：

- 📐 **XY 龙门架** X、Y1、Y2（双 Y 龙门架）和 Z 轴的点动控制
- 🔥 **热床** 控制（SSR 切换，230VAC）
- 🔄 **ATC 转塔** —— 由 E0 驱动的自动换刀装置的旋转工具索引控制
- 🎢 **传送带** —— 由 E1 驱动的传输带的安装/运行/速度控制
- 🛑 完整的 12 路限位开关网格、3 路风扇通道，以及用于流体处理的 10 个泵/10 个阀门

### 配件与机器控制面板

面向机器人单元周边机器与配件的专用面板：**XY 工作台**、**ATC 工具**、**工具架管理器**、**拾取放置**（包括 JuanenPnP/LumenPnP 专属配置）、**CNC**（包括 JuanenCNC 专属配置）、**激光**（包括 JuanenLaser 专属配置）、**真空台**，以及**热床**。

---

### 🧩 可选真空台模型

在真空台菜单中选择六种真实STL模型之一：160 × 120、230 × 210、230 × 250、232 × 217、240 × 240或250 × 250 mm。底座厚15 mm，含定位壁的总高度为16.2 mm。宽度和长度可按5 mm步长调整（10–5000 mm）。仅缩放平面尺寸，厚度保持不变。选择预设模型可恢复原始尺寸。自定义尺寸通过SERVER同步；缩放后的孔和通道仅用于布局显示，并非重新生成的制造用STL。切换型号保留位置、泵和阀门状态；重置选择160 × 120 mm并关闭泵和阀门。旧型号或未知型号ID显示第一个模型。STUDIO和SUITE的两种界面使用相同目录以及机器人配置中的modelId。

[型号、配置与重新生成指南](docs/VACUUM_TABLE_MODELS.md).

### 🔥 加热床模型

四种STL预设：100×100、200×100、200×200和255×255 mm，厚度均为5 mm。宽度和长度可按5 mm步长调整（25–5000 mm）；选择预设会恢复尺寸，但不会改变加热状态。仅供可视化，不是电气或制造设计。

[加热床模型 — STL / OpenSCAD](docs/HEATED_BED_MODELS.md).

### 🗄️ 可配置的 STL 料架

STL 料架：宽度和深度为 40–1000 毫米，以 1 毫米递增；可放置 1–24 块电路板，固定间距为 10 毫米。这些是显示设置，并非机器人标定。

[可配置的 STL 料架 — STL / OpenSCAD](docs/RACK_MODELS.md).

### 🛠️ 独立的机器模型

JuanenPnP、JuanenCNC 和 JuanenLaser 使用独立的 STL 副本，LumenPnP 保留原始模型。请在各自文件夹中编辑模型。显示采用 CAD 尺寸，原有尺寸设置不会拉伸模型。

[独立的机器模型 — STL](docs/MACHINE_ASSETS.md).

这些原创JuanenPNP / HYDRA-UMC模型及其SCAD源文件采用GPL-3.0；它们不是Opulo机器的CAD文件。

### 工作与轨迹

加载预置的示例轨迹，实时点动并记录你自己的点位，或按机器人加载/保存/编辑/回放复杂的多点轨迹（JSON）。轨迹在不同机器人型号之间是可移植的——每一个已记录的点位都会在加载/绘制/播放时通过该特定机器人自身真实的运动学（`src/examples/robotKinematicsDispatch.ts`）进行解析，而不是针对当初记录它的那个机器人被固化，因此同一个轨迹文件能够沿着 Parol6 和 UR10e 各自真实的可达几何正确驱动它们。

### CAN-OTA 固件工具

从一个仪表盘对整条 HYDRA-UMC + URTC CAN-OTA 链进行刷写和自检，提供两个专用入口：

- **URTC → Flasher / Tester** —— 面向 URTC 工具头板及其自身的扩展板（与独立的 [URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)/[URTC Tester](https://github.com/JuanenRac/URTC-TESTER) 桌面工具自身的协议覆盖范围一致）
- **HYDRA-UMC → Flasher / Tester** —— 面向机器人控制器板与运动大脑两个层级，全程从 CM5 → SPI → STM32H745 → FDCAN1 → 机器人控制器板 → CAN → URTC 工具头进行中继，无需 JTAG/SWD 探针，也无需 USB-CAN 适配器（完整的寻址/中继设计参见 [HYDRA-UMC 自身的 `docs/architecture.md`](https://github.com/JuanenRac/HYDRA-UMC/blob/main/docs/architecture.md)）

两者都可以直接从 GitHub 下载真实的固件版本（基于 `firmware_manifest.json`，经 CRC32 校验），面向 `URTC` 或 `HYDRA-UMC` 仓库均可。如上所述，在真实的 STM32H745 固件存在于真实硬件上并可供通信之前，传输本身运行于一套完整的内置仿真。

### 手柄支持

支持 USB 和蓝牙控制器集成，具有自定义的按键/轴映射，可在不使用鼠标/键盘的情况下点动机器人和配件。实时操作(关节/工作台点动、E-STOP、START/STOP、回放速度)会触发与机器人详情面板中点动按钮相同的原子 `sendRobotCommand()` 路径,而不是防抖动的设置保存——参见 `GamepadController.tsx`。

### 摄像头集成

最多支持 8 路同步实时画面（USB 视觉或 MLX90640/41/42 系列热成像传感器），并附带录制与推理状态——这正是 HYDRA-UMC 自身双 USB 3.0 集线器子系统所围绕构建的摄像头矩阵。

### 多语言界面

界面完整翻译为**英语、西班牙语、德语、法语、意大利语、简体中文、日语和葡萄牙语**（`src/locales/`），包括应用内带分步指南的帮助菜单、助手、“关于”对话框（版本/作者/许可证）以及系统配置对话框的每个标签页。目前尚未覆盖每个界面的 100%：少数独立的附属面板仍是硬编码的英文。

### 帮助、指南与助手

帮助窗口有一个**分步指南**标签页：每个任务一份指南（添加控制器、移动机器人、记录轨迹、使用摄像头、刷写固件、管理用户、远程访问、安全等），每份都有级别（基础、进阶、技术）、搜索框和一个跳转到执行该任务的界面的按钮。助手**Hydri**是漂浮在仪表板上方的小型动画吉祥物：它讲解你所在的界面，一步步带你完成任务，在不使用服务器和 AI 模型的情况下回答用文字输入的问题（支持全部 8 种语言），可用浏览器自带的语音朗读回答，可拖到任意位置并固定，并可在帮助窗口中开启或关闭。它的偏好保存在浏览器中（`src/assistant/`）。

### ℹ️ 关于与系统配置

两个独立的对话框，均可从头部（`Config`/`About` 按钮）访问：**About** 显示当前运行的应用版本（实时读取自 `GET /api/hydra-info`）、作者和许可证；**Config** 涵盖服务器身份、控制器/节点管理、界面主题 + 语言、机器人重命名、摄像头↔机器人映射（含冲突检测）、自定义 URDF 库、第三方软件集成（OpenPnP/CNC/激光后端）、逐客户端远程访问（SUITE/安卓/iOS 各自独立的开关）、用户账户、每个机器人的工作目录、CAN-OTA 传输，以及手柄映射——每一项都是自己的选项卡。两者都是各自独立的组件（`src/components/About.tsx`、`src/components/Config.tsx`），并未内联到主仪表盘外壳中。

### 可靠性

本应用为自身抵御两类不同的运行时故障，二者都源自一次真实的生产事故（一次重新部署后信息亭屏幕变黑）。`src/main.tsx` 监听 Vite 自身的 `vite:preloadError` 事件——当一个跨越重新部署仍保持打开的浏览器标签页，尝试获取一个通过 `React.lazy()` 加载的面板代码块（`Dashboard.tsx` 中的每个面板，按 `vite.config.ts` 做了内容哈希）、而该代码块在其旧哈希下已不复存在时触发——并自动重新加载一次页面，使长期运行的信息亭标签页或过期的后台标签页在无人察觉的情况下自我修复。一个 `sessionStorage` 保护机制可防止在代码块因其他原因确实缺失时陷入无限重载循环。另外，`src/components/ErrorBoundary.tsx` 包裹了 `<Suspense>` 面板区域，作为其他任何渲染崩溃的后备方案；它按当前活动标签页进行索引，因此切换离开一个已崩溃的面板会真正重试下一个面板，而不会让整个仪表盘卡在回退画面上。
命令不会静默失败:每个点动、播放、电源、视觉和工具命令都会返回带类型的结果,过期的会话会刷新一次并重试,仍被拒绝的内容会显示在横幅中。红色 **STOP** 按钮是全局的:单击即可,无需确认,一次调用(`POST /api/stop-all`)就会停止所有控制器的所有机器人,并关闭所有阀门和泵。它位于页眉和页脚、机器人面板以及远程控制覆盖层中,也可用 Ctrl+Shift+空格从键盘按下(这个组合键不会被误输入,按住不放时会被忽略)。结果按机器人逐个列出(有机器人未停止或服务器无法保存停止时给出警告;被其他账户预约的机器人会被标出);网络故障会重试一次,超出限制(429)或没有该路由(404)的服务器改用逐个机器人停止,并且“STOP 未确认”的持续警告会一直保留到之后的某次 STOP 得到应答。摇杆点动是按住式的死人开关(指针取消、窗口失焦、标签页隐藏或 8 秒后结束),J1 的移动保持在最接近的等效角度,超过 20 度的点动步长会被拒绝。手柄输入跟随界面中选中的机器人,并限制发送频率。发布版固件在 CAN-OTA 刷写前会用 sha256 校验,引导加载程序镜像为可选项,导入的轨迹和场景在进入共享状态之前会被验证。

对每个客户端而言，谁可以移动机器人以及移动多远，都由服务器决定。机器人可以为提出请求的账户和窗口（每个窗口选定一个控制器 ID）**预留**：同一账户在另一个窗口，或另一个账户，都会被拒绝，并附带说明具体情况的消息（`other-controller`、`other-account`、`controller-id-required`），预留列表来自 `GET /api/claims`，管理员可以接管机器人。点动的大小、绝对点动的范围和热床的最高目标温度从 `GET /api/safety-limits` 读取，而不是保存在应用中；管理员可在 **生态系统 > 安全限制** 中按型号编辑它们，同时可设置可选的点动启用（默认关闭；开启后，按钮会在限定时间内启用点动）和必填的控制器 ID。每个机器人都有一个 **Live / Sim** 开关（默认 Live）：在 Sim 下，该窗口不会发送任何会移动机器人或接通设备的内容，而 STOP 始终有效。包含机械臂无法到达的点的 Work 或示例会被拒绝并列出这些点，也可以改为缩放到该型号的工作范围。 预约列表也会由服务器通过 WebSocket 推送（`claims` 消息，面向请求了 `remoteApiVersion=2` 的连接），因此访问栏会立即显示变化，而不必等下一次轮询；推送到达期间，轮询只偶尔运行。 写入是有条件的:每次写入都带有此窗口最后看到的机器人修订号(`If-Match`),如果期间有其他人修改了机器人,服务器返回 412,机器人会被重新读取,横幅会提示(标准模式检查预约、工作台和一次性命令;严格模式检查除 STOP 外的全部命令;关闭则不检查;STOP 永远不检查)。XY 工作台使用原子的 `table` 命令移动,管理员可在 **生态系统 > 审计记录** 中读取仅追加的审计记录并校验其 SHA-256 链。

### 账户与访问

每个后端在自身首次启动时都会预置一个账户——用户名 `admin`，密码 `admin`——一旦服务器可从完全受信任的局域网之外访问，请立即从 **Config > Users** 修改它。同一个选项卡还允许管理员账户创建额外的**操作员**账户：操作员可以登录、查看实时状态并驱动机器人（点动/播放/暂停/停止/工具/阀门/泵/速度），但不能覆盖全局设置或管理其他账户。仅仅四处浏览并不需要任何账户——登录界面自身的“以只读方式继续”会直接跳转到仪表盘,写入功能被禁用。完整契约（角色、令牌、`/api/users` 路由）记录于 [HYDRA-UMC-SERVER 自身的 `docs/REMOTE_API.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md) 第 2a/2b 节。 在生产环境中，第一个管理员来自部署的引导设置，服务器会拒绝示例密钥（参见 [HYDRA-UMC-SERVER 的 `docs/PRODUCTION_BOOTSTRAP.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/PRODUCTION_BOOTSTRAP.md)）。

5 个远程客户端（SUITE、Android、iOS、Watch、DSI）中的每一个都通过 `X-Hydra-Client` 请求头自我标识，因此 **Config > Remote Access** 可以独立允许或阻止每一个,而不是所有五者共用一个开关。

**Server Admin** 有一张**两步登录**卡片，用于您当前登录的账户(在其所有者开启之前是关闭的):密码、otpauth 地址的二维码(在应用内绘制，无需额外软件包)和可手动输入的密钥、验证器应用的第一个验证码，以及只显示一次的十个一次性恢复码。已开启的账户在登录表单中会被要求输入验证码，管理员可以在 **Config > Users** 中为同时丢失手机和恢复码的账户移除第二步。

### 持久化状态

HYDRA-UMC STUDIO 本身是一个纯客户端——除了当前会话在内存中的内容外，它不持有任何自身的状态。所有持久化数据（`settings.json`、`users.json`、`WORKS/` 下保存的轨迹、已提交的模型）都存放在本应用通过网络通信的独立后端 **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** 上（完整情况参见该项目自身的 `data/` 目录和 README）——状态在页面重新加载或本应用自身重新部署后依然保留,因为这两者都完全不会触碰后端进程。`settings.json` 本身被刻意排除在该后端的静态文件服务之外（它保存控制器 IP、CAN-OTA 配置和每个机器人的完整状态），即便其 `WORKS/` 文件夹是正常提供服务的。

登录只在浏览器标签页存在期间有效:会话及其刷新令牌保存在 `sessionStorage` 中,关闭标签页即结束。登录选项 **在此设备上保持登录** 会改为把它们保存在 `localStorage` 中,重启浏览器后仍然有效(默认关闭)。生产页面带有作为 meta 标签的 Content-Security-Policy(脚本仅来自页面自身,不允许内联脚本和插件);构建时设置 `HYDRA_STUDIO_CSP=off` 可省略它,适用于自行设置响应头的部署,其他任何值都会按原样用作策略。

同一套 `GET`/`POST /api/settings` 契约，加上一个发现端点（`GET /api/hydra-info`）和一个用于实时推送更新的 `WebSocket /ws`，也是外部客户端连接到同一个后端的方式——这正是 [HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) 能够在网络上发现一个正在运行的 HYDRA-UMC SERVER 实例、读取/修改其状态,并实时看到本应用自身浏览器标签页所做更改的原因（反之亦然）。完整契约见 [HYDRA-UMC-SERVER 自身的 `docs/REMOTE_API.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md)。

`GET /api/system/metrics` 驱动概览仪表盘页脚：CPU 负载和内存使用始终是真实的（Node 自身的 `os` 模块）；在真实的 Raspberry Pi 上运行时,温度读取真实的 `vcgencmd measure_temp` 输出,否则回退为明确标记的模拟值（响应中的 `temp_is_real`）；Wi-Fi/以太网/蓝牙状态读取自 `/sys/class/net`/`/sys/class/bluetooth`（仅限 Linux,在任何其他主机上为 `null`/未知,而非猜测值）。

## 🔒 安全与防护

| 威胁 | 防御 | 位置 |
|---|---|---|
| 页面中运行被注入的脚本 | 构建会在页面中加入 Content-Security-Policy：脚本只能来自页面本身（外加 WebAssembly 和 3D 解码器主机），禁止 object，base 和表单限于页面；`HYDRA_STUDIO_CSP` 可将其关闭或替换 | `scripts/csp.ts`, `vite.config.ts` |
| 从存储中被读回的登录令牌 | 在此输入的登录保存在 `sessionStorage`（刷新后仍在，关闭标签页后消失）；只有勾选“保持登录”时才存入 `localStorage`。地址中传来的令牌只进入 `sessionStorage`，通过浏览器从不发送的 `#token=` 片段传入，读取后立即从地址中删除 | `src/lib/session.ts` |
| 两名操作员修改同一机器人 | 每个机器人都有修订号：写入时通过 `If-Match` 发送，过期的会被 412 拒绝；工作台原子移动；预约和谁能点动由服务器对所有客户端统一决定 | `src/lib/revisions.ts`, `src/lib/tableMove.ts`, `src/lib/robotEdits.ts` |
| 等待确认或慢速界面的停止 | 红色 STOP 是全局的且不做任何询问：一次 `POST /api/stop-all` 即停止所有机器人并关闭所有阀门和泵；若路由被限流或不存在，则退回到逐个机器人停止，没停下的机器人会在横幅中显示 | `src/lib/stopAll.ts`, `src/components/StopAll.tsx` |
| 误降低了某个访问选项（语音、MAVLink、蓝牙、TLS 等） | Server Admin 显示每个值的来源，并锁定由服务器环境设置的值；降低某项需要确认，保存后警告会一直显示：复述所说内容的语音回复、识别置信度为 0、未签名的 MAVLink 消息，或关闭 MAVLink 签名 | `src/components/AdminServer.tsx`, `src/lib/serverSecurity.ts` |
| 面板损坏或重新部署后页面过期导致黑屏 | 每个标签页都有自己的错误边界；部署后遇到过期分块会自动重新加载一次（带保护，真正缺失的文件不会造成循环） | `src/main.tsx`, `src/components/ErrorBoundary.tsx` |

**它绝不做的事：** 决定安全。它不保存自己的状态，也不是硬件紧急停止路径；运动学大脑阶段和 CAN-OTA 工具只在内置模拟上运行过。

## 🔌 接口

| 主题或路由 | 内容 |
|---|---|
| `/api/login`, `/api/refresh`, `/api/logout` | 登录、令牌过期时续期一次、退出 |
| `/api/settings`, `/api/robot/:id`, `/api/robot/:id/command` | 状态树和带类型的命令（点动、播放、工具、阀门、泵、视觉），带 `If-Match` |
| `/api/robot/:id/claim`, `/release`, `/jog-arm`, `/api/claims` | 为此账户和窗口预约机器人、释放、启用点动、列出谁持有什么 |
| `/api/stop-all`, `/api/safety-limits` | 全局停止和服务器强制执行的安全限制 |
| `/ws` | 状态实时推送（令牌作为 `hydra.bearer` 子协议，`remoteApiVersion=2`） |
| `/api/camera/*`, `/api/cameras/status` | 摄像头流、快照、录像、PTZ 和短时有效的图像票据 |
| `/api/hardware/canota/version`, `/api/hardware/canota/flash` | Flasher 和 Tester 使用的 CAN-OTA 链（在真实板卡出现前是完整的模拟） |
| `/api/admin/server-config`, `/api/admin/clients`, `/api/admin/logs`, `/api/audit` | Server Admin：访问开关、已连接的应用、服务器日志和审计记录（管理员） |

## ⚙️ 配置

设置分两类：此应用的构建和浏览器设置，以及 Server Admin 编辑的服务器访问开关（服务器的环境变量优先于已保存的值；画面会显示哪一个生效并锁定其余的）。

| 变量 | 默认值 | 设置内容 |
|---|---|---|
| `HYDRA_STUDIO_CSP` | `default` | 构建时：`default`、`off`（无策略，适用于自行设置标头的主机）或自定义的完整策略 |
| `VITE_API_BASE_URL` | 本页面主机的 3000 端口 | 构建时：服务器不在同一主机时的位置（见 `.env.example`） |
| `server.proxy` (`vite.config.ts`) | `localhost:3000` | 仅开发服务器：把 `/api`、`/ws` 和 `/WORKS` 转发到服务器，无需配置 CORS |
| `aiAccess` | `open` | 谁可以使用本地 AI 中继：`open` 为任何已登录账户，`admin` 仅管理员 |
| `infoAuth` | 关闭 | 对只读主机信息（指标、进程监控、生态系统状态）要求登录 |
| `tls.enabled` | 关闭（明文 HTTP） | 使用你指定的证书和密钥启用 HTTPS 与 WSS；画面显示正在使用的证书指纹 |
| `ble.mode` | `off` | 供服务器附近手机使用的蓝牙 LE：`off`、`state`（仅发布状态）或 `commands`（也接受命令）；未知词表示关闭 |
| `ble.requireEncryption` | 开启 | 命令特征值的写入和状态的读取只在加密链路上进行；只有变量为 `off` 才会关闭 |
| `mqtt.mode` | `off` | 连接单元代理的 MQTT 桥：`off`、`state` 或 `commands`，以及其 URL、前缀和用户 |
| `voice.includeHeardText` | 关闭 | 语音回复会复述所说的话；这属于个人数据，所以默认关闭，变量中只有恰好为 `1` 才会开启 |
| `voice.minConfidence` | `0.6` | 语音识别器接受启动运动请求所需的最低置信度（0 到 1）；0 表示关闭检查，停止命令从不被拦下，变量中的无效数字会被忽略 |
| `mavlink.signingKeyFile` | 空（不签名） | UAV 桥的 MAVLink 2 签名：包含 32 字节密钥的文件路径（32 个原始字节或 64 个十六进制字符）；只保存路径，绝不保存密钥，桥在启动时读取 |
| `mavlink.signingAllowUnsigned` | 关闭 | 仍接受未签名的消息（尚不签名的载具）；开启期间画面会给出警告 |

## 🚀 快速开始

需要 Node.js 22 或更高版本及 npm，并需要正在运行的 HYDRA-UMC-SERVER（端口 3000）：STUDIO 是纯客户端，没有它就没有可通信的对象。

```bash
npm install
./dev.sh                           # Vite dev server on port 5173, proxying /api, /ws and /WORKS to the server on port 3000 (dev.bat on Windows)
npm test                           # the Vitest suite
npm run typecheck && npm run lint  # types and lint
./build.sh                         # production build into dist/ (build.bat on Windows)
```

## 🧪 测试

运行 `npm test` 会执行 664 个自动测试。 不需要硬件，也不需要这台机器以外的任何东西。

CI 运行 `HYDRA_UMC_CI=1 python tools/ci_validate.py`，检查清单、文档、八个 README 和图片。

## 🏗️ 构建与发布

### 系统要求
- [Node.js](https://nodejs.org/)（v22 或更高版本）
- npm
- 一个正在运行的 **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** 后端（同样运行 `npm run dev`，默认端口 `3000`）——本应用是一个纯客户端，没有它就无法与任何东西通信。

### 安装

```bash
npm install
```

### 开发模式

运行 Vite 自身的开发服务器（纯粹的 `vite`，端口 `5173`），支持实时重载。`vite.config.ts` 自身的 `server.proxy` 会透明地将 `/api`、`/ws` 和 `/WORKS` 转发到 `http://localhost:3000`，因此本应用的相对路径 fetch/WebSocket 调用无需任何 CORS 设置即可到达 HYDRA-UMC SERVER 后端——只需确保先启动该后端：
- **Windows：** 双击 `dev.bat`，或运行 `npm run dev`
- **Linux/Mac：** 运行 `./dev.sh` 或 `npm run dev`

### 自动化测试

```bash
npm run typecheck # tsc -b --noEmit（src/）+ tsc -p tsconfig.test.json --noEmit（tests/）
```

### 生产构建

编译为一个经过优化的静态构建（纯粹的 `vite build`——不涉及服务器打包，本应用已不再包含任何后端代码）：
- **Windows：** 双击 `build.bat`，或运行 `npm run build`
- **Linux/Mac：** 运行 `./build.sh` 或 `npm run build`

在本地预览生产构建：
```bash
npm run preview
```

将生成的 `dist/` 文件夹部署到任何静态托管服务。默认情况下，构建好的应用会在当前页面自身的主机名、端口 `3000` 上寻找其后端（匹配常见的“一切都在 CM5 上”的部署方式）；如需将其指向托管在别处的 HYDRA-UMC SERVER 实例，请在构建时设置 `VITE_API_BASE_URL`（参见 `.env.example`）。所有真实状态和数据都持久化在该后端自身的 `data/` 目录中，而非本仓库中。

### 版本管理

`bump_manifest_version.py`（仓库根目录）是 `hydra-umc.project.json` 和 `package.json` 自身 `version` 字段的唯一所有者——`npm run build`（`vite build`）刻意只负责编译，这样就永远不会因为只递增其中一个而造成两者不同步。`scripts/bump-version.mjs` 是一个遗留的原生辅助脚本，仅作参考保留；本仓库中已没有任何地方调用它。当前运行版本可在 **About** 对话框中实时查看（Studio 版本读取自本应用自己的 `package.json`；旁边显示的服务器版本来自 `GET /api/hydra-info`），完整历史记录见 [`CHANGELOG.md`](CHANGELOG.md)。

## 🩺 故障排除

| 你看到 | 原因 | 处理 |
|---|---|---|
| 登录失败，或每次调用都提示无法连接服务器 | 服务器未运行，或页面在错误的主机上查找它 | 启动 HYDRA-UMC-SERVER（开发时为 3000 端口），或带 `VITE_API_BASE_URL` 构建 |
| 点动或命令被拒绝，因为另一个账户或窗口持有该机器人 | 服务器把机器人预约给最先请求的账户和窗口；点动还需要启用 | 在机器人的访问栏中释放它，或等待；管理员可以看到谁持有它 |
| 保存被 412 拒绝 | 在你加载之后另一个客户端修改了机器人，你的修订号已过期 | 重新加载机器人并再次修改 |
| Server Admin 的某个开关是灰色的 | 该值来自服务器的环境变量，它优先于已保存的值 | 修改服务器的环境变量并重启；画面会标明每个值的来源 |
| 服务器重新部署后页面空白 | 已打开的标签页仍指向不再存在的分块 | 页面会自动重新加载一次；若仍空白，请手动刷新，若确实缺少文件则重新构建 |

## 📂 仓库结构

<p align="center">
  <img src="images/repository-structure.svg" alt="Repository structure of HYDRA-UMC-STUDIO" width="100%">
</p>

<details>
<summary>目录树的文本版本</summary>

```text
HYDRA-UMC-STUDIO/
├── src/                             源代码
│   ├── App.tsx                      路由与布局、入口点以及全局状态提供者
│   ├── Dashboard.tsx                顶层应用外壳——导航、概览面板、页脚系统指标
│   ├── store.ts                     全局状态：RobotModel/RobotState/HydraController/SystemSettings ——
│   ├── motionSource.ts              所绘姿态代表什么 (指令值还是机器实际跟随的值),以及 sendRobotCommand() 的纯状态转换核心
│   ├── i18n.ts                      react-i18next 配置——加载 src/locales/*.json
│   ├── hooks/                       usePartColors.ts: 由 HYDRA-UMC-EDITOR-STL 保存的按零件颜色覆盖
│   ├── assets/                      应用的图标、启动画面和图片,以及全局样式
│   ├── assistant/                   助手 Hydri：回答引擎、知识库（8 种语言）、吉祥物、偏好设置
│   ├── components/                  界面和面板：机器人详情、3D 场景、管理、CAN-OTA 工具
│   ├── examples/                    24 个真实机器人模型的正逆运动学
│   ├── lib/canOta.ts                CAN-OTA 仿真/协议层，GitHub 固件下载
│   ├── lib/apiBase.ts               后端 URL 解析——开发环境中相对路径+代理，生产环境使用 VITE_API_BASE_URL
│   ├── lib/mediaTicket.ts           摄像头画面用的短时效票据
│   ├── lib/claims.ts                预留、控制器 ID、从服务器读取的安全限制、Live/Sim 模式
│   ├── lib/revisions.ts             每个机器人的修订号(If-Match、412)、工作台原子移动、审计记录及其链校验
│   ├── lib/session.ts               会话令牌、服务器访问选项、面向操作员的错误文字、谁可以保存设置、不依赖 crypto.subtle 的 SHA-256
│   ├── lib/stopAll.ts               全局 STOP、机器人命令的应答、把机器人的编辑转为命令、所选机器人、回放步骤编号、不可达轨迹的警告、工具在法兰上的位置、最短路径角度
│   ├── lib/claimsFeed.ts            预约的实时列表、导入文件前的检查、对持续输入的限流、持续按住点动按钮的重复、对话框的键盘规则、已保存 MJPEG 录像的解析器、编辑器提交的模型目录
│   └── locales/                     en/es/de/fr/it/zh/ja/pt 翻译文件（react-i18next）
├── docs/                            真空台、热床、机架和机器模型的指南
├── public/                          3D 模型：机器人、机架、热床、真空台、机器（STL 和 OpenSCAD）
├── images/                          README 横幅
├── tests/                           真实的 Vitest 套件(610 个测试)——只测 src/examples/ 的 FK/IK 数学逻辑,不涉及 React/DOM
├── tools/                           项目工具和 CI 检查
├── scripts/                         bump-version.mjs (显式升版) 和 csp.ts (构建后页面的内容安全策略)
├── .github/                         CI 工作流和 Issue 模板
├── index.html                       Vite 构建应用所用的页面 (内容安全策略在构建时写入)
├── example_trajectory.json          独立的示例轨迹（关节角序列，示例数据）
├── metadata.json                    应用名称/描述（由托管平台使用）
├── bump_manifest_version.py         将 hydra-umc.project.json 的版本与原生版本同步（--sync）
├── build.sh / build.bat             安装依赖 + 生产构建
├── build-test.sh / build-test.bat   不递增版本号的构建/编译检查
├── dev.sh / dev.bat                 安装依赖 + 启动 Vite 开发服务器
├── vitest.config.ts                 Vitest 配置(仅针对 tests/,真实的 node 环境——不需要 DOM)
├── tsconfig.test.json               tests/ 独立的类型检查项目(与 app/node 的引用配置分开)
├── .env.example                     VITE_API_BASE_URL 模板——见 src/lib/apiBase.ts
├── CHANGELOG.md                     每个版本的变更
├── hydra-umc.project.json           清单：版本、成熟度、系列
├── package.json                     包的元数据和脚本
└── test.sh                          运行测试
```

</details>

## 🗺️ 路线图与已知限制

**目前已知的限制**

* CAN-OTA 链（Flasher 和 Tester）和运动学大脑阶段只在内置模拟上运行过：目前还没有可供刷写或测试的 HYDRA-UMC 控制板。
* 工作台、热床和机架的尺寸是视觉设置，不是机器人标定，也不是电气或制造设计。
* STOP 经过服务器；没有无线紧急停止，也没有硬件停止路径。
* 一切移动机器人的操作都由服务器决定（角色、限制、预约）；本应用自身无法让一次动作变得安全。

**下一步：** 本应用的每项新功能都移植到 HYDRA-UMC-SUITE，CAN-OTA 工具等待第一批真实板卡。

## 🌍 语言

本 README 和仓库文档提供八种语言：英语、西班牙语、德语、法语、意大利语、日语、中文和葡萄牙语（葡萄牙）。它们同时编写，并由 CI 检查八个文件拥有相同的章节和相同的链接。

## 🔗 相关项目

本项目是同一作者(JuanenRac / Electro Hobby 3D)打造的 HYDRA-UMC 机器人生态系统的一部分。值得了解,因为某个请求实际上可能是关于这些项目之一,而非本仓库本身。

**父项目**
- **[HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** —— 每个控制客户端真正通信的真实无头后端(REST/WebSocket);本面板是它的纯前端客户端,没有自己的后端代码。

**兄弟项目** —— 同样与 HYDRA-UMC-SERVER 自身 API 通信,各自作为独立客户端
- **[HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)** —— 面向多台服务器的桌面(PySide6)集群指挥中心,打包为独立可执行文件。
- **[HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL)** —— 具有生物识别登录和配对 Wear OS 伴侣应用的原生 Android 控制应用。
- **[HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL)** —— 具有实时 WebSocket 同步的 iOS/iPadOS 控制应用(Flutter)。
- **[HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)** —— 面向机载 7 英寸 DSI 触摸屏的原生触控界面,直接嵌入 CM5 本体。
- **[HYDRA-UMC-BRIDGE-AMR](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-AMR)** —— 通过 VDA 5050 MQTT 发布者为 AGV/AMR 车队提供的协调边界(仅针对仿真车队测试)。
- **[HYDRA-UMC-BRIDGE-CNC](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-CNC)** —— 具备 GRBL 状态/控制字节访问能力的高层 CNC 单元协调器(仅针对模拟器测试)。
- **[HYDRA-UMC-BRIDGE-DROIDS](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-DROIDS)** —— 面向足式/人形机器人的协调边界,带有 Boston Dynamics Spot 指令发送器(仅针对模拟器测试)。
- **[HYDRA-UMC-BRIDGE-LASER](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-LASER)** —— 读取 3 路钥匙/外壳/联锁 GPIO 信号的激光单元协调器(仅针对模拟芯片测试;无法使激光器上膛或发射)。
- **[HYDRA-UMC-BRIDGE-OPENPNP](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-OPENPNP)** —— 面向 OpenPnP 贴片机板级流程的安全高层协调器。
- **[HYDRA-UMC-BRIDGE-PRINTER3D](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-PRINTER3D)** —— 面向 Moonraker/Klipper 3D 打印机的安全协调边界,具备真实的受控作业指令。
- **[HYDRA-UMC-BRIDGE-ROS2](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-ROS2)** —— 带有惰性导入 rclpy ROS 2 传输层的协调器(尚未在 ROS 2 环境中运行)。
- **[HYDRA-UMC-BRIDGE-UAV](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-UAV)** —— 面向搭载摄像头的无人机的协调边界,带有 MAVLink 指令发送器(仅针对模拟器测试)。

**子项目**
- **[HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF)** —— 通过 `POST /api/models/submit` 将完成的模型推送到本面板自身目录的桌面版图形化 URDF 创建/编辑工具。
- **[HYDRA-UMC-EDITOR-STL](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-STL)** —— 面向本面板自身 `public/models/` 库（以及 HYDRA-UMC-SUITE 维护的镜像）的桌面 STL 模型编辑器——变换/替换/移除/添加真实部件，绝不永久删除任何内容。

**直接相关**
- **[HYDRA-UMC-DASHBOARD-AI](https://github.com/JuanenRac/HYDRA-UMC-DASHBOARD-AI)** —— 基于 DATALAKE/ANOMALY-DETECTOR 的智能摘要与异常高亮面板,具备诚实的统计回退机制;为本面板扩展了统计摘要(尚无语言模型)。
- **[HYDRA-UMC-COGNITIVE-NODE](https://github.com/JuanenRac/HYDRA-UMC-COGNITIVE-NODE)** —— 面向 Hailo-10 认知流水线(LLM/VLA/语音编排)的集成中枢;为本面板增加语音/自然语言控制。
- **[HYDRA-UMC-VOICE-UI](https://github.com/JuanenRac/HYDRA-UMC-VOICE-UI)** —— 具备受限、需确认的 Watch 中继的真实语音前端(VAD + 意图解析);为本面板增加语音/自然语言控制。
- **[HYDRA-UMC-LOCAL-TECHNICIAN](https://github.com/JuanenRac/HYDRA-UMC-LOCAL-TECHNICIAN)** — 面向生态系统自身的本地、按策略门控的 AI 维护技师——观察、诊断并提出修复建议;两个最高风险等级目前特意尚未实现。
- **[HYDRA-UMC-TWIN](https://github.com/JuanenRac/HYDRA-UMC-TWIN)** —— 面向数字孪生引擎的集成中枢,具备真实的版本兼容性同步契约;可在触碰真实机器人之前,直接从本面板在数字孪生上预览。
- **[HYDRA-UMC-HIL-BRIDGE](https://github.com/JuanenRac/HYDRA-UMC-HIL-BRIDGE)** —— 在仿真与真实硬件之间带有软件碰撞联锁的硬件在环路由器(未在真实硬件上测试);可在触碰真实机器人之前,直接从本面板在数字孪生上预览。

**生态系统中的其他项目**

*核心硬件与平台*
- **[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)** —— 机器人手臂主板设计——CM5 主机 + 双核 STM32H745,目标是通过 CAN-OTA/SPI-OTA 协调最多 8 条工具臂(固件处于早期阶段,尚无已组装的电路板)。
- **[HYDRA-UMC-OS](https://github.com/JuanenRac/HYDRA-UMC-OS)** —— 面向 CM5 的可复现 Raspberry Pi OS 产品层——只读代理、经过验证的配置/配置文件、WiFi 首次配网。
- **[HYDRA-UMC-SDK](https://github.com/JuanenRac/HYDRA-UMC-SDK)** —— 每个桥接都据此校验自身指令的共享 JSON-Schema 契约与软件作业门限边界(并非经认证的安全功能)。
- **[HYDRA-UMC-CONNECTOR-HUB](https://github.com/JuanenRac/HYDRA-UMC-CONNECTOR-HUB)** — 面向外部机器连接器的声明式适配器清单注册与校验工具；把 SDK 自身的契约理念扩展到外部机器，而不取代工业网关类项目。

*URTC 工具平台*
- **[URTC](https://github.com/JuanenRac/URTC)** —— 面向实体 Universal Robot Tool Controller 板卡的固件,通过 CAN 总线支持 25 种以上工具配置。
- **[URTC-FLASHER](https://github.com/JuanenRac/URTC-FLASHER)** —— 面向 URTC 板卡的桌面图形烧录工具,支持 CAN-OTA 以及全芯片 SWD/JTAG。
- **[URTC-TESTER](https://github.com/JuanenRac/URTC-TESTER)** —— 面向 URTC 板卡的桌面实时 CAN 总线诊断工具,每种工具配置对应一个面板。
- **[URTC-WEB-STUDIO](https://github.com/JuanenRac/URTC-WEB-STUDIO)** —— 通过 Web Serial API 实现的浏览器版 URTC-TESTER 替代方案,无需本地安装。
- **[URTC-GATEWAY](https://github.com/JuanenRac/URTC-GATEWAY)** —— URTC CAN 总线前的网关：允许的标识符列表、速率限制和会话密钥；软件已在计算机上测试，尚未在真实总线上测试。

*视觉 AI 节点(Hailo-8)*
- **[HYDRA-UMC-VISION-NODE](https://github.com/JuanenRac/HYDRA-UMC-VISION-NODE)** —— 面向 Hailo-8 视觉流水线的集成中枢,具备逐阶段的真实硬件就绪检测。
- **[HYDRA-UMC-DETECTION-HEF](https://github.com/JuanenRac/HYDRA-UMC-DETECTION-HEF)** —— 具备 Hailo 架构/校验和安全加载验证的真实编译模型注册表。
- **[HYDRA-UMC-VISION-STREAMER](https://github.com/JuanenRac/HYDRA-UMC-VISION-STREAMER)** —— 具备真实 HailoRT 集成边界的真实 GStreamer 流水线 + MediaMTX 配置生成器。
- **[HYDRA-UMC-VISUAL-SERVOING-API](https://github.com/JuanenRac/HYDRA-UMC-VISUAL-SERVOING-API)** —— 以区域状态为授权条件的 Position-Based Visual Servoing 修正律;尚无摄像头位姿估计。
- **[HYDRA-UMC-SAFETY-ZONES](https://github.com/JuanenRac/HYDRA-UMC-SAFETY-ZONES)** —— 从文件读取物体位置的 v0 区域入侵、校准新鲜度与 E-STOP 请求逻辑;没有检测器为其供数,也尚未连接任何物理 E-STOP。

*认知 AI 节点(Hailo-10)*
- **[HYDRA-UMC-VLA-ENGINE](https://github.com/JuanenRac/HYDRA-UMC-VLA-ENGINE)** —— 面向 Vision-Language-Action 模型的真实动作 token 编解码与轨迹生成。
- **[HYDRA-UMC-SEMANTIC-PLANNER](https://github.com/JuanenRac/HYDRA-UMC-SEMANTIC-PLANNER)** —— 基于真实规则的任务分解,以及针对 MCU 错误码的语义化错误恢复。
- **[HYDRA-UMC-DOCS-QA](https://github.com/JuanenRac/HYDRA-UMC-DOCS-QA)** —— 面向本生态系统自身 Markdown 文档的真实纯标准库 TF-IDF 文档检索。

*编排与集群*
- **[HYDRA-UMC-ORCHESTRATOR](https://github.com/JuanenRac/HYDRA-UMC-ORCHESTRATOR)** —— 具备真实 gRPC/Protobuf 健康报告契约与任务状态机的集成中枢。
- **[HYDRA-UMC-JOB-DISPATCHER](https://github.com/JuanenRac/HYDRA-UMC-JOB-DISPATCHER)** —— 基于真实 HTTP API 的真实优先级任务队列,支持去重。
- **[HYDRA-UMC-NODE-HEALING](https://github.com/JuanenRac/HYDRA-UMC-NODE-HEALING)** —— 具备重试/退避与身份不匹配检测的真实基于 gRPC 的车队健康看门狗。
- **[HYDRA-UMC-PATH-PLANNER-3D](https://github.com/JuanenRac/HYDRA-UMC-PATH-PLANNER-3D)** —— 具备真实障碍物/工作空间碰撞校验的真实基于 RRT 的三维路径规划器。
- **[HYDRA-UMC-SWARM-SYNC](https://github.com/JuanenRac/HYDRA-UMC-SWARM-SYNC)** —— 经过多单元收敛属性测试的真实 CRDT LWW-Element-Map 状态同步。

*数字孪生与仿真*
- **[HYDRA-UMC-PHYSICS-REPLICA](https://github.com/JuanenRac/HYDRA-UMC-PHYSICS-REPLICA)** —— 面向真实 URDF 子集的真实正向运动学与关节限位校验。
- **[HYDRA-UMC-SYNTHETIC-DATA-GEN](https://github.com/JuanenRac/HYDRA-UMC-SYNTHETIC-DATA-GEN)** —— 具备 YOLO/COCO 标注导出功能的真实程序化 2D 场景生成器。

*数据与分析*
- **[HYDRA-UMC-DATALAKE](https://github.com/JuanenRac/HYDRA-UMC-DATALAKE)** —— 具备真实数据摄入/查询 HTTP API 的真实 sqlite3 时序数据存储。
- **[HYDRA-UMC-ANOMALY-DETECTOR](https://github.com/JuanenRac/HYDRA-UMC-ANOMALY-DETECTOR)** —— 具备漂移监测能力的真实 FFT + 统计基线异常检测器。
- **[HYDRA-UMC-PRODUCTION-REPORTS](https://github.com/JuanenRac/HYDRA-UMC-PRODUCTION-REPORTS)** —— 基于 DATALAKE 历史数据的真实 OEE/可用率计算,支持可复现的 CSV 导出。
- **[HYDRA-UMC-TELEMETRY-COLLECTOR](https://github.com/JuanenRac/HYDRA-UMC-TELEMETRY-COLLECTOR)** —— 面向 DATALAKE 的真实 CAN/WebSocket 数据摄入管道,支持序列去重。

*工业网关*
- **[HYDRA-UMC-GATEWAY-INDUSTRIAL](https://github.com/JuanenRac/HYDRA-UMC-GATEWAY-INDUSTRIAL)** —— 中继至工业协议的集成中枢,具备真实的指令白名单/背压控制层。
- **[HYDRA-UMC-OPCUA-SERVER](https://github.com/JuanenRac/HYDRA-UMC-OPCUA-SERVER)** —— 经真实二进制协议客户端会话验证的真实 OPC-UA 地址空间。
- **[HYDRA-UMC-MQTT-BROKER](https://github.com/JuanenRac/HYDRA-UMC-MQTT-BROKER)** —— 具备可选按客户端认证与主题 ACL 的真实 MQTT 代理。
- **[HYDRA-UMC-MTCONNECT-ADAPTER](https://github.com/JuanenRac/HYDRA-UMC-MTCONNECT-ADAPTER)** —— 具备降级模式输出的真实 MTConnect `/probe` 与 `/current` XML 端点。

*辅助工具与生态系统运维*
- **[HYDRA-UMC-TOOL-CLI](https://github.com/JuanenRac/HYDRA-UMC-TOOL-CLI)** —— 具备真实、稳定退出码契约的车队 CLI,是 HYDRA-UMC-SERVER 自身 API 的真实在线客户端。
- **[HYDRA-UMC-WATCH](https://github.com/JuanenRac/HYDRA-UMC-WATCH)** —— 带有触觉提醒模式与配对手机语音中继的 WearOS 伴侣应用(尚未在实体手表上运行)。
- **[URTC-SMART-RACK](https://github.com/JuanenRac/URTC-SMART-RACK)** —— 面向板卡安装机架的固件,具备真实的工具 ID 解码与 Smart Idle 预热逻辑。
- **[URTC-VISION-TOOL](https://github.com/JuanenRac/URTC-VISION-TOOL)** —— 面向热成像/RGB 检测工具头的固件及真实 Python 视觉伴侣程序。
- **[HYDRA-UMC-UPDATER](https://github.com/JuanenRac/HYDRA-UMC-UPDATER)** —— 发现、克隆并更新本生态系统中每个仓库的管理类桌面工具。
- **[HYDRA-UMC-OS-REBUILDER](https://github.com/JuanenRac/HYDRA-UMC-OS-REBUILDER)** —— 构建即刻可烧录、预装生态系统最新版本的 CM5 镜像的 Windows/Linux 桌面工具,具备类似 Raspberry Pi Imager 风格的首次启动 Wi-Fi/用户/SSH 配置。
- **[HYDRA-UMC-OPS-AGENT](https://github.com/JuanenRac/HYDRA-UMC-OPS-AGENT)** — 维护事件协调器：一个低权限的边缘角色采集经过脱敏的库存/健康快照，一个控制面角色以只读方式渲染它，并请求某个 AI 提供方给出诊断建议——从不应用补丁，也从不部署任何内容。
- **[HYDRA-UMC-DEV-SERVER](https://github.com/JuanenRac/HYDRA-UMC-DEV-SERVER)** — 可复现的开发主机（Raspberry Pi 5 / CM5），保存整个生态系统的源代码，并在持久队列下运行有界的构建/测试任务；这是专用的开发角色，明确区别于运行中的 CM5。

总的来说，该作者的生态系统所涵盖的项目远不止本项目——以上是一份地图，而非详尽的功能列表；请查看每个仓库自身的 README 以了解其今天实际的功能。

## 📚 文档

更多阅读：

* [生态系统的安全基线](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md)
* [生态系统的威胁模型](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md)
* [本仓库的更新日志](CHANGELOG.md)
* [本仓库的许可证](LICENSE.md)

## 🤝 参与贡献与社区

* 提交 pull request 之前，请运行 `HYDRA_UMC_CI=1 py -3 tools/ci_validate.py`（或 `HYDRA_UMC_CI=1 python3 tools/ci_validate.py`）：它必须输出 `CI_VALIDATION=PASS`。此检查不要运行 `build.sh` 或 `build.bat`；构建不是检查。
* 八个 README 由 HYDRA-UMC-DOCS 中的同一个源生成；请勿手工编辑。修改源文件，再用 `tools/make_readmes.py` 重新生成。
* 不要在 README 中声称尚未运行过的内容：属实时请写“仅模拟”或“尚未在硬件上试过”。
* 请参阅 [CONTRIBUTING.md](CONTRIBUTING.md)、[行为准则](CODE_OF_CONDUCT.md)、[SECURITY.md](SECURITY.md) 和 [SUPPORT.md](SUPPORT.md)。

## 👤 作者

**JuanenRac (Electro Hobby 3D)** · electrohobby3d@gmail.com

## 📜 许可证

GPL-3.0-or-later - [LICENSE](LICENSE).
