<!-- =============================================================================
HYDRA-UMC-STUDIO - Web control dashboard of the HYDRA-UMC multi-robot micro-factory
Copyright (C) JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
GPL-3.0-or-later - see LICENSE
============================================================================= -->

<p align="center">
  <img src="images/HYDRA_UMC_BANNER.svg" alt="HYDRA-UMC-STUDIO banner" width="100%">
</p>

# 🤖 HYDRA-UMC-STUDIO

<p align="center"><a href="README.md">🇺🇸 English</a> | <a href="README_spa.md">🇪🇸 Español</a> | <a href="README_fra.md">🇫🇷 Français</a> | <a href="README_ita.md">🇮🇹 Italiano</a> | <a href="README_deu.md">🇩🇪 Deutsch</a> | <a href="README_zho.md">🇨🇳 简体中文</a> | 🇯🇵 <b>日本語</b> | <a href="README_por.md">🇵🇹 Português</a></p>

### 🤖 HYDRA-UMC マルチロボット・マイクロファクトリー向け Web ベース制御ダッシュボード

<p align="center">
  <img src="https://img.shields.io/badge/License-GPL%203.0--or--later-blue.svg" alt="GPL 3.0 or later">
  <img src="https://img.shields.io/badge/Framework-React%2019-61DAFB.svg" alt="Framework">
  <img src="https://img.shields.io/badge/Tool-Vite-646CFF.svg" alt="Tool">
  <img src="https://img.shields.io/badge/3D-Three.js-black.svg" alt="3D">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6.svg" alt="Language">
  <img src="https://img.shields.io/badge/Tests-733%20passing-2ea44f.svg" alt="Tests">
  <img src="https://img.shields.io/badge/Version-0.8.0.6-0f6cbd.svg" alt="Version">
  <img src="https://img.shields.io/badge/Maturity-functional-0F6CBD.svg" alt="Maturity">
</p>

---

> **安全性とセキュリティの現状:** このエコシステムは認証された安全システムではありません。ハードウェアの E-STOP 経路、ファームウェアが強制する制限やインターロック、検証済みの動作コマンドはまだありません。ファームウェアイメージは CRC-32 と Ed25519 署名で検査し、リリースビルドは公開済みの開発用鍵を拒否します(リレーの先のツールヘッドと拡張ボードは引き続き URTC のブートローダーを使い、署名ではなく共有鍵の HMAC-SHA256 を使います)。TLS と相互 TLS は任意で、既定では無効です。独自基板はまだ実装も試験もされていません。ここに書かれた内容を人の安全のために頼る前に、[セキュリティベースライン](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md)と[脅威モデル](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md)をお読みください。

---

## 📋 ひと目で

| | |
|---|---|
| バージョン | `0.8.0.6` |
| 成熟度 | 機能する |
| テスト | 733 (`npm test`) |
| 技術 | React 19 / Vite / Three.js / Tailwind CSS |
| 対象 | HYDRA-UMC セルの Raspberry Pi CM5 |
| 実機での確認 | ベンチ環境で動作：上の正直さの確認に、どの部分が実機で動いたかが書かれています |

