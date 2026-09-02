<p align="center">
  <img src="images/HYDRA_UMC_BANNER.svg" alt="HYDRA-UMC-STUDIO banner" width="100%">
</p>

# 🖥️ HYDRA-UMC STUDIO

<p align="center">
  <a href="README.md">🇺🇸 English</a> |
  <a href="README_spa.md">🇪🇸 Español</a> |
  <a href="README_fra.md">🇫🇷 Français</a> |
  <a href="README_ita.md">🇮🇹 Italiano</a> |
  <a href="README_deu.md">🇩🇪 Deutsch</a> |
  🇨🇳 <b>简体中文</b> |
  <a href="README_jpn.md">🇯🇵 日本語</a>
</p>


### 🤖 HYDRA-UMC 多机器人微工厂的网页版控制仪表盘

<p align="left">
  <img src="https://img.shields.io/badge/License-GPL%203.0-blue.svg" alt="GPL 3.0">
  <img src="https://img.shields.io/badge/Framework-React%2019-61DAFB.svg" alt="React">
  <img src="https://img.shields.io/badge/Tool-Vite-646CFF.svg" alt="Vite">
  <img src="https://img.shields.io/badge/3D-Three.js-black.svg" alt="Three.js">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6.svg" alt="TypeScript">
</p>


---

## 🎯 概述

**HYDRA-UMC STUDIO** 是 [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)——多机器人微工厂主板（Raspberry Pi CM5 主机 + 双核 STM32H745 实时协处理器，通过单一 FDCAN 总线协调最多 8 个分布式机器人手臂）——的浏览器端控制仪表盘。HYDRA-UMC 自身的仓库涵盖硬件与固件，而本仓库则是面向人的一侧：一个单页 React 应用程序，以真实的 3D 方式可视化每一个机器人、点动并记录其运动、管理机器人单元周边的机器与配件，并对整条 CAN-OTA 固件链进行刷写/测试——所有这些都在一个浏览器标签页中完成，除 Node.js 外无需任何原生安装。

**诚实说明，与本生态系统其余文档所采用的惯例一致：** HYDRA-UMC 自身的真实硬件尚不存在于经过测试的芯片形态（其引导程序编译干净，但尚未在真实板卡上运行过——参见该仓库自身的 `docs/architecture.md`）。因此，本仪表盘的 CAN-OTA Flasher/Tester 工具是针对一套完整的内置仿真运行的，该仿真遵循每一层已记录的真实寻址方案，而不是假装在与并不存在的硬件通信。3D 机器人可视化、运动学、轨迹记录以及每一个配件控制面板都是完全真实且独立于此的——目前仅 CAN-OTA 传输本身是被仿真的。

使用 **React 19**、**Vite**、**Three.js**（通过 `@react-three/fiber`/`@react-three/drei`）和 **TypeScript** 构建——一个纯粹的客户端，自身不含任何后端代码。持久化状态存放在本应用通过网络通信的独立后端 **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** 上。

---

## 🦾 多机器人 3D 控制

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

---

## 🏭 运动大脑阶段

一个专用的控制面板，用于 HYDRA-UMC 主板自身的本地运动子系统——STM32H745 直接驱动的各轴，与 STACK A 上的分布式机器人手臂相独立：

- 📐 **XY 龙门架** X、Y1、Y2（双 Y 龙门架）和 Z 轴的点动控制
- 🔥 **热床** 控制（SSR 切换，230VAC）
- 🔄 **ATC 转塔** —— 由 E0 驱动的自动换刀装置的旋转工具索引控制
- 🎢 **传送带** —— 由 E1 驱动的传输带的安装/运行/速度控制
- 🛑 完整的 12 路限位开关网格、3 路风扇通道，以及用于流体处理的 10 个泵/10 个阀门

---

## 🎛️ 配件与机器控制面板