**移動：** [概要](#-概要) · [アーキテクチャ](#-アーキテクチャ) · [機能](#-機能) · [セキュリティと安全](#-セキュリティと安全) · [インターフェース](#-インターフェース) · [設定](#-設定) · [クイックスタート](#-クイックスタート) · [テスト](#-テスト) · [トラブルシューティング](#-トラブルシューティング) · [リポジトリの構成](#-リポジトリの構成) · [関連プロジェクト](#-関連プロジェクト)

## 🚦 プロジェクトの状況

各行はこのリポジトリの一部分で、信号は今日どこまで進んでいるかを示します。計画ではなく、リポジトリが示せるもの（テスト、ビルド、実行）に基づいて書かれています。

🟢 完了・検証済み · 🟡 動作する（既知の制限あり） · 🟠 一部のみ、または未検証 · 🔴 未実装または動作しない

| 領域 | 状態 | ここでの意味 |
|---|---|---|
| ソフトウェア | 🟡 | 主な目的では動作します。足りない点は上の正直さの確認に書かれています |
| テスト | 🟢 | 自動テスト 733 件。変更のたびに実行されます |
| 実機 | 🟡 | ベンチ環境で動作：上の正直さの確認に、どの部分が実機で動いたかが書かれています |
| ドキュメント | 🟢 | 8 言語の README。変更のたびにマニフェストと照合されます |

## 🎯 概要

**HYDRA-UMC STUDIO** は、[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)——最大 8 台の分散ロボットアームを単一の FDCAN バス上で統括する、マルチロボット・マイクロファクトリーのマザーボード（Raspberry Pi CM5 ホスト + デュアルコア STM32H745 リアルタイムコプロセッサ）——のブラウザベース制御ダッシュボードです。HYDRA-UMC 自身のリポジトリがハードウェアとファームウェアを扱うのに対し、本リポジトリは人が触れる側を担います：あらゆるロボットを実際の 3D で可視化し、その動作をジョグ・記録し、ロボットセルに付随する機械やアクセサリを管理し、CAN-OTA ファームウェアチェーン全体を書き込み・テストする、単一ページの React アプリケーションです——これらすべてが、Node.js 以外にネイティブなインストールを一切必要とせず、1 つのブラウザタブの中で完結します。

**本エコシステムの他のドキュメントと同じ慣例に従った正直な注記：** HYDRA-UMC 自身の実際のハードウェアは、まだテスト済みのシリコンとしては存在していません（そのブートローダーはクリーンにコンパイルされますが、実機ボード上ではまだ実行されていません——同リポジトリ自身の `docs/architecture.md` を参照）。そのため、本ダッシュボードの CAN-OTA Flasher/Tester ツールは、存在しないハードウェアと通信しているふりをするのではなく、各階層について文書化された実際のアドレッシング方式に従う、完全な内蔵シミュレーションに対して動作します。3D ロボット可視化、運動学、軌道記録、そしてすべてのアクセサリ制御パネルは、それとは独立して完全に実物です——今のところシミュレーションされているのは CAN-OTA トランスポート自体のみです。

**React 19**、**Vite**、**Three.js**（`@react-three/fiber`/`@react-three/drei` 経由）、そして **TypeScript** で構築されています——自身のバックエンドコードを持たない純粋なクライアントです。永続化された状態は、本アプリがネットワーク越しに通信する別個のバックエンド **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** 上に存在します。

## 🧩 HYDRA-UMC での役割

**HYDRA-UMC-STUDIO** はセルの Web 制御ダッシュボードです。実際の運動学で各ロボットを 3D 表示し、ジョグと軌道の記録を行い、アクセサリーや機械のパネルを操作し、CAN-OTA チェーンでファームウェアの書き込みと試験を行い、サーバーを管理します（8 言語）。独自の状態は持たず、安全に関する判断もしません。ロール、制限、予約、停止は HYDRA-UMC-SERVER が決めます。

## 🏛️ アーキテクチャ

<p align="center">
  <img src="images/architecture.svg" alt="HYDRA-UMC-STUDIO architecture" width="100%">
</p>

## 🖼️ スクリーンショット

テストベンチで 1920×1080 で撮影。サンプルデータを使用しており、実際の設備は接続されていません。

<table>
<tr><td width="50%" valign="top"><img src="images/screenshots/overview.png" alt="概要：マイクロファクトリーの 8 台のロボットノードと、その役割・モデル・ツール。下のバーにマシンの状態を表示します。" width="100%"><br><sub>概要：マイクロファクトリーの 8 台のロボットノードと、その役割・モデル・ツール。下のバーにマシンの状態を表示します。</sub></td><td width="50%" valign="top"><img src="images/screenshots/robot-view.png" alt="ロボットビュー：関節コントロール、XYZ ジョグ、アームの 3D モデル、記録済みポイントを含む軌道パネル。" width="100%"><br><sub>ロボットビュー：関節コントロール、XYZ ジョグ、アームの 3D モデル、記録済みポイントを含む軌道パネル。</sub></td></tr>
<tr><td width="50%" valign="top"><img src="images/screenshots/xy-table.png" alt="XY テーブル：テーブルのサイズ、ステップ付きのジョグボタン、各軸のライブ 3D ビュー。" width="100%"><br><sub>XY テーブル：テーブルのサイズ、ステップ付きのジョグボタン、各軸のライブ 3D ビュー。</sub></td><td width="50%" valign="top"><img src="images/screenshots/flasher-studio.png" alt="Flasher Studio：ボードとロボットスロットを選び、ファームウェアファイルを選んで CAN で書き込みます。ここはシミュレーションで、ボードには何も送信されません。" width="100%"><br><sub>Flasher Studio：ボードとロボットスロットを選び、ファームウェアファイルを選んで CAN で書き込みます。ここはシミュレーションで、ボードには何も送信されません。</sub></td></tr>
<tr><td width="50%" valign="top"><img src="images/screenshots/tester-center.png" alt="Tester Center：ボードのステータス LED、永続性チェック、ツールテレメトリ、セルフテスト、生バスモニター。" width="100%"><br><sub>Tester Center：ボードのステータス LED、永続性チェック、ツールテレメトリ、セルフテスト、生バスモニター。</sub></td><td width="50%" valign="top"><img src="images/screenshots/safety-limits.png" alt="安全制限：ジョグの有効化、予約ルール、ロボットモデルごとのジョグとベッド温度の上限。サーバーに保存されます。" width="100%"><br><sub>安全制限：ジョグの有効化、予約ルール、ロボットモデルごとのジョグとベッド温度の上限。サーバーに保存されます。</sub></td></tr>
</table>

## ✨ 機能

### マルチロボット 3D 制御

複数の独立した 6 自由度ロボットを同時に管理でき、それぞれが独自の実際の 3D モデル、運動学、ジョグ／軌道状態を持ちます。モデルピッカー（RobotDetail → Config タブ）は、利用可能なすべてのロボットをメーカーごとにグループ化します：

- 🏭 **Source Robotics** —— Parol6、Faze4（メッシュはそれぞれ MIT ライセンスと GPL-3.0 ライセンス、各モデル自身の `ATTRIBUTION.txt` を参照）
- 🏭 **Annin Robotics** —— AR3、AR4（MIT ライセンスメッシュ）
- 🏭 **Universal Robots** —— UR3e、UR5e、UR10e、UR16e、UR20 —— 公式のジオメトリ、関節限位、リンク運動学は、Universal Robots 自身の [Universal_Robots_ROS2_Description](https://github.com/UniversalRobots/Universal_Robots_ROS2_Description) リポジトリ（BSD-3-Clause）から直接取得しており、e-Series ラインナップの小型から重量級までのペイロード範囲をカバーします
- 🏭 **Universal Robots（クラシック）** —— UR3、UR5、UR10 —— e-Series 以前の CB ラインナップ、公式のジオメトリ／DH パラメータは Universal Robots 自身の [universal_robot](https://github.com/ros-industrial/universal_robot) ROS-Industrial リポジトリ（BSD-3-Clause）から
- 🏭 **UFACTORY** —— xArm6、Lite 6（BSD-3-Clause メッシュ、公式 [xarm_ros2](https://github.com/xArm-Developer/xarm_ros2) のジオメトリ／運動学）
- 🏭 **Comau** —— e.DO（BSD-3-Clause メッシュ、公式 [eDO_description](https://github.com/ianathompson/eDO_description) のジオメトリ／運動学）
- 🏭 **Kinova** —— Gen3 Lite、Gen2（BSD-3-Clause メッシュ、公式 [ros2_kortex](https://github.com/Kinovarobotics/ros2_kortex) のジオメトリ／運動学）
- 🏭 **FANUC** —— M-710iC（BSD-3-Clause メッシュ、公式 [fanuc_m710ic_description](https://github.com/robot-descriptions/fanuc_m710ic_description) のジオメトリ／運動学）
- 🏭 **The Robot Studio** —— SO-ARM100、5 自由度（6 ではない）の低コストアーム（Apache-2.0 メッシュ、公式 [SO-ARM100](https://github.com/TheRobotStudio/SO-ARM100) のジオメトリ／運動学）
- 🏭 **AgileX** —— PiPER（Apache-2.0 メッシュ、公式 [agilex_piper_arm_description](https://github.com/renesas-rdk/agilex_piper_arm_description) のジオメトリ／運動学）
- 🏭 **Unitree** —— Z1（BSD-3-Clause メッシュ、Google DeepMind の [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie) 経由——同リポジトリ内の各ロボットフォルダはそれぞれ独自の元のメーカーライセンスを保持）
- 🏭 **Trossen Robotics** —— ViperX 300、WidowX 250（BSD-3-Clause メッシュ、公式 [interbotix_ros_manipulators](https://github.com/Interbotix/interbotix_ros_manipulators) のジオメトリ／運動学）
- 🏭 **Koch / Low-Cost Robot Arm** —— Koch v1.1、もう 1 つの 5 自由度（6 ではない）低コストアーム（Apache-2.0 メッシュ、[mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie) 経由）
- ⚙️ **汎用** —— 専用モデルを持たないあらゆる装置向けの簡略化された 2 リンクアーム

13 社のメーカーにまたがる 24 個の実在するロボットモデルに加え、汎用プレースホルダーがあるということです——この一覧が要約する正確なモデル↔メーカー↔ライセンスの対応は、下部のライセンス表を参照してください。すべての実在モデル（汎用を除くすべて）は、リンクごとに実際の STL メッシュジオメトリを読み込み、そのメーカー自身の実際の関節変換チェーンを通じて駆動します——様式化されたプレースホルダーではありません。正／逆運動学は各ロボット自身の実際のジオメトリに対して計算されます（位置についてはニュートン・ラフソン法で解き、ロボットが定義している場合は実際の関節ごとの限位を使用）。そのため、記録された軌道やジョグされた直交座標の目標は、実際の物理ロボットが実際に動くのと同じように正しいアームを動かします。Universal Robots の 5 つの e-Series モデルはさらに、1 つの共通 FK/IK エンジン（`src/examples/urKinematicsShared.ts`）と 1 つの共通 3D リグレンダラー（`src/components/3d/URArm.tsx`）を共有しています。これは、すべての UR e-Series 関節がまったく同じ運動学的構造を共有しているためで、モデルごとに異なるのは数値上のリンク長のみです。3 つのクラシック UR モデル（UR3/UR5/UR10）は代わりにそれぞれ独自のエンジンとレンダラーを共有しています（`src/examples/urClassicKinematics.ts`、`src/components/3d/UrClassicArm.tsx`）。この旧世代の関節は e-Series のように共通のローカル Z 軸をすべて共有しているわけではないためです。

各ロボットのジョグ制御には、各軸に対する**速度**と**加速度**両方のロータリーノブ＋スライダーが含まれ、CAN-OTA が実機ハードウェアに接続されると、完全なエンドストップ/ステータス表示とともに、実時間の「ロボットコントローラーボード」ステータスカードが表示されます。各ノブ／スライダーは、連続的に動くのではなく、それぞれのコンボボックスで選択されたジョグ**ステップ**値（0.1° から 100°/mm まで）にスナップします。ロボット **A1** は、異なるレイアウトの実験的な概念実証です：その速度／加速度／J1-J6／XYZ ジョグ制御は、他のすべてのロボットが引き続き使用する下部パネルではなく、3D ビューポート自体の上にあるドラッグ可能なフローティングパネル内にあります（XYZ パッドは `Joystick3D.tsx`）——`src/components/robots/A1.tsx` を参照してください。

### Kinematic Brain ステージ

HYDRA-UMC マザーボード自身のローカル運動サブシステム——STACK A 上の分散ロボットアームとは別の、STM32H745 が直接駆動する軸——専用の制御パネルです：

- 📐 **XY ガントリー** X、Y1、Y2（デュアル Y ガントリー）、Z 軸のジョグ制御
- 🔥 **ヒートベッド** 制御（SSR 切替、230VAC）
- 🔄 **ATC リボルバー** —— E0 駆動の自動工具交換装置のための回転式工具インデックス制御
- 🎢 **コンベア** —— E1 駆動の搬送ベルトのための設置／稼働／速度制御
- 🛑 完全な 12 系統のエンドストップグリッド、3 系統のファンチャンネル、プロセス流体用の 10 個のポンプ／10 個のバルブ

### アクセサリ・機械制御パネル

ロボットセルに付随する機械やアクセサリ専用のパネル：**XY テーブル**、**ATC ツール**、**ラックマネージャー**、**ピック＆プレース**（JuanenPnP/LumenPnP 固有の設定を含む）、**CNC**（JuanenCNC 固有の設定を含む）、**レーザー**（JuanenLaser 固有の設定を含む）、**真空テーブル**、**ヒートベッド**。

---

### 🧩 選択可能な真空テーブル

真空テーブルメニューで6種類の実際のSTLモデルから選択できます：160 × 120、230 × 210、230 × 250、232 × 217、240 × 240、250 × 250 mm。ベース厚は15 mm、位置決め壁を含む全高は16.2 mmです。幅と長さは5 mm刻みで変更できます（10–5000 mm）。平面寸法のみを拡大・縮小し、厚さは変えません。モデルを選ぶと元の寸法に戻ります。カスタム寸法はSERVER経由で同期されます。拡大・縮小した穴や溝は配置の可視化用であり、製造用STLの再生成ではありません。モデルの選択は位置、ポンプ、バルブの状態を保持します。リセットは160 × 120 mmを選択し、ポンプとバルブをオフにします。旧設定や不明なモデルIDは最初のモデルで表示されます。STUDIOとSUITEの両インターフェースは同じカタログとロボット設定のmodelIdを使用します。

[モデル・設定・再生成ガイド](docs/VACUUM_TABLE_MODELS.md).

### 🔥 ヒートベッドモデル

STLプリセットは100×100、200×100、200×200、255×255 mmの4種類で、厚さはすべて5 mmです。幅と長さは5 mm刻みで変更できます（25–5000 mm）。モデルを選ぶと寸法が戻り、加熱状態は変わりません。可視化用であり、電気設計や製造設計ではありません。

[ヒートベッドモデル — STL / OpenSCAD](docs/HEATED_BED_MODELS.md).

### 🗄️ 設定可能な STL ラック

STL ラック：幅と奥行きは 40～1000 mm、1 mm 刻み。基板数は 1～24 枚、間隔は 10 mm 固定です。表示設定であり、ロボットの校正ではありません。

[設定可能な STL ラック — STL / OpenSCAD](docs/RACK_MODELS.md).

### 🛠️ 独立した機械モデル

JuanenPnP、JuanenCNC、JuanenLaser は独立した STL コピーを使用し、LumenPnP は元のモデルを維持します。各モデルは専用フォルダーで編集してください。CAD 寸法を使用し、従来のサイズ設定ではモデルを引き伸ばしません。

[独立した機械モデル — STL](docs/MACHINE_ASSETS.md).

これらのオリジナルJuanenPNP / HYDRA-UMCモデルとSCADソースはGPL-3.0です。Opulo製マシンのCADではありません。

### 作業と軌道

既定のサンプル軌道を読み込む、あるいは自分自身のポイントをリアルタイムでジョグ＆記録する、またはロボットごとに複雑な多点軌道（JSON）を読み込み／保存／編集／再生します。軌道はロボットモデル間で移植可能です——記録された各ポイントは、それをたまたま記録したロボットに対して固定されるのではなく、読み込み／描画／再生の時点でその特定のロボット自身の実際の運動学（`src/examples/robotKinematicsDispatch.ts`）を通じて解決されるため、同じ軌道ファイルが Parol6 と UR10e それぞれの実際に到達可能なジオメトリに沿って正しく駆動します。

### CAN-OTA ファームウェアツール

HYDRA-UMC + URTC の CAN-OTA チェーン全体を、1 つのダッシュボードから 2 つの専用エントリポイントで書き込み・自己診断します：

- **URTC → Flasher / Tester** —— URTC ツールヘッドボードおよびその自身の拡張ボード向け（独立した [URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)/[URTC Tester](https://github.com/JuanenRac/URTC-TESTER) デスクトップツール自身のプロトコルカバレッジと一致）
- **HYDRA-UMC → Flasher / Tester** —— ロボットコントローラーボードと Kinematic Brain の両階層向け。CM5 → SPI → STM32H745 → FDCAN1 → ロボットコントローラーボード → CAN → URTC ツールヘッドまで全経路が中継され、JTAG/SWD プローブも USB-CAN アダプターも不要です（完全なアドレッシング／中継設計は [HYDRA-UMC 自身の `docs/architecture.md`](https://github.com/JuanenRac/HYDRA-UMC/blob/main/docs/architecture.md) を参照）

いずれも `URTC` または `HYDRA-UMC` リポジトリ向けの実際のファームウェアリリースを、GitHub から直接ダウンロードできます（`firmware_manifest.json` に基づき、CRC32 で検証済み）。上記のとおり、実際の STM32H745 ファームウェアが実機ハードウェア上に存在して通信できるようになるまで、トランスポート自体は完全な内蔵シミュレーションに対して動作します。

### ゲームパッド対応

USB および Bluetooth コントローラーの統合、ボタン／軸ごとのカスタムマッピングにより、マウス／キーボードなしでロボットやアクセサリをジョグできます。リアルタイムのアクション(ジョイント/テーブルのジョグ、E-STOP、START/STOP、再生速度)は、ロボット詳細パネルのジョグボタンが使うのと同じアトミックな `sendRobotCommand()` パスを発火させます。デバウンスされた設定保存ではありません - `GamepadController.tsx` を参照。

### カメラ統合

最大 8 系統の同時ライブ映像（USB ビジョンまたは MLX90640/41/42 系列のサーマルセンサー）に加え、録画状態と推論状態を表示します——これは HYDRA-UMC 自身のデュアル USB 3.0 ハブサブシステムが構築の中心に据えているカメラマトリクスです。

### 多言語インターフェース

**英語、スペイン語、ドイツ語、フランス語、イタリア語、簡体字中国語、日本語、ポルトガル語**でインターフェース全体を翻訳しています（`src/locales/`）。アプリ内のヘルプメニューとそのステップ別ガイド、アシスタント、バージョン情報ダイアログ（バージョン／作者／ライセンス）、システム設定ダイアログの各タブを含みます。すべての画面を100%網羅しているわけではなく、いくつかの独立したアクセサリパネルはまだ英語固定です。

### ヘルプ、ガイド、アシスタント

ヘルプ画面には**ステップ別ガイド**タブがあります。作業ごとに1つのガイド（コントローラの追加、ロボットの移動、軌道の記録、カメラの利用、ファームウェアの書き込み、ユーザー管理、リモートアクセス、セキュリティなど）があり、それぞれにレベル（基本・上級・技術）、検索ボックス、作業を行う画面へ移動するボタンが付いています。アシスタントの**Hydri**は、ダッシュボードの上に浮かぶ小さなアニメーションのマスコットです。今いる画面を説明し、作業を手順ごとに案内し、サーバーもAIモデルも使わずに言葉で入力した質問に（8言語のどれでも）答え、ブラウザ自身の音声で回答を読み上げ、好きな場所へドラッグして固定でき、ヘルプ画面でオン／オフを切り替えられます。設定はブラウザに保存されます（`src/assistant/`）。

### ℹ️ About とシステム設定

ヘッダー（`Config`/`About` ボタン）からアクセスできる 2 つの独立したダイアログ：**About** は、現在実行中のアプリバージョン（`GET /api/hydra-info` からリアルタイムに読み取り）、作者、ライセンスを表示します。**Config** は、サーバーの身元、コントローラー/ノード管理、UI テーマ + 言語、ロボットの改名、競合検出付きのカメラ↔ロボットマッピング、カスタム URDF ライブラリ、サードパーティソフトウェア統合（OpenPnP/CNC/レーザーバックエンド）、クライアントごとのリモートアクセス（SUITE/Android/iOS それぞれ独立したスイッチ）、ユーザーアカウント、ロボットごとの作業ディレクトリ、CAN-OTA トランスポート、ゲームパッドマッピングをカバーします——それぞれが独自のタブです。両方とも独立したコンポーネントであり（`src/components/About.tsx`、`src/components/Config.tsx`）、メインダッシュボードシェルにインライン化されてはいません。

### 信頼性

このアプリは、実際の本番インシデント(再デプロイ後にキオスク画面が真っ黒になった件)から生まれた、2種類の異なる実行時障害から自身を守っています。`src/main.tsx` は Vite 自身の `vite:preloadError` イベントをリッスンします——再デプロイをまたいで開いたままのブラウザタブが、古いハッシュの下ではもう存在しない `React.lazy()` で読み込まれるパネルチャンク(`vite.config.ts` によりコンテンツハッシュ化された `Dashboard.tsx` の各パネル)を取得しようとしたときに発生します——そして自動的に1回だけページをリロードするため、長時間開いたままのキオスクタブやバックグラウンドの古いタブが、誰にも気づかれずに自己修復します。`sessionStorage` によるガードが、何か別の理由で本当にチャンクが欠落している場合に永遠にリロードループに陥るのを防ぎます。別途、`src/components/ErrorBoundary.tsx` は `<Suspense>` パネル領域を、それ以外のレンダリングクラッシュに対するバックストップとしてラップしています。アクティブなタブでキー管理されているため、クラッシュしたパネルから離れると実際に次のパネルを再試行し、ダッシュボード全体がフォールバック画面で固まったままになることはありません。
コマンドは黙って失敗しません。ジョグ、再生、電源、ビジョン、ツールの各コマンドは型付きの結果を返し、期限切れのセッションは一度更新して再送され、それでも拒否されたものはバナーに表示されます。赤い **STOP** ボタンはグローバルです。ワンクリックで確認なしに、すべてのコントローラーの全ロボットを停止し、すべてのバルブとポンプを 1 回の呼び出しでオフにします(`POST /api/stop-all`)。ヘッダーとフッター、ロボットパネル、リモート操作オーバーレイにあり、Ctrl+Shift+Space でキーボードからも押せます(誤って入力されない組み合わせで、キーを押し続けても無視されます)。結果はロボットごとに一覧表示され(停止しなかったロボットや保存できなかった停止は警告、他のアカウントが予約中のロボットには印)、ネットワーク障害は一度再試行され、制限超過(429)やルートのないサーバー(404)にはロボットごとの停止で対応し、後の STOP が応答を得るまで「STOP 未確認」の警告が残ります。ジョイスティックのジョグはデッドマン方式です(ポインターのキャンセル、ウィンドウのフォーカス喪失、タブが非表示になったとき、または 8 秒後に終了)。J1 の移動は最も近い等価角度にとどまり、20 度を超えるジョグステップは拒否されます。ゲームパッドは画面で選択したロボットに追従し、送信頻度が制限されます。リリースのファームウェアは CAN-OTA の書き込み前に sha256 で検証され、ブートローダーイメージは任意で、取り込んだ軌道とシーンは共有状態に入る前に検証されます。

どのクライアントについても、ロボットを誰がどこまで動かせるかはサーバーが決めます。ロボットは、要求したアカウントとウィンドウ(ウィンドウごとに選ばれるコントローラ ID)のために**予約**できます。同じアカウントでも別のウィンドウからの操作や別のアカウントは、どの場合かを示すメッセージ(`other-controller`、`other-account`、`controller-id-required`)付きで拒否され、予約の一覧は `GET /api/claims` から取得され、管理者はロボットを引き継げます。ジョグの大きさ、絶対ジョグの範囲、ベッドの最高目標温度は、アプリ内に持たず `GET /api/safety-limits` から読み取ります。管理者は **エコシステム > 安全上限** でモデルごとに編集でき、任意のジョグのアーム(既定ではオフ。オンにするとボタンで一定時間ジョグをアームします)と必須のコントローラ ID も設定できます。各ロボットには **Live / Sim** スイッチがあり(既定は Live)、Sim ではそのウィンドウからロボットを動かすものや何かをオンにするものは送信されず、STOP は常に通ります。アームが到達できない点を含む Work やサンプルは、その点の一覧とともに拒否され、代わりにモデルの到達範囲に合わせて縮小できます。 予約の一覧はサーバーが WebSocket(`remoteApiVersion=2` を要求した接続向けの `claims` メッセージ)でも送るため、アクセスバーは次のポーリングを待たずに変更をすぐ表示します。送信が届いている間、ポーリングはときどきしか動きません。 書き込みは条件付きです。各書き込みには、このウィンドウが最後に見たロボットのリビジョン(`If-Match`)が付き、その間に他の人がロボットを変更していた場合、サーバーは 412 を返し、ロボットが読み直されてバナーで知らされます(標準は予約、テーブル、単発のコマンドを確認、厳格は STOP 以外すべてを確認、オフは何も確認せず、STOP は確認されません)。XY テーブルはアトミックな `table` コマンドで動き、管理者は **エコシステム > 監査記録** で、SHA-256 チェーンを検証した追記専用の監査記録を読めます。

### アカウントとアクセス

各バックエンドは、自身の初回起動時に 1 つのアカウントを準備します——ユーザー名 `admin`、パスワード `admin`——サーバーが完全に信頼された LAN の外からアクセス可能になったら、すぐに **Config > Users** から変更してください。同じタブでは、管理者アカウントが追加の**オペレーター**アカウントを作成できます：オペレーターはログインし、リアルタイムの状態を確認し、ロボットを駆動できます（ジョグ／再生／一時停止／停止／ツール／バルブ／ポンプ／速度）が、グローバル設定を上書きしたり他のアカウントを管理したりすることはできません。見て回るだけならアカウントは一切不要です——ログイン画面自身の「読み取り専用で続行」を選ぶと、書き込みが無効化された状態でダッシュボードに直接進みます。完全な契約（役割、トークン、`/api/users` ルート）は [HYDRA-UMC-SERVER 自身の `docs/REMOTE_API.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md) の第 2a/2b 節に記載されています。 本番では、最初の管理者はデプロイのブートストラップ設定から作られ、サーバーは例のシークレットを拒否します（[HYDRA-UMC-SERVER の `docs/PRODUCTION_BOOTSTRAP.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/PRODUCTION_BOOTSTRAP.md) を参照）。

5 つのリモートクライアント（SUITE、Android、iOS、Watch、DSI）はそれぞれ `X-Hydra-Client` リクエストヘッダーで自己識別するため、**Config > Remote Access** は、5 つすべてに対する 1 つの結合スイッチではなく、それぞれを独立して許可またはブロックできます。

**Server Admin** には、ログイン中のアカウント用の**2段階サインイン**カードがあります(所有者が有効にするまでオフ)。パスワード、otpauth アドレスの QR コード(アプリ内で描画し、追加パッケージは不要)と手入力用のキー、認証アプリの最初のコード、そして一度だけ表示される 10 個の使い切りリカバリーコードを扱います。有効なアカウントではサインイン画面がそのコードを求め、**Config > Users** では、電話とリカバリーコードの両方を失ったアカウントの 2 段階目を管理者が解除できます。

### 永続化された状態

HYDRA-UMC STUDIO 自体は純粋なクライアントです——現在のセッションのためにメモリ上にあるもの以外、自身の状態は一切保持しません。すべての永続化データ（`settings.json`、`users.json`、`WORKS/` 下に保存された軌道、提出されたモデル）は、本アプリがネットワーク越しに通信する別個のバックエンド **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** 上に存在します（全体像は同プロジェクト自身の `data/` と README を参照）——どちらもバックエンドプロセスに一切触れないため、状態はページの再読み込みや本アプリ自身の再デプロイを経ても失われません。`settings.json` 自体は、そのバックエンドの静的ファイル配信から意図的に除外されています（コントローラーの IP、CAN-OTA 設定、ロボットごとの完全な状態を保持しているため）が、その `WORKS/` フォルダは通常どおり配信されます。

サインインはブラウザのタブが開いている間だけ有効です。セッションと更新トークンは `sessionStorage` に保存されるため、タブを閉じると終了します。サインインオプション **この端末でサインインを維持する** を選ぶと、代わりに `localStorage` に保存され、ブラウザを再起動しても残ります(既定ではオフ)。本番ページには Content-Security-Policy が meta タグとして含まれます(スクリプトはページ自身からのみ、インラインスクリプトとプラグインは不可)。ビルド時に `HYDRA_STUDIO_CSP=off` を指定すると、ヘッダーを自前で設定するデプロイ向けにこれを省略でき、それ以外の値はそのままポリシーとして使われます。

同じ `GET`/`POST /api/settings` 契約に加え、ディスカバリーエンドポイント（`GET /api/hydra-info`）とリアルタイムプッシュ更新用の `WebSocket /ws` も、外部クライアントが同じバックエンドに接続する方法です——これにより、[HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) がネットワーク上で稼働中の HYDRA-UMC SERVER インスタンスを発見し、その状態を読み取り／変更でき、本アプリ自身のブラウザタブから行った変更がリアルタイムに反映されるのを見ることができます（その逆も同様）。完全な契約は [HYDRA-UMC-SERVER 自身の `docs/REMOTE_API.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md) にあります。

`GET /api/system/metrics` は概要ダッシュボードのフッターを駆動します：CPU 負荷とメモリ使用率は常に実際の値です（Node 自身の `os` モジュール）。温度は、実際の Raspberry Pi 上で動作している場合は実際の `vcgencmd measure_temp` の出力を読み取り、そうでない場合は明確にフラグ付けされたモック値にフォールバックします（レスポンス内の `temp_is_real`）。Wi-Fi/イーサネット/Bluetooth の状態は `/sys/class/net`/`/sys/class/bluetooth` から読み取られます（Linux 専用、それ以外のホストでは推測値ではなく `null`／不明）。

### 接続者と Server Admin のアクセスオプション

- **Connected Apps の接続履歴：** ライブ接続の一覧の下に、サーバーにサインインした相手を簡単に示します。サーバーが見たクライアント（種類、ユーザー、バージョン、ローカルか外部か、現在開いているセッション、成功または拒否されたサインイン）と、最近のサインイン、拒否されたサインイン、サインアウト、終了したセッションを `GET /api/connections/clients` と `GET /api/connections/events` から読みます。サーバーが古くて提供できない場合は、その旨をはっきり表示します。どちらの一覧にもパスワードやトークンは含まれず、アドレスはサーバーに保存を指示した場合だけ表示されます。
- **エコシステムの健全性：** Ecosystem の下に、サービスごとに 1 枚のカード（状態、理由、報告バージョンと期待バージョン、最後に応答してからの時間）、状態とバージョンのずれによるフィルター、サーバーの TLS 証明書がまもなく期限切れになる場合やサービスがマニフェストと異なるバージョンを報告する場合の通知を備えたビューがあります。サーバーの `GET /api/ecosystem/health` を読み取り、これは管理者が Server Admin でオンにします。オフの場合はビューがその旨を表示し、応答しない 1 つのサービスが他を隠すことはありません。
- **Server Admin の 9 つのアクセススイッチ**（管理者のみ）：`health.open`（サインインなしのヘルスルート）、`safety.publishGlobalStop`（MQTT ブリッジでグローバル停止を通知）、`connections.recordAddress`（各クライアントのアドレスを履歴に残す）、`camera.open`（チケットなしのカメラ映像）、`websocket.allowQueryToken`（WebSocket アドレス内のトークン）、`logging.redactSecrets`（ログの秘密情報の伏せ字）、`voice.requireSignature`（確認済みの音声リクエストに検証済み署名を要求）、`camera.credentialsViaEnv`（IP カメラのパスワードを、コマンドラインではなくプロセスの環境経由で渡す）、`install.newInstallTls`（新規インストールが自動的に TLS を有効にする）。すべて保守的な値で始まり、それぞれ値の出どころ（既定、画面から保存、またはサーバーの環境で固定されロックされる）を表示し、変更した分だけを送り、保護を下げる変更は先に確認を求め、サーバーが提供しないオプションは表示しません。HYDRA-UMC-SERVER の `docs/REMOTE_API.md` を参照してください。
- **メッシュを 1 つのパッケージから：** 3D モデルはリポジトリのツリーに含まれなくなりました（221 MiB、HYDRA-UMC-SUITE と共有）。`meshes.pack.json` は 1 つのパッケージ（45 MB、HYDRA-UMC-MESHES で公開）と各メッシュの SHA-256 を固定しており、`npm run dev`、`npm run build` とテストは初回実行時にそれを取得します。インターネット接続が必要なのは一度だけで、その後パッケージは `~/.cache/hydra-umc/meshes`（または `HYDRA_UMC_MESH_CACHE`）に保存されて再利用されます。ネットワークがない場合は、パッケージをそこにコピーするか、`HYDRA_UMC_MESH_PACKAGE` にそのパスを指定してください。`npm run meshes -- status | check | ensure | prepare` で `public/models/` を確認または復元します。取得元は `auto`（既定）、`local`（ダウンロードしない）、`download`（全メッシュを検証）で、`mesh_pack.config.json` または `HYDRA_UMC_MESH_SOURCE` で選びます。一致しないパッケージは何もインストールせず、`https` アドレスのみ受け付けます。[`docs/MESH_PACKAGE.md`](docs/MESH_PACKAGE.md) を参照してください。

## 🔒 セキュリティと安全

| 脅威 | 防御 | 場所 |
|---|---|---|
| ページ内で実行される注入スクリプト | ビルドはページに Content-Security-Policy を入れます。スクリプトはページ自身（と WebAssembly、3D デコーダーのホスト）のみ、オブジェクト禁止、base とフォームはページに限定。`HYDRA_STUDIO_CSP` で無効化や置き換えができます | `scripts/csp.ts`, `vite.config.ts` |
| ストレージから読み出されるサインイントークン | ここで入力したログインは `sessionStorage` に保存され（再読み込みでは残り、タブを閉じると消える）、「サインインを維持」を選んだときだけ `localStorage` に保存されます。アドレスで届いたトークンは `sessionStorage` のみに入り、ブラウザが送信しない `#token=` フラグメントで届き、読み取り後すぐアドレスから消されます | `src/lib/session.ts` |
| 2 人のオペレーターが同じロボットを変更する | ロボットごとにリビジョンがあり、書き込みは `If-Match` で送り、古いものは 412 で拒否されます。テーブルは原子的に動き、予約と動かせる人はサーバーがすべてのクライアントに対して決めます | `src/lib/revisions.ts`, `src/lib/tableMove.ts`, `src/lib/robotEdits.ts` |
| 確認や遅い画面を待つ停止 | 赤い STOP はグローバルで確認を求めません。`POST /api/stop-all` を 1 回送ると全ロボットが停止し、全バルブとポンプがオフになります。ルートが制限されているか無い場合はロボットごとの停止に切り替え、止まらなかったロボットはバナーに表示されます | `src/lib/stopAll.ts`, `src/components/StopAll.tsx` |
| アクセスオプションを誤って弱める（音声、MAVLink、Bluetooth、TLS など） | Server Admin は各値の出どころを示し、サーバーの環境変数が決めた値はロックします。弱める操作には確認が入り、保存後も警告が画面に残ります。対象は、話した内容を繰り返す音声返答、認識信頼度 0、署名のない MAVLink メッセージ、MAVLink 署名オフです | `src/components/AdminServer.tsx`, `src/lib/serverSecurity.ts` |
| 壊れたパネルや再デプロイ後の古いページで画面が真っ暗になる | 各タブは独自のエラー境界に入り、デプロイ後の古いチャンクは自動再読み込みを 1 回起こします（本当に無いファイルでループしないようガード付き） | `src/main.tsx`, `src/components/ErrorBoundary.tsx` |

**絶対にしないこと：** 安全の判断。独自の状態を持たず、ハードウェアの非常停止経路でもありません。運動学ブレインのステージと CAN-OTA ツールは内蔵シミュレーションに対してのみ動かしています。

## 🔌 インターフェース

| トピックまたはルート | 内容 |
|---|---|
| `/api/login`, `/api/refresh`, `/api/logout` | サインイン、期限切れ時にトークンを 1 回更新、サインアウト |
| `/api/settings`, `/api/robot/:id`, `/api/robot/:id/command` | 状態ツリーと型付きコマンド（ジョグ、再生、ツール、バルブ、ポンプ、ビジョン）。`If-Match` 付き |
| `/api/robot/:id/claim`, `/release`, `/jog-arm`, `/api/claims` | このアカウントとウィンドウ用にロボットを予約・解放、ジョグの有効化、誰が何を持つかの一覧 |
| `/api/stop-all`, `/api/safety-limits` | 全体停止と、サーバーが強制する安全制限 |
| `/ws` | 状態のライブ配信（トークンは `hydra.bearer` サブプロトコル、`remoteApiVersion=2`） |
| `/api/camera/*`, `/api/cameras/status` | カメラのストリーム、スナップショット、録画、PTZ、短命の画像チケット |
| `/api/hardware/canota/version`, `/api/hardware/canota/flash` | Flasher と Tester が使う CAN-OTA チェーン（実機ができるまでは完全なシミュレーション） |
| `/api/admin/server-config`, `/api/admin/clients`, `/api/admin/logs`, `/api/audit` | Server Admin：アクセスのスイッチ、接続中のアプリ、サーバーログ、監査記録（管理者） |

## ⚙️ 設定

設定は 2 種類あります。このアプリのビルドとブラウザーの設定と、Server Admin が編集するサーバーのアクセススイッチです（サーバーの環境変数が保存値より優先され、画面はどちらが有効かを示して他をロックします）。

| 変数 | 既定値 | 設定する内容 |
|---|---|---|
| `HYDRA_STUDIO_CSP` | `default` | ビルド時：`default`、`off`（ヘッダーをホストが設定する場合のポリシーなし）、または独自の完全なポリシー |
| `VITE_API_BASE_URL` | このページのホストのポート 3000 | ビルド時：サーバーが別のホストにあるときの場所（`.env.example` を参照） |
| `server.proxy` (`vite.config.ts`) | `localhost:3000` | 開発サーバーのみ：`/api`、`/ws`、`/WORKS` をサーバーへ転送し、CORS 設定は不要 |
| `aiAccess` | `open` | ローカル AI リレーを使える人。`open` はサインイン済みの全アカウント、`admin` は管理者のみ |
| `infoAuth` | オフ | 読み取り専用のホスト情報（メトリクス、プロセス監視、エコシステム状態）にサインインを要求する |
| `tls.enabled` | オフ（平文 HTTP） | 指定した証明書と鍵で HTTPS / WSS にする。使用中の証明書のフィンガープリントを画面に表示 |
| `ble.mode` | `off` | サーバー近くのスマートフォン向け Bluetooth LE：`off`、`state`（状態の公開のみ）、`commands`（コマンドも受付）。不明な語はオフ扱い |
| `ble.requireEncryption` | オン | コマンド用キャラクタリスティックへの書き込みと状態の読み出しは暗号化されたリンクのみ。変数が `off` のときだけ無効 |
| `mqtt.mode` | `off` | セルのブローカーへの MQTT ブリッジ：`off`、`state`、`commands`。URL・プレフィックス・ユーザーも設定 |
| `voice.includeHeardText` | オフ | 音声の返答が話した内容を繰り返す。個人データなので既定はオフで、変数では `1` という語だけがオンにします |
| `voice.minConfidence` | `0.6` | 動作を始める要求を受け付ける音声認識の最小信頼度（0〜1）。0 で確認をオフにし、停止は決して保留されません。変数の不正な数値は無視されます |
| `mavlink.signingKeyFile` | 空（署名なし） | UAV ブリッジの MAVLink 2 署名：32 バイトの鍵（生の 32 バイトまたは 16 進 64 文字）を入れたファイルのパス。保存するのはパスだけで鍵は保存せず、ブリッジは起動時に読みます |
| `mavlink.signingAllowUnsigned` | オフ | 署名のないメッセージも受け付ける（まだ署名しない機体向け）。オンの間は画面が警告します |

## 🚀 クイックスタート

Node.js 22 以上と npm、そして起動中の HYDRA-UMC-SERVER（ポート 3000）が必要です。STUDIO は純粋なクライアントで、サーバーがなければ通信相手がありません。

```bash
npm install
./dev.sh                           # Vite dev server on port 5173, proxying /api, /ws and /WORKS to the server on port 3000 (dev.bat on Windows)
npm test                           # the Vitest suite
npm run typecheck && npm run lint  # types and lint
./build.sh                         # production build into dist/ (build.bat on Windows)
```

## 🧪 テスト

`npm test` で自動テスト 733 件を実行します。 ハードウェアも、このマシンの外にあるものも必要ありません。

CI は `HYDRA_UMC_CI=1 python tools/ci_validate.py` を実行し、マニフェスト、文書、8 つの README、図を検査します。

## 🏗️ ビルドとリリース

### 必要環境
- [Node.js](https://nodejs.org/)（v22 以上）
- npm
- 稼働中の **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** バックエンド（こちらも `npm run dev`、デフォルトポート `3000`）——本アプリは純粋なクライアントであり、これなしには通信する相手がありません。

### インストール

```bash
npm install
```

### 開発モード

Vite 自身の開発サーバー（純粋な `vite`、ポート `5173`）をライブリロード付きで実行します。`vite.config.ts` 自身の `server.proxy` が `/api`、`/ws`、`/WORKS` を透過的に `http://localhost:3000` へ転送するため、本アプリの相対パスの fetch/WebSocket 呼び出しは CORS 設定なしで HYDRA-UMC SERVER バックエンドに到達します——先にそのバックエンドが起動していることだけ確認してください：
- **Windows：** `dev.bat` をダブルクリックするか、`npm run dev` を実行
- **Linux/Mac：** `./dev.sh` または `npm run dev` を実行

### 自動テスト

```bash
npm run typecheck # tsc -b --noEmit（src/）+ tsc -p tsconfig.test.json --noEmit（tests/）
```

### プロダクションビルド

最適化された静的ビルドへコンパイルします（純粋な `vite build`——サーバーのバンドルは行わず、本アプリにはもうバックエンドコードは残っていません）：
- **Windows：** `build.bat` をダブルクリックするか、`npm run build` を実行
- **Linux/Mac：** `./build.sh` または `npm run build` を実行

プロダクションビルドをローカルでプレビュー：
```bash
npm run preview
```

生成された `dist/` フォルダを任意の静的ホストにデプロイしてください。デフォルトでは、ビルドされたアプリは、このページ自身のホスト名のポート `3000` でバックエンドを探します（一般的な「すべてを CM5 上に」というデプロイ形態に一致）。別の場所にホストされた HYDRA-UMC SERVER インスタンスを指すようにするには、ビルド時に `VITE_API_BASE_URL` を設定してください（`.env.example` 参照）。すべての実際の状態とデータは、本リポジトリではなく、そのバックエンド自身の `data/` ディレクトリに永続化されます。

### バージョン管理

`bump_manifest_version.py`(リポジトリのルート)が `hydra-umc.project.json` と `package.json` 自身の `version` フィールド両方の唯一の所有者です—— `npm run build`(`vite build`)は意図的にコンパイルのみを行い、片方だけをインクリメントして両者がずれることが決してないようにしています。`scripts/bump-version.mjs` はレガシーなネイティブ専用のヘルパーで、参考としてのみ残されています——このリポジトリのどこからももう呼び出されません。2 桁の数字を持つセグメントには決して到達しません（`0.0.9` -> `0.1.0` であり、`0.0.10` にはなりません）。現在実行中のバージョンは **About** ダイアログでリアルタイムに確認でき（Studio のバージョンはこのアプリ自身の `package.json` から読み取られ、隣に表示されるサーバーのバージョンは `GET /api/hydra-info` から取得されます）、完全な履歴は [`CHANGELOG.md`](CHANGELOG.md) にあります。

## 🩺 トラブルシューティング

| 表示 | 原因 | 対処 |
|---|---|---|
| サインインに失敗する、またはすべての呼び出しがサーバーに届かないと言う | サーバーが動いていない、またはページが別のホストを探している | HYDRA-UMC-SERVER を起動する（開発ではポート 3000）、または `VITE_API_BASE_URL` を付けてビルド |
| 別のアカウントまたはウィンドウがロボットを保持しているためジョグやコマンドが拒否される | サーバーは最初に要求したアカウントとウィンドウにロボットを予約します。ジョグの有効化も必要です | ロボットのアクセスバーから解放するか待つ。管理者は誰が保持しているか確認できます |
| 保存が 412 で拒否される | 読み込み後に別のクライアントがロボットを変更したため、リビジョンが古い | ロボットを再読み込みして、もう一度変更する |
| Server Admin のスイッチがグレーになっている | 値はサーバーの環境変数から来ており、保存値より優先される | サーバーの環境変数を変えて再起動する。各値の出どころは画面に表示される |
| サーバーを再デプロイしたらページが空白になる | 開いているタブがもう存在しないチャンクを指している | ページは 1 回自動で再読み込みします。空白のままなら手動で再読み込みし、本当にファイルが無ければ再ビルドしてください |

## 📂 リポジトリの構成

<p align="center">
  <img src="images/repository-structure.svg" alt="Repository structure of HYDRA-UMC-STUDIO" width="100%">
</p>

<details>
<summary>ツリーのテキスト版</summary>

```text
HYDRA-UMC-STUDIO/
├── src/                             ソースコード
│   ├── App.tsx                      ルーターとレイアウト、エントリポイント、グローバル状態のプロバイダー
│   ├── Dashboard.tsx                トップレベルのアプリシェル——ナビゲーション、概要パネル、フッターのシステム指標
│   ├── store.ts                     グローバル状態：RobotModel/RobotState/HydraController/SystemSettings ——
│   ├── motionSource.ts              描画されたポーズが表すもの (指令値か、機械が追従した値か)、および sendRobotCommand() の純粋な状態遷移の中核
│   ├── i18n.ts                      react-i18next の設定——src/locales/*.json を読み込み
│   ├── hooks/                       usePartColors.ts: HYDRA-UMC-EDITOR-STL が保存したパーツごとの色の上書き
│   ├── assets/                      アプリのアイコン、スプラッシュ画面、画像と、グローバルなスタイル
│   ├── assistant/                   Hydri アシスタント：回答エンジン、知識ベース（8言語）、マスコット、設定
│   ├── components/                  画面とパネル：ロボット詳細、3D シーン、管理、CAN-OTA ツール
│   ├── examples/                    実在する 24 のロボットモデルの順・逆運動学
│   ├── lib/canOta.ts                CAN-OTA シミュレーション/プロトコル層、GitHub ファームウェアダウンロード
│   ├── lib/apiBase.ts               バックエンド URL の解決——開発環境では相対パス+プロキシ、本番環境では VITE_API_BASE_URL
│   ├── lib/mediaTicket.ts           カメラ映像用の短寿命チケット
│   ├── lib/claims.ts                予約、コントローラ ID、サーバーから読む安全上限、Live/Sim モード
│   ├── lib/revisions.ts             ロボットごとのリビジョン(If-Match、412)、テーブルのアトミックな移動、監査記録とそのチェーン検証
│   ├── lib/session.ts               セッショントークン、サーバーのアクセスオプション、オペレーター向けエラー文言、設定を保存できる人、crypto.subtle を使わない SHA-256
│   ├── lib/stopAll.ts               グローバル STOP、ロボットコマンドへの応答、ロボットの編集をコマンド化したもの、選択中のロボット、再生ステップの番号付け、到達不能な軌道の警告、フランジ上のツールの位置、最短経路の角度
│   ├── lib/claimsFeed.ts            予約のライブ一覧、ファイル取り込み前の検査、押し続け入力の間引き、押し続けたジョグボタンの繰り返し、ダイアログのキーボード規則、保存した MJPEG 録画のパーサー、エディターが提出したモデルのカタログ
│   └── locales/                     en/es/de/fr/it/zh/ja/pt 翻訳ファイル（react-i18next）
├── docs/                            真空テーブル・ヒートベッド・ラック・機械モデルのガイド
├── public/                          3D モデル：ロボット、ラック、ヒートベッド、真空テーブル、機械（STL と OpenSCAD）
├── images/                          README バナー
├── tests/                           実際の Vitest スイート(610 件のテスト)—— src/examples/ の FK/IK 数学のみ、React/DOM は不使用
├── tools/                           プロジェクトのツールと CI の検査
├── scripts/                         bump-version.mjs (明示的なバージョン更新) と csp.ts (ビルドされたページの Content-Security-Policy)
├── .github/                         CI ワークフローと Issue テンプレート
├── index.html                       Vite がアプリをビルドする元のページ (Content-Security-Policy はビルド時に埋め込まれる)
├── example_trajectory.json          独立したサンプル軌道（関節角シーケンス、サンプルデータ）
├── metadata.json                    アプリ名/説明（ホスティングプラットフォームが使用）
├── bump_manifest_version.py         hydra-umc.project.json のバージョンをネイティブ側と同期（--sync）
├── build.sh / build.bat             依存関係のインストール + プロダクションビルド
├── build-test.sh / build-test.bat   バージョンを更新しないビルド/コンパイル確認
├── dev.sh / dev.bat                 依存関係のインストール + Vite 開発サーバーの起動
├── vitest.config.ts                 Vitest 設定(tests/ のみ、実際の node 環境 —— DOM は不要)
├── tsconfig.test.json               tests/ 用の独立した型チェックプロジェクト(app/node の参照とは分離)
├── .env.example                     VITE_API_BASE_URL テンプレート——src/lib/apiBase.ts を参照
├── CHANGELOG.md                     各バージョンの変更点
├── hydra-umc.project.json           マニフェスト：バージョン、成熟度、ファミリー
├── package.json                     パッケージのメタデータとスクリプト
├── mesh_pack.config.json            3Dモデルの取得元：local（既定）、auto、download、およびパッケージのアドレス
├── meshes.pack.json                 メッシュパッケージとそれに含まれる各メッシュのサイズと SHA-256
└── test.sh                          テストを実行
```

</details>

## 🗺️ ロードマップと既知の制限

**現時点の既知の制限**

* CAN-OTA チェーン（Flasher と Tester）と運動学ブレインのステージは内蔵シミュレーションに対してのみ動かしています。書き込みや試験の対象となる HYDRA-UMC コントローラーボードはまだありません。
* テーブル、ヒートベッド、ラックのサイズは見た目の設定であり、ロボットのキャリブレーションでも電気設計や製造設計でもありません。
* STOP はサーバー経由で、無線の非常停止やハードウェアの停止経路はありません。
* ロボットを動かすことはすべてサーバー（ロール、制限、予約）が決めます。このアプリだけで動作を安全にすることはできません。

**次：** このアプリの新機能はすべて HYDRA-UMC-SUITE に移植し、CAN-OTA ツールは最初の実機ボードを待ちます。

## 🌍 言語

この README とリポジトリの文書は、英語・スペイン語・ドイツ語・フランス語・イタリア語・日本語・中国語・ポルトガル語（ポルトガル）の 8 言語で提供されています。8 つのファイルは同時に書かれ、同じ節と同じリンクを持つことを CI が確認します。

## 🔗 関連プロジェクト

本プロジェクトは、同じ作者(JuanenRac / Electro Hobby 3D)による HYDRA-UMC ロボティクスエコシステムの一部です。リクエストが実はこの中のどれかについてのものである可能性があるため、知っておく価値があります。

**親プロジェクト**
- **[HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** — すべての制御クライアントが実際に通信する、本物のヘッドレスバックエンド(REST/WebSocket)。本ダッシュボードはその純粋なフロントエンドクライアントであり、独自のバックエンドコードは持たない。

**兄弟プロジェクト** —— それぞれ独自のクライアントとして、同じく HYDRA-UMC-SERVER 自身の API と通信する
- **[HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)** — 複数のサーバーを同時に扱えるデスクトップ(PySide6)スウォームコマンドセンター、スタンドアロン実行ファイルとしてパッケージ化。
- **[HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL)** — 生体認証ログインとペアリングされた Wear OS コンパニオンを備えたネイティブ Android 制御アプリ。
- **[HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL)** — リアルタイム WebSocket 同期を備えた iOS/iPadOS 制御アプリ(Flutter)。
- **[HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)** — 本体搭載の 7 インチ DSI タッチスクリーン向けネイティブタッチ UI、CM5 自体に組み込み。
- **[HYDRA-UMC-BRIDGE-AMR](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-AMR)** — VDA 5050 MQTT パブリッシャーによる AGV/AMR フリートの調整境界(エミュレートしたフリートに対してのみテスト済み)。
- **[HYDRA-UMC-BRIDGE-CNC](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-CNC)** — GRBL ステータス/制御バイトへのアクセスを持つ、CNC セルの高レベルコーディネーター(エミュレーターに対してのみテスト済み)。
- **[HYDRA-UMC-BRIDGE-DROIDS](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-DROIDS)** — Boston Dynamics Spot コマンド送信機能を持つ、脚型/ヒューマノイドドロイドの調整境界(エミュレーターに対してのみテスト済み)。
- **[HYDRA-UMC-BRIDGE-LASER](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-LASER)** — キー/筐体/インターロックの GPIO 信号 3 系統を読み取るレーザーセルのコーディネーター(模擬チップに対してのみテスト済み。レーザーの武装や発射はできない)。
- **[HYDRA-UMC-BRIDGE-OPENPNP](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-OPENPNP)** — OpenPnP ピックアンドプレースの基板フローを安全に統括する高レベルコーディネーター。
- **[HYDRA-UMC-BRIDGE-PRINTER3D](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-PRINTER3D)** — 実際にゲート制御されたジョブコマンドを持つ、Moonraker/Klipper 3D プリンター向けの安全な調整境界。
- **[HYDRA-UMC-BRIDGE-ROS2](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-ROS2)** — 遅延インポートの rclpy ROS 2 トランスポートを持つコーディネーター(ROS 2 環境ではまだ実行していない)。
- **[HYDRA-UMC-BRIDGE-UAV](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-UAV)** — MAVLink コマンド送信機能を持つ、カメラ搭載 UAV の調整境界(エミュレーターに対してのみテスト済み)。

**子プロジェクト**
- **[HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF)** — `POST /api/models/submit` 経由で完成したモデルを本ダッシュボード自身のカタログへ送信するデスクトップ用グラフィカル URDF 作成/編集ツール。
- **[HYDRA-UMC-EDITOR-STL](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-STL)** — 本ダッシュボード自身の `public/models/` ライブラリ（および HYDRA-UMC-SUITE が保持するそのミラー）向けのデスクトップ STL モデルエディタ - 実在するパーツを変換/置換/削除/追加し、何かを永久に削除することは決してない。

**直接関連**
- **[HYDRA-UMC-DASHBOARD-AI](https://github.com/JuanenRac/HYDRA-UMC-DASHBOARD-AI)** — 誠実な統計フォールバックを備えた、DATALAKE/ANOMALY-DETECTOR 上のスマートサマリーと異常ハイライトパネル。この同じダッシュボードを統計サマリーで拡張する(言語モデルはまだない)。
- **[HYDRA-UMC-COGNITIVE-NODE](https://github.com/JuanenRac/HYDRA-UMC-COGNITIVE-NODE)** — Hailo-10 コグニティブパイプライン(LLM/VLA/音声オーケストレーション)の統合ハブ。本ダッシュボードに音声/自然言語制御を追加する。
- **[HYDRA-UMC-VOICE-UI](https://github.com/JuanenRac/HYDRA-UMC-VOICE-UI)** — 確認ゲート付きの限定的な Watch リレーを備えた、実際の音声フロントエンド(VAD + 意図解析)。本ダッシュボードに音声/自然言語制御を追加する。
- **[HYDRA-UMC-LOCAL-TECHNICIAN](https://github.com/JuanenRac/HYDRA-UMC-LOCAL-TECHNICIAN)** — エコシステム自身のための、ローカルでポリシーゲート付きのAIメンテナンス技術者 — 観察、診断し、修正を提案する;最上位の2つのリスクレベルは意図的にまだ実装されていない。
- **[HYDRA-UMC-TWIN](https://github.com/JuanenRac/HYDRA-UMC-TWIN)** — 実際のバージョン互換性同期契約を持つ、デジタルツインエンジンの統合ハブ。実機に触れる前に本ダッシュボードから直接デジタルツインでプレビューできるようにする。
- **[HYDRA-UMC-HIL-BRIDGE](https://github.com/JuanenRac/HYDRA-UMC-HIL-BRIDGE)** — シミュレーションと実機の間にソフトウェアの衝突インターロックを備えたハードウェア・イン・ザ・ループのルーター(実機なしでテスト済み)。実機に触れる前に本ダッシュボードから直接デジタルツインでプレビューできるようにする。

**エコシステムの他のプロジェクト**

*コアハードウェア&プラットフォーム*
- **[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)** — ロボットアームのマザーボードの設計——CM5 ホスト + デュアルコア STM32H745、CAN-OTA/SPI-OTA 経由で最大 8 本のツールアームを統括することを目指す(ファームウェアは初期段階で、実装済みの基板はまだない)。
- **[HYDRA-UMC-OS](https://github.com/JuanenRac/HYDRA-UMC-OS)** — CM5 向けの再現可能な Raspberry Pi OS プロダクト層——読み取り専用エージェント、検証済み設定/プロファイル、WiFi 初回接続プロビジョニング。
- **[HYDRA-UMC-SDK](https://github.com/JuanenRac/HYDRA-UMC-SDK)** — すべてのブリッジが自身のコマンドを検証する共有 JSON-Schema 契約とソフトウェアのジョブゲート境界(認証済みの安全機能ではない)。
- **[HYDRA-UMC-CONNECTOR-HUB](https://github.com/JuanenRac/HYDRA-UMC-CONNECTOR-HUB)** — 外部マシン用コネクタのための宣言的アダプターマニフェストのレジストリとバリデーター。SDK 自身の契約という発想を外部マシンにまで拡張し、産業用ゲートウェイ系のプロジェクトを置き換えることはありません。

*URTC ツールプラットフォーム*
- **[URTC](https://github.com/JuanenRac/URTC)** — 物理的な Universal Robot Tool Controller 基板向けファームウェア、CAN バス経由の 25 以上のツールプロファイル。
- **[URTC-FLASHER](https://github.com/JuanenRac/URTC-FLASHER)** — URTC 基板用のデスクトップ GUI 書き込みツール、CAN-OTA およびフルチップ SWD/JTAG。
- **[URTC-TESTER](https://github.com/JuanenRac/URTC-TESTER)** — URTC 基板向けのデスクトップ CAN バスライブ診断ツール、ツールプロファイルごとに 1 パネル。
- **[URTC-WEB-STUDIO](https://github.com/JuanenRac/URTC-WEB-STUDIO)** — Web Serial API を使ったブラウザベースの URTC-TESTER の代替、ローカルインストール不要。
- **[URTC-GATEWAY](https://github.com/JuanenRac/URTC-GATEWAY)** — URTC の CAN バスの前に置くゲートウェイ：許可する識別子のリスト、レート制限、セッション鍵。コンピューター上でテスト済みで、実際のバスではまだ試していません。

*ビジョン AI ノード(Hailo-8)*
- **[HYDRA-UMC-VISION-NODE](https://github.com/JuanenRac/HYDRA-UMC-VISION-NODE)** — Hailo-8 ビジョンパイプラインの統合ハブ、段階ごとの実際のハードウェア準備状況チェック付き。
- **[HYDRA-UMC-DETECTION-HEF](https://github.com/JuanenRac/HYDRA-UMC-DETECTION-HEF)** — Hailo アーキテクチャ/チェックサムによる安全読み込み検証を備えた、実際のコンパイル済みモデルレジストリ。
- **[HYDRA-UMC-VISION-STREAMER](https://github.com/JuanenRac/HYDRA-UMC-VISION-STREAMER)** — 実際の HailoRT 統合境界を持つ、実際の GStreamer パイプライン + MediaMTX 設定生成器。
- **[HYDRA-UMC-VISUAL-SERVOING-API](https://github.com/JuanenRac/HYDRA-UMC-VISUAL-SERVOING-API)** — ゾーン状態を条件に承認する Position-Based Visual Servoing 補正則。カメラによる姿勢推定はまだない。
- **[HYDRA-UMC-SAFETY-ZONES](https://github.com/JuanenRac/HYDRA-UMC-SAFETY-ZONES)** — ファイルから物体位置を受け取る、ゾーン侵入・キャリブレーション鮮度・E-STOP 要求の v0 ロジック。検出器は接続されておらず、物理 E-STOP もまだ配線されていない。

*コグニティブ AI ノード(Hailo-10)*
- **[HYDRA-UMC-VLA-ENGINE](https://github.com/JuanenRac/HYDRA-UMC-VLA-ENGINE)** — Vision-Language-Action モデル向けの、実際のアクショントークンのエンコード/デコードと軌道生成。
- **[HYDRA-UMC-SEMANTIC-PLANNER](https://github.com/JuanenRac/HYDRA-UMC-SEMANTIC-PLANNER)** — MCU エラーコードに対する、実際のルールベースのタスク分解と意味的エラー復旧。
- **[HYDRA-UMC-DOCS-QA](https://github.com/JuanenRac/HYDRA-UMC-DOCS-QA)** — このエコシステム自身の Markdown ドキュメントに対する、標準ライブラリのみの実際の TF-IDF 文書検索。

*オーケストレーション&スウォーム*
- **[HYDRA-UMC-ORCHESTRATOR](https://github.com/JuanenRac/HYDRA-UMC-ORCHESTRATOR)** — 実際の gRPC/Protobuf ヘルスレポート契約とミッションステートマシンを持つ統合ハブ。
- **[HYDRA-UMC-JOB-DISPATCHER](https://github.com/JuanenRac/HYDRA-UMC-JOB-DISPATCHER)** — 実際の HTTP API 上に構築された、優先度ベースの実際のジョブキュー(重複排除付き)。
- **[HYDRA-UMC-NODE-HEALING](https://github.com/JuanenRac/HYDRA-UMC-NODE-HEALING)** — リトライ/バックオフとアイデンティティ不一致検出を備えた、実際の gRPC ベースのフリートヘルスウォッチドッグ。
- **[HYDRA-UMC-PATH-PLANNER-3D](https://github.com/JuanenRac/HYDRA-UMC-PATH-PLANNER-3D)** — 実際の障害物/ワークスペース衝突検証を備えた、実際の RRT ベースの 3D 経路プランナー。
- **[HYDRA-UMC-SWARM-SYNC](https://github.com/JuanenRac/HYDRA-UMC-SWARM-SYNC)** — 複数セルの収束についてプロパティテストされた、実際の CRDT LWW-Element-Map 状態同期。

*デジタルツイン&シミュレーション*
- **[HYDRA-UMC-PHYSICS-REPLICA](https://github.com/JuanenRac/HYDRA-UMC-PHYSICS-REPLICA)** — 実際の URDF サブセットに対する、実際の順運動学と関節限界検証。
- **[HYDRA-UMC-SYNTHETIC-DATA-GEN](https://github.com/JuanenRac/HYDRA-UMC-SYNTHETIC-DATA-GEN)** — YOLO/COCO アノテーションのエクスポート機能を持つ、実際のプロシージャル 2D シーンジェネレーター。

*データ&分析*
- **[HYDRA-UMC-DATALAKE](https://github.com/JuanenRac/HYDRA-UMC-DATALAKE)** — 実際の取り込み/クエリ HTTP API を備えた、実際の sqlite3 ベースの時系列ストア。
- **[HYDRA-UMC-ANOMALY-DETECTOR](https://github.com/JuanenRac/HYDRA-UMC-ANOMALY-DETECTOR)** — ドリフト監視を備えた、実際の FFT + 統計ベースラインによる異常検知器。
- **[HYDRA-UMC-PRODUCTION-REPORTS](https://github.com/JuanenRac/HYDRA-UMC-PRODUCTION-REPORTS)** — DATALAKE の履歴に対する実際の OEE/稼働率計算、再現可能な CSV エクスポート付き。
- **[HYDRA-UMC-TELEMETRY-COLLECTOR](https://github.com/JuanenRac/HYDRA-UMC-TELEMETRY-COLLECTOR)** — シーケンス重複排除機能を備えた、DATALAKE への実際の CAN/WebSocket 取り込みパイプライン。

*産業用ゲートウェイ*
- **[HYDRA-UMC-GATEWAY-INDUSTRIAL](https://github.com/JuanenRac/HYDRA-UMC-GATEWAY-INDUSTRIAL)** — 実際のコマンド許可リスト/バックプレッシャー層を持つ、産業用プロトコルへ中継する統合ハブ。
- **[HYDRA-UMC-OPCUA-SERVER](https://github.com/JuanenRac/HYDRA-UMC-OPCUA-SERVER)** — 実際のバイナリプロトコルクライアントセッションで検証された、実際の OPC-UA アドレス空間。
- **[HYDRA-UMC-MQTT-BROKER](https://github.com/JuanenRac/HYDRA-UMC-MQTT-BROKER)** — クライアント単位のオプション認証とトピック ACL を備えた、実際の MQTT ブローカー。
- **[HYDRA-UMC-MTCONNECT-ADAPTER](https://github.com/JuanenRac/HYDRA-UMC-MTCONNECT-ADAPTER)** — 縮退モード出力を備えた、実際の MTConnect `/probe` および `/current` XML エンドポイント。

*補完ツール&エコシステム運用*
- **[HYDRA-UMC-TOOL-CLI](https://github.com/JuanenRac/HYDRA-UMC-TOOL-CLI)** — 実際の安定した終了コード契約を持つフリート CLI、HYDRA-UMC-SERVER 自身の API の本物のライブクライアント。
- **[HYDRA-UMC-WATCH](https://github.com/JuanenRac/HYDRA-UMC-WATCH)** — 触覚アラートのパターンとペアリング済みスマートフォンへの音声リレーを備えた WearOS コンパニオンアプリ(物理的なウォッチではまだ実行していない)。
- **[URTC-SMART-RACK](https://github.com/JuanenRac/URTC-SMART-RACK)** — 実際の工具 ID デコードと Smart Idle 予熱ロジックを備えた、基板搭載ラック用ファームウェア。
- **[URTC-VISION-TOOL](https://github.com/JuanenRac/URTC-VISION-TOOL)** — サーマル/RGB 検査ツールヘッド向けの、ファームウェアと実際の Python ビジョンコンパニオン。
- **[HYDRA-UMC-UPDATER](https://github.com/JuanenRac/HYDRA-UMC-UPDATER)** — このエコシステム内のすべてのリポジトリを検出・クローン・更新する、管理用デスクトップツール。
- **[HYDRA-UMC-OS-REBUILDER](https://github.com/JuanenRac/HYDRA-UMC-OS-REBUILDER)** — エコシステムの最新バージョンをプリロードした、書き込み可能なCM5イメージを構築するWindows/Linuxデスクトップツール。Raspberry Pi Imager方式の初回起動Wi-Fi/ユーザー/SSH設定を備える。
- **[HYDRA-UMC-OPS-AGENT](https://github.com/JuanenRac/HYDRA-UMC-OPS-AGENT)** — 保守インシデントコーディネーター: 低権限のエッジ役割がサニタイズされたインベントリ/ヘルスのスナップショットを収集し、コントロールプレーン役割がそれを読み取り専用でレンダリングして AI プロバイダーに診断の提案を依頼します - パッチを適用することも、何かをデプロイすることも決してありません。
- **[HYDRA-UMC-DEV-SERVER](https://github.com/JuanenRac/HYDRA-UMC-DEV-SERVER)** — 再現可能な開発ホスト（Raspberry Pi 5 / CM5）。エコシステムのソースコードを保管し、永続キューのもとで境界の明確なビルド/テストタスクを実行する。運用中の CM5 とは明確に異なる、開発専用の役割。

全体として、この著者のエコシステムは本プロジェクトをはるかに超えて広がっています——上記は地図であり、網羅的な機能一覧ではありません。各リポジトリが今日実際に何を行っているかは、それぞれ自身の README を確認してください。

## 📚 ドキュメント

さらに読むには：

* **[docs/MESH_PACKAGE.md](docs/MESH_PACKAGE.md)** — チェックサムを固定した 1 つのパッケージとしての 3D メッシュ。取得元 `local`、`auto`、`download` と、検証・取得のコマンド。
* **[docs/MACHINE_ASSETS.md](docs/MACHINE_ASSETS.md)** — 独立した機械モデル：モデルの選び方と所有者。
* **[docs/RACK_MODELS.md](docs/RACK_MODELS.md)** — 設定可能な入力・出力ラック：設定と互換性。
* **[docs/HEATED_BED_MODELS.md](docs/HEATED_BED_MODELS.md)** — ヒートベッドのモデル：4 つのプリセットの選択と寸法。
* **[docs/VACUUM_TABLE_MODELS.md](docs/VACUUM_TABLE_MODELS.md)** — 真空テーブルのモデル：ロボットに割り当てる方法。
* [エコシステムのセキュリティ基準](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md)
* [エコシステムの脅威モデル](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md)
* [このリポジトリの変更履歴](CHANGELOG.md)
* [このリポジトリのライセンス](LICENSE.md)

## 🤝 コントリビュートとコミュニティ

* プルリクエストの前に `HYDRA_UMC_CI=1 py -3 tools/ci_validate.py`（または `HYDRA_UMC_CI=1 python3 tools/ci_validate.py`）を実行してください。`CI_VALIDATION=PASS` と表示される必要があります。この確認に `build.sh` や `build.bat` は使わないでください。ビルドは検査ではありません。
* 8 つの README は HYDRA-UMC-DOCS の 1 つのソースから書かれます。手で編集しないでください。ソースを変更し、`tools/make_readmes.py` で書き直します。
* 実行していないことを README に書かないでください。事実であれば「シミュレーションのみ」「実機では未確認」と書きます。
* [CONTRIBUTING.md](CONTRIBUTING.md)、[行動規範](CODE_OF_CONDUCT.md)、[SECURITY.md](SECURITY.md)、[SUPPORT.md](SUPPORT.md) を参照してください。

## 👤 作者

**JuanenRac (Electro Hobby 3D)** · electrohobby3d@gmail.com

## 📜 ライセンス

GPL-3.0-or-later - [LICENSE](LICENSE).