面向机器人单元周边机器与配件的专用面板：**XY 工作台**、**ATC 工具**、**工具架管理器**、**拾取放置**（包括 JuanenPnP/LumenPnP 专属配置）、**CNC**（包括 JuanenCNC 专属配置）、**激光**（包括 JuanenLaser 专属配置）、**真空台**，以及**热床**。

---

## 🔄 工作与轨迹

加载预置的示例轨迹，实时点动并记录你自己的点位，或按机器人加载/保存/编辑/回放复杂的多点轨迹（JSON）。轨迹在不同机器人型号之间是可移植的——每一个已记录的点位都会在加载/绘制/播放时通过该特定机器人自身真实的运动学（`src/examples/robotKinematicsDispatch.ts`）进行解析，而不是针对当初记录它的那个机器人被固化，因此同一个轨迹文件能够沿着 Parol6 和 UR10e 各自真实的可达几何正确驱动它们。

---

## 🛠️ CAN-OTA 固件工具

从一个仪表盘对整条 HYDRA-UMC + URTC CAN-OTA 链进行刷写和自检，提供两个专用入口：

- **URTC → Flasher / Tester** —— 面向 URTC 工具头板及其自身的扩展板（与独立的 [URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)/[URTC Tester](https://github.com/JuanenRac/URTC-TESTER) 桌面工具自身的协议覆盖范围一致）
- **HYDRA-UMC → Flasher / Tester** —— 面向机器人控制器板与运动大脑两个层级，全程从 CM5 → SPI → STM32H745 → FDCAN1 → 机器人控制器板 → CAN → URTC 工具头进行中继，无需 JTAG/SWD 探针，也无需 USB-CAN 适配器（完整的寻址/中继设计参见 [HYDRA-UMC 自身的 `docs/architecture.md`](https://github.com/JuanenRac/HYDRA-UMC/blob/main/docs/architecture.md)）

两者都可以直接从 GitHub 下载真实的固件版本（基于 `firmware_manifest.json`，经 CRC32 校验），面向 `URTC` 或 `HYDRA-UMC` 仓库均可。如上所述，在真实的 STM32H745 固件存在于真实硬件上并可供通信之前，传输本身运行于一套完整的内置仿真。

---

## 🎮 手柄支持

支持 USB 和蓝牙控制器集成，具有自定义的按键/轴映射，可在不使用鼠标/键盘的情况下点动机器人和配件。实时操作(关节/工作台点动、E-STOP、START/STOP、回放速度)会触发与机器人详情面板中点动按钮相同的原子 `sendRobotCommand()` 路径,而不是防抖动的设置保存——参见 `GamepadController.tsx`。

---

## 📹 摄像头集成

最多支持 8 路同步实时画面（USB 视觉或 MLX90640/41/42 系列热成像传感器），并附带录制与推理状态——这正是 HYDRA-UMC 自身双 USB 3.0 集线器子系统所围绕构建的摄像头矩阵。

---

## 🌐 多语言界面

界面在**英语、西班牙语、德语、法语、意大利语、简体中文和日语**（`src/locales/`）之间全面翻译，包括应用内帮助菜单、关于对话框（版本/作者/许可证），以及系统配置对话框的每一个选项卡。目前覆盖率尚未达到每个界面的 100%——少数独立的配件面板仍是硬编码的英语，翻译工作尚未涉及。

---

## ℹ️ 关于与系统配置

两个独立的对话框，均可从头部（`Config`/`About` 按钮）访问：**About** 显示当前运行的应用版本（实时读取自 `GET /api/hydra-info`）、作者和许可证；**Config** 涵盖服务器身份、控制器/节点管理、界面主题 + 语言、机器人重命名、摄像头↔机器人映射（含冲突检测）、自定义 URDF 库、第三方软件集成（OpenPnP/CNC/激光后端）、逐客户端远程访问（SUITE/安卓/iOS 各自独立的开关）、用户账户、每个机器人的工作目录、CAN-OTA 传输，以及手柄映射——每一项都是自己的选项卡。两者都是各自独立的组件（`src/components/About.tsx`、`src/components/Config.tsx`），并未内联到主仪表盘外壳中。

## 🔐 账户与访问

每个后端在自身首次启动时都会预置一个账户——用户名 `admin`，密码 `admin`——一旦服务器可从完全受信任的局域网之外访问，请立即从 **Config > Users** 修改它。同一个选项卡还允许管理员账户创建额外的**操作员**账户：操作员可以登录、查看实时状态并驱动机器人（点动/播放/暂停/停止/工具/阀门/泵/速度），但不能覆盖全局设置或管理其他账户。仅仅四处浏览并不需要任何账户——登录界面自身的“以只读方式继续”会直接跳转到仪表盘,写入功能被禁用。完整契约（角色、令牌、`/api/users` 路由）记录于 [HYDRA-UMC-SERVER 自身的 `docs/REMOTE_API.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md) 第 2a/2b 节。

3 个远程客户端（SUITE、Android、iOS）中的每一个都通过 `X-Hydra-Client` 请求头自我标识，因此 **Config > Remote Access** 可以独立允许或阻止每一个,而不是所有三者共用一个开关。

---

## 💾 持久化状态

HYDRA-UMC STUDIO 本身是一个纯客户端——除了当前会话在内存中的内容外，它不持有任何自身的状态。所有持久化数据（`settings.json`、`users.json`、`WORKS/` 下保存的轨迹、已提交的模型）都存放在本应用通过网络通信的独立后端 **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** 上（完整情况参见该项目自身的 `data/` 目录和 README）——状态在页面重新加载或本应用自身重新部署后依然保留,因为这两者都完全不会触碰后端进程。`settings.json` 本身被刻意排除在该后端的静态文件服务之外（它保存控制器 IP、CAN-OTA 配置和每个机器人的完整状态），即便其 `WORKS/` 文件夹是正常提供服务的。

同一套 `GET`/`POST /api/settings` 契约，加上一个发现端点（`GET /api/hydra-info`）和一个用于实时推送更新的 `WebSocket /ws`，也是外部客户端连接到同一个后端的方式——这正是 [HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) 能够在网络上发现一个正在运行的 HYDRA-UMC SERVER 实例、读取/修改其状态,并实时看到本应用自身浏览器标签页所做更改的原因（反之亦然）。完整契约见 [HYDRA-UMC-SERVER 自身的 `docs/REMOTE_API.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md)。

`GET /api/system/metrics` 驱动概览仪表盘页脚：CPU 负载和内存使用始终是真实的（Node 自身的 `os` 模块）；在真实的 Raspberry Pi 上运行时,温度读取真实的 `vcgencmd measure_temp` 输出,否则回退为明确标记的模拟值（响应中的 `temp_is_real`）；Wi-Fi/以太网/蓝牙状态读取自 `/sys/class/net`/`/sys/class/bluetooth`（仅限 Linux,在任何其他主机上为 `null`/未知,而非猜测值）。

---

## 📂 仓库结构

```text
HYDRA-UMC-STUDIO/
├── src/
│   ├── Dashboard.tsx            # 顶层应用外壳——导航、概览面板、页脚系统指标
│   ├── store.tsx                # 全局状态：RobotModel/RobotState/HydraController/SystemSettings ——
│   │                             # 通过 REST + WebSocket 与独立的 HYDRA-UMC-SERVER 后端通信
│   ├── i18n.ts                  # react-i18next 配置——加载 src/locales/*.json
│   ├── components/
│   │   ├── About.tsx, Config.tsx  # 系统配置和关于对话框——读取同一全局存储的独立组件，
│   │   │                       # 并未内联到仪表盘外壳中
│   │   ├── AuthGate.tsx, UsersPanel.tsx  # 登录界面和 Config > Users 管理员/操作员账户管理器
│   │   ├── RobotDetail.tsx      # 共享的每机器人点动/轨迹/配置实现（型号选择器就在这里）——
│   │   │                       # 下方每一个 robots/A*.tsx 入口点都渲染它
│   │   ├── robots/A1.tsx .. A8.tsx  # 每机器人入口点——RobotDetail.tsx 的薄重导出，是在不触及
│   │   │                       # 其他 7 个的情况下增加未来任何机器人专属行为的地方。A1 已经是
│   │   │                       # 唯一的例外：RobotDetail.tsx 自身的 `isFloatingLayout` 分支
│   │   │                       # （robot.id === 1）将速度/加速度/J1-J6/XYZ 点动移动到 3D 视口
│   │   │                       # 上的一个可拖动浮层中，而非其下方的面板。
│   │   ├── Joystick3D.tsx       # 该浮动浮层使用的 XYZ 点动方向键
│   │   ├── VirtualKinematics.tsx  # React Three Fiber 的 <Canvas> 场景宿主
│   │   ├── KinematicBrainStage.tsx  # XY 龙门架 / 热床 / ATC 转塔 / 传送带面板
│   │   ├── Flasher.tsx, Tester.tsx  # CAN-OTA 工具（URTC 和 HYDRA-UMC 两个层级）
│   │   ├── ATCToolsConfig.tsx, RackConfigView.tsx, PickAndPlace.tsx, CNC.tsx, Laser.tsx,
│   │   │   VacuumTableConfig.tsx, HeatedBedConfig.tsx, XYTableConfig.tsx
│   │   │                       # 配件/机器控制面板
│   │   ├── JuanenPnPConfig.tsx, LumenPnPConfig.tsx, JuanenCNCConfig.tsx, JuanenLaserConfig.tsx
│   │   │                       # 特定机器的配置变体——尚未接入任何导航路径（死代码）
│   │   ├── CamerasView.tsx, GamepadConfig.tsx, GamepadController.tsx, HelpModal.tsx
│   │   ├── FuturisticSlider.tsx, RotaryKnob.tsx  # 共享的点动控制小部件
│   │   └── 3d/
│   │       ├── RobotArm.tsx     # 根据 robot.model 分发到正确的每型号装配
│   │       ├── Parol6Arm.tsx, Faze4Arm.tsx, AR3Arm.tsx, AR4Arm.tsx, EdoArm.tsx, Gen2Arm.tsx,
│   │       │   Gen3LiteArm.tsx, Lite6Arm.tsx, M710icArm.tsx, PiperArm.tsx, SoArm100Arm.tsx,
│   │       │   Vx300sArm.tsx, Wx250sArm.tsx, XArm6Arm.tsx, Z1Arm.tsx, KochArm.tsx,
│   │       │   LumenPnPRig.tsx, GenericRobotArm.tsx
│   │       │                   # 特定制造商的装配，每一个都从其自身真实的 URDF 手工转录而来
│   │       ├── URArm.tsx, UrClassicArm.tsx  # e-Series/经典 Universal Robots 系列的共享参数化装配
│   │       ├── UR3eArm.tsx, UR5eArm.tsx, UR10eArm.tsx, UR16eArm.tsx, UR20Arm.tsx,
│   │       │   Ur3ClassicArm.tsx, Ur5ClassicArm.tsx, Ur10ClassicArm.tsx
│   │       │                   # URArm.tsx / UrClassicArm.tsx 的薄型每型号封装
│   │       ├── Shared3DEnvironment.tsx, SharedModule3DView.tsx, PathVisualizer.tsx,
│   │       │   Toolhead.tsx, DraggableGizmo.tsx, ATC3DView.tsx, Rack3DView.tsx
│   │       │                   # 场景环境、轨迹绘制、工具/操纵器渲染
│   ├── examples/
│   │   ├── kinematics.ts, utils.ts, robotKinematicsDispatch.ts
│   │   │                       # 共享的通用双连杆运动学 + 每型号分发
│   │   ├── parol6Kinematics.ts, faze4Kinematics.ts, ar3Kinematics.ts, ar4Kinematics.ts,
│   │   │   edoKinematics.ts, gen2Kinematics.ts, gen3LiteKinematics.ts, kochKinematics.ts,
│   │   │   lite6Kinematics.ts, m710icKinematics.ts, piperKinematics.ts, soArm100Kinematics.ts,
│   │   │   xarm6Kinematics.ts, z1Kinematics.ts
│   │   │                       # 特定制造商的真实正向/逆向运动学
│   │   ├── urKinematicsShared.ts, urClassicKinematics.ts  # e-Series/经典 UR 系列的共享正向/逆向运动学引擎
│   │   ├── ur3eKinematics.ts, ur5eKinematics.ts, ur10eKinematics.ts, ur16eKinematics.ts, ur20Kinematics.ts,
│   │   │   ur3ClassicKinematics.ts, ur5ClassicKinematics.ts, ur10ClassicKinematics.ts
│   │   │                       # 薄型的每型号 UR 链条/限位/归位姿态数据
│   │   └── list/                # 26 个预置示例轨迹（圆形、螺旋、XY 工作台图案、拾取放置……）
│   ├── lib/canOta.ts            # CAN-OTA 仿真/协议层，GitHub 固件下载
│   ├── lib/apiBase.ts           # 后端 URL 解析——开发环境中相对路径+代理，生产环境使用 VITE_API_BASE_URL
│   └── locales/                 # en/es/de/fr/it/zh/ja 翻译文件（react-i18next）
├── public/models/                # 真实的 3D 网格资产——每个机器人一个文件夹（共 24 个），
│                                  # 每个都有自己的 ATTRIBUTION.txt——见下方许可证表
├── images/                       # README 横幅
├── .env.example                  # VITE_API_BASE_URL 模板——见 src/lib/apiBase.ts
├── README.md                     # 本文件
└── README_spa.md / README_ita.md / README_fra.md / README_deu.md / README_zho.md / README_jpn.md  # 翻译
```

本应用所通信的后端（设置持久化、REST/WebSocket API、`docs/REMOTE_API.md`）位于独立的 **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** 仓库中，而非本仓库——其结构及运行方式参见该项目自身的 README。

---

## 🛠️ 开发环境

### 系统要求
- [Node.js](https://nodejs.org/)（建议 v18 或更高版本）
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

每次真正执行 `npm run build` 都会自动递增 `package.json` 自身的 `version`（`scripts/bump-version.mjs`，作为 `build` 脚本的第一步运行）——采用十进制“里程表”方式：每次构建 patch 位 +1，超过 9 后向 minor 位（minor 超过 9 后向 major 位）进位，而不会出现两位数字段（`0.0.9` -> `0.1.0`，而非 `0.0.10`）。当前运行版本可在 **About** 对话框中实时查看，完整历史记录见 [`CHANGELOG.md`](CHANGELOG.md)。

---

## 🔗 相关项目

本项目是同一作者（JuanenRac / Electro Hobby 3D）打造的更大规模机器人生态系统的一部分。值得了解，因为某个请求实际所指的可能正是这些项目之一，而非本仓库：

**HYDRA-UMC 平台** —— 多机器人微工厂单元
- **[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)** —— 主板本体：Raspberry Pi CM5 主机 + 双核 STM32H745 实时协处理器，通过 CAN-OTA/SPI-OTA 协调最多 8 个分布式机器人手臂。自有硬件 + 固件，GPL-3.0/CERN-OHL-S v2/CC BY-SA 4.0。
- **HYDRA-UMC STUDIO**（本仓库）—— HYDRA-UMC 的网页控制仪表盘：多机器人 3D 可视化、运动学/轨迹记录、面向整个平台的 CAN-OTA 刷写与测试。纯粹的 Vite/React 客户端——React + Vite + Three.js，自身不含任何后端代码。
- **[HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** —— 面向整个平台的无头式 Express/WebSocket API 后端：机器人/控制器状态、身份验证、mDNS 发现、模型提交。独立于本应用运行——该独立进程的原因参见该项目自身的 README。
- **[HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL)** —— 通过 Wi-Fi/蓝牙控制 HYDRA-UMC 的 Android 应用。真实可用的应用——完整的远程控制功能集、JWT 身份验证、加密凭证存储。
- **[HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL)** —— 通过 Wi-Fi 控制 HYDRA-UMC 的 iOS/iPadOS 应用，基于 Flutter 构建（跨平台，可在 Windows 上验证，无需 Mac；最终 `.ipa` 打包仍需 Xcode）。真实可用的应用——功能集与 Android 应用相同。
- **[HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)** —— 桌面端（Python/PySide6）集群指挥中心：多控制器网络发现、实时双向同步、真实的 3D 机器人视口、类 Photoshop 的可停靠工作区。真实可用，并非占位程序。
- **[HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF)** —— 桌面端（Python/PySide6）图形化 URDF 创建/编辑工具，服务于本项目自身的模型目录：从 GitHub 或本地文件夹拉取源文件，验证自由度可行性，通过实时 3D 预览编辑颜色/比例/运动学，并将完成的结果推送到一个正在运行的 STUDIO 服务器（参见本项目自身的 `POST /api/models/submit` 及 Config > Models）。真实可用，并非占位程序。
- **[HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)** —— 面向 HYDRA-UMC 自身 5"/7" DSI 触摸屏（两种尺寸分辨率均为 1280×720）的原生 Flutter 触控界面，运行于 Compute Module 5 上，直接从主板控制同一台服务器。真实可用的雏形，全部 6 个目录界面（仪表盘、手动控制、摄像头、简化 3D 视图、系统指标、登录）均已连接到实时服务器；真正的 Linux 目标构建尚未在真实硬件上运行过（目前仅在 Windows 环境下可用——参见该项目自身的 README）。

**URTC 平台** —— 每个 HYDRA-UMC 机器人手臂所携带的工具头控制器
- **[URTC](https://github.com/JuanenRac/URTC)** —— 通用机器人工具控制器：基于 STM32F303 的 CAN 总线工具头控制器，25 个已完整实现的工具配置文件，支持 CAN-OTA 固件更新。
- **[URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)** —— 面向 URTC 板卡的桌面端 CAN-OTA + 全芯片 SWD/JTAG 刷写工具（Windows/Linux）。
- **[URTC Tester](https://github.com/JuanenRac/URTC-TESTER)** —— 面向 URTC 板卡的桌面端实时 CAN 总线诊断工具，每个工具配置文件对应一个面板（Windows/Linux）。
- **[URTC Web Studio](https://github.com/JuanenRac/URTC-WEB-STUDIO)** —— 上述两款桌面工具的浏览器端替代方案（Web Serial API + SLCAN），无需本地安装。

**与本仪表盘直接相关** —— 直接接入 HYDRA-UMC STUDIO 的项目：
- **[HYDRA-UMC-DASHBOARD-AI](https://github.com/JuanenRac/HYDRA-UMC-DASHBOARD-AI)** —— 为这同一个仪表盘扩展 AI 驱动的洞察分析。
- **[HYDRA-UMC-COGNITIVE-NODE](https://github.com/JuanenRac/HYDRA-UMC-COGNITIVE-NODE)** —— 为本仪表盘增加语音/自然语言控制。
- **[HYDRA-UMC-VOICE-UI](https://github.com/JuanenRac/HYDRA-UMC-VOICE-UI)** —— 为本仪表盘增加语音/自然语言控制。
- **[HYDRA-UMC-TWIN](https://github.com/JuanenRac/HYDRA-UMC-TWIN)** —— 让你在触碰真实机器人之前，直接在本仪表盘上于数字孪生中预览。
- **[HYDRA-UMC-HIL-BRIDGE](https://github.com/JuanenRac/HYDRA-UMC-HIL-BRIDGE)** —— 让你在触碰真实机器人之前，直接在本仪表盘上于数字孪生中预览。

除此之外，同一作者还维护着本生态系统中的许多其他项目，按类别分组如下：

- **💠 核心生态系统：** [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) · [HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER) · [HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) · [HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI) · [HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL) · [HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL) · [HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF) · [URTC](https://github.com/JuanenRac/URTC) · [URTC-FLASHER](https://github.com/JuanenRac/URTC-FLASHER) · [URTC-TESTER](https://github.com/JuanenRac/URTC-TESTER) · [URTC-WEB-STUDIO](https://github.com/JuanenRac/URTC-WEB-STUDIO)
- **👁️ 视觉 AI 节点（Hailo-8）：** [HYDRA-UMC-VISION-NODE](https://github.com/JuanenRac/HYDRA-UMC-VISION-NODE) · [HYDRA-UMC-VISION-STREAMER](https://github.com/JuanenRac/HYDRA-UMC-VISION-STREAMER) · [HYDRA-UMC-DETECTION-HEF](https://github.com/JuanenRac/HYDRA-UMC-DETECTION-HEF) · [HYDRA-UMC-SAFETY-ZONES](https://github.com/JuanenRac/HYDRA-UMC-SAFETY-ZONES) · [HYDRA-UMC-VISUAL-SERVOING-API](https://github.com/JuanenRac/HYDRA-UMC-VISUAL-SERVOING-API)
- **🧠 认知 AI 节点（Hailo-10）：** [HYDRA-UMC-VLA-ENGINE](https://github.com/JuanenRac/HYDRA-UMC-VLA-ENGINE) · [HYDRA-UMC-SEMANTIC-PLANNER](https://github.com/JuanenRac/HYDRA-UMC-SEMANTIC-PLANNER) · [HYDRA-UMC-DOCS-QA](https://github.com/JuanenRac/HYDRA-UMC-DOCS-QA)
- **🐝 编排与集群：** [HYDRA-UMC-ORCHESTRATOR](https://github.com/JuanenRac/HYDRA-UMC-ORCHESTRATOR) · [HYDRA-UMC-SWARM-SYNC](https://github.com/JuanenRac/HYDRA-UMC-SWARM-SYNC) · [HYDRA-UMC-PATH-PLANNER-3D](https://github.com/JuanenRac/HYDRA-UMC-PATH-PLANNER-3D) · [HYDRA-UMC-JOB-DISPATCHER](https://github.com/JuanenRac/HYDRA-UMC-JOB-DISPATCHER) · [HYDRA-UMC-NODE-HEALING](https://github.com/JuanenRac/HYDRA-UMC-NODE-HEALING)
- **🎮 数字孪生与仿真：** [HYDRA-UMC-PHYSICS-REPLICA](https://github.com/JuanenRac/HYDRA-UMC-PHYSICS-REPLICA) · [HYDRA-UMC-SYNTHETIC-DATA-GEN](https://github.com/JuanenRac/HYDRA-UMC-SYNTHETIC-DATA-GEN)
- **📊 数据与分析：** [HYDRA-UMC-DATALAKE](https://github.com/JuanenRac/HYDRA-UMC-DATALAKE) · [HYDRA-UMC-TELEMETRY-COLLECTOR](https://github.com/JuanenRac/HYDRA-UMC-TELEMETRY-COLLECTOR) · [HYDRA-UMC-ANOMALY-DETECTOR](https://github.com/JuanenRac/HYDRA-UMC-ANOMALY-DETECTOR) · [HYDRA-UMC-PRODUCTION-REPORTS](https://github.com/JuanenRac/HYDRA-UMC-PRODUCTION-REPORTS)
- **🏭 工业网关：** [HYDRA-UMC-GATEWAY-INDUSTRIAL](https://github.com/JuanenRac/HYDRA-UMC-GATEWAY-INDUSTRIAL) · [HYDRA-UMC-OPCUA-SERVER](https://github.com/JuanenRac/HYDRA-UMC-OPCUA-SERVER) · [HYDRA-UMC-MQTT-BROKER](https://github.com/JuanenRac/HYDRA-UMC-MQTT-BROKER) · [HYDRA-UMC-MTCONNECT-ADAPTER](https://github.com/JuanenRac/HYDRA-UMC-MTCONNECT-ADAPTER)
- **🛠️ 配套工具：** [URTC-SMART-RACK](https://github.com/JuanenRac/URTC-SMART-RACK) · [URTC-VISION-TOOL](https://github.com/JuanenRac/URTC-VISION-TOOL) · [HYDRA-UMC-WATCH](https://github.com/JuanenRac/HYDRA-UMC-WATCH) · [HYDRA-UMC-TOOL-CLI](https://github.com/JuanenRac/HYDRA-UMC-TOOL-CLI)

总的来说，该作者的生态系统所涵盖的项目远不止本项目——以上是一份地图，而非详尽的功能列表；请查看每个仓库自身的 README 以了解其今天实际的功能。

---

## 👤 作者
**JuanenRac** (Electro Hobby 3D)
📧 electrohobby3d@gmail.com
📺 [youtube.com/@electrohobby3d](https://youtube.com/@electrohobby3d)

## 📜 许可证

HYDRA-UMC STUDIO 版权所有 (c) 2026 JuanenRac（Electro Hobby 3D）。分发本项目或其衍生作品时必须包含此声明。

本应用的源代码依据 **GNU 通用公共许可证 v3.0（GPL-3.0）** 提供。完整文本见 https://www.gnu.org/licenses/gpl-3.0.html。

文档（本 README 及其自身的翻译版本——`README_spa.md`、`README_ita.md`、`README_fra.md`、`README_deu.md`、`README_zho.md`、`README_jpn.md`）依据 **知识共享 署名-相同方式共享 4.0 国际许可协议（CC BY-SA 4.0）** 提供。完整文本见 https://creativecommons.org/licenses/by-sa/4.0/。

**第三方机器人网格资产：** `public/models/` 下的真实 3D 几何数据**不**受上述 GPL-3.0 覆盖——每个机器人型号自身的网格文件都是单独许可的第三方资产，以其自身原始条款在此重新分发：

| 制造商 | 型号 | 许可证 |
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
| Opulo | LumenPnP v4（也用于 JuanenPnP） | CERN-OHL-W v2 |

每个型号自身确切的源仓库、路径和许可证文本参考，均记录在该型号自身的 `public/models/<slug>/ATTRIBUTION.txt` 中——在重新分发某一特定网格集之前请查阅该文件，而不要假定上表可以替代它。LumenPnP 自身的 `ATTRIBUTION.txt` 值得完整阅读一遍——与上面每一个机器人手臂（制造商自身预制的 STL 文件，逐字下载）不同，那 5 个网格文件是从 Opulo 真实的 FreeCAD 源文件在内部生成的，而非按原样重新分发。

本仪表盘是 [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) 主板项目的网页控制面板——其自身的硬件（CERN-OHL-S v2）和固件（GPL-3.0）许可证参见该仓库，本仓库自身的许可证并不延伸至该仓库,反之亦然。它还针对 [URTC](https://github.com/JuanenRac/URTC) 协议实现了 CAN-OTA 工具——其自身独立的许可证参见该项目自身的仓库。

如果你基于本项目进行开发，请留意这种许可证划分：代码更改应保持 GPL-3.0，文档衍生品应保持 CC BY-SA,任何对特定机器人网格资产的重新分发都应保持在该型号自身的原始许可证之下——每一项都需附带指向本项目及其作者的署名。
