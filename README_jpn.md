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
  <a href="README_zho.md">🇨🇳 简体中文</a> |
  🇯🇵 <b>日本語</b>
</p>


### 🤖 HYDRA-UMC マルチロボット・マイクロファクトリー向け Web ベース制御ダッシュボード

<p align="left">
  <img src="https://img.shields.io/badge/License-GPL%203.0-blue.svg" alt="GPL 3.0">
  <img src="https://img.shields.io/badge/Framework-React%2019-61DAFB.svg" alt="React">
  <img src="https://img.shields.io/badge/Tool-Vite-646CFF.svg" alt="Vite">
  <img src="https://img.shields.io/badge/3D-Three.js-black.svg" alt="Three.js">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6.svg" alt="TypeScript">
</p>


---

## 🎯 概要

**HYDRA-UMC STUDIO** は、[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)——最大 8 台の分散ロボットアームを単一の FDCAN バス上で統括する、マルチロボット・マイクロファクトリーのマザーボード（Raspberry Pi CM5 ホスト + デュアルコア STM32H745 リアルタイムコプロセッサ）——のブラウザベース制御ダッシュボードです。HYDRA-UMC 自身のリポジトリがハードウェアとファームウェアを扱うのに対し、本リポジトリは人が触れる側を担います：あらゆるロボットを実際の 3D で可視化し、その動作をジョグ・記録し、ロボットセルに付随する機械やアクセサリを管理し、CAN-OTA ファームウェアチェーン全体を書き込み・テストする、単一ページの React アプリケーションです——これらすべてが、Node.js 以外にネイティブなインストールを一切必要とせず、1 つのブラウザタブの中で完結します。

**本エコシステムの他のドキュメントと同じ慣例に従った正直な注記：** HYDRA-UMC 自身の実際のハードウェアは、まだテスト済みのシリコンとしては存在していません（そのブートローダーはクリーンにコンパイルされますが、実機ボード上ではまだ実行されていません——同リポジトリ自身の `docs/architecture.md` を参照）。そのため、本ダッシュボードの CAN-OTA Flasher/Tester ツールは、存在しないハードウェアと通信しているふりをするのではなく、各階層について文書化された実際のアドレッシング方式に従う、完全な内蔵シミュレーションに対して動作します。3D ロボット可視化、運動学、軌道記録、そしてすべてのアクセサリ制御パネルは、それとは独立して完全に実物です——今のところシミュレーションされているのは CAN-OTA トランスポート自体のみです。

**React 19**、**Vite**、**Three.js**（`@react-three/fiber`/`@react-three/drei` 経由）、そして **TypeScript** で構築されています——自身のバックエンドコードを持たない純粋なクライアントです。永続化された状態は、本アプリがネットワーク越しに通信する別個のバックエンド **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** 上に存在します。

---

## 🦾 マルチロボット 3D 制御

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

---

## 🏭 Kinematic Brain ステージ

HYDRA-UMC マザーボード自身のローカル運動サブシステム——STACK A 上の分散ロボットアームとは別の、STM32H745 が直接駆動する軸——専用の制御パネルです：

- 📐 **XY ガントリー** X、Y1、Y2（デュアル Y ガントリー）、Z 軸のジョグ制御
- 🔥 **ヒートベッド** 制御（SSR 切替、230VAC）
- 🔄 **ATC リボルバー** —— E0 駆動の自動工具交換装置のための回転式工具インデックス制御
- 🎢 **コンベア** —— E1 駆動の搬送ベルトのための設置／稼働／速度制御
- 🛑 完全な 12 系統のエンドストップグリッド、3 系統のファンチャンネル、プロセス流体用の 10 個のポンプ／10 個のバルブ

---

## 🎛️ アクセサリ・機械制御パネル

ロボットセルに付随する機械やアクセサリ専用のパネル：**XY テーブル**、**ATC ツール**、**ラックマネージャー**、**ピック＆プレース**（JuanenPnP/LumenPnP 固有の設定を含む）、**CNC**（JuanenCNC 固有の設定を含む）、**レーザー**（JuanenLaser 固有の設定を含む）、**真空テーブル**、**ヒートベッド**。

---

## 🔄 作業と軌道

既定のサンプル軌道を読み込む、あるいは自分自身のポイントをリアルタイムでジョグ＆記録する、またはロボットごとに複雑な多点軌道（JSON）を読み込み／保存／編集／再生します。軌道はロボットモデル間で移植可能です——記録された各ポイントは、それをたまたま記録したロボットに対して固定されるのではなく、読み込み／描画／再生の時点でその特定のロボット自身の実際の運動学（`src/examples/robotKinematicsDispatch.ts`）を通じて解決されるため、同じ軌道ファイルが Parol6 と UR10e それぞれの実際に到達可能なジオメトリに沿って正しく駆動します。

---

## 🛠️ CAN-OTA ファームウェアツール

HYDRA-UMC + URTC の CAN-OTA チェーン全体を、1 つのダッシュボードから 2 つの専用エントリポイントで書き込み・自己診断します：

- **URTC → Flasher / Tester** —— URTC ツールヘッドボードおよびその自身の拡張ボード向け（独立した [URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)/[URTC Tester](https://github.com/JuanenRac/URTC-TESTER) デスクトップツール自身のプロトコルカバレッジと一致）
- **HYDRA-UMC → Flasher / Tester** —— ロボットコントローラーボードと Kinematic Brain の両階層向け。CM5 → SPI → STM32H745 → FDCAN1 → ロボットコントローラーボード → CAN → URTC ツールヘッドまで全経路が中継され、JTAG/SWD プローブも USB-CAN アダプターも不要です（完全なアドレッシング／中継設計は [HYDRA-UMC 自身の `docs/architecture.md`](https://github.com/JuanenRac/HYDRA-UMC/blob/main/docs/architecture.md) を参照）

いずれも `URTC` または `HYDRA-UMC` リポジトリ向けの実際のファームウェアリリースを、GitHub から直接ダウンロードできます（`firmware_manifest.json` に基づき、CRC32 で検証済み）。上記のとおり、実際の STM32H745 ファームウェアが実機ハードウェア上に存在して通信できるようになるまで、トランスポート自体は完全な内蔵シミュレーションに対して動作します。

---

## 🎮 ゲームパッド対応

USB および Bluetooth コントローラーの統合、ボタン／軸ごとのカスタムマッピングにより、マウス／キーボードなしでロボットやアクセサリをジョグできます。

---

## 📹 カメラ統合

最大 8 系統の同時ライブ映像（USB ビジョンまたは MLX90640/41/42 系列のサーマルセンサー）に加え、録画状態と推論状態を表示します——これは HYDRA-UMC 自身のデュアル USB 3.0 ハブサブシステムが構築の中心に据えているカメラマトリクスです。

---

## 🌐 多言語インターフェース

**英語、スペイン語、ドイツ語、フランス語、イタリア語、簡体字中国語、日本語**（`src/locales/`）にわたる完全なインターフェース翻訳。アプリ内のヘルプメニュー、About ダイアログ（バージョン／作者／ライセンス）、システム設定ダイアログのすべてのタブを含みます。カバレッジはまだすべての画面の 100% には達していません——一部の独立したアクセサリパネルは、まだ翻訳作業が及んでおらず、ハードコードされた英語のままです。

---

## ℹ️ About とシステム設定

ヘッダー（`Config`/`About` ボタン）からアクセスできる 2 つの独立したダイアログ：**About** は、現在実行中のアプリバージョン（`GET /api/hydra-info` からリアルタイムに読み取り）、作者、ライセンスを表示します。**Config** は、サーバーの身元、コントローラー/ノード管理、UI テーマ + 言語、ロボットの改名、競合検出付きのカメラ↔ロボットマッピング、カスタム URDF ライブラリ、サードパーティソフトウェア統合（OpenPnP/CNC/レーザーバックエンド）、クライアントごとのリモートアクセス（SUITE/Android/iOS それぞれ独立したスイッチ）、ユーザーアカウント、ロボットごとの作業ディレクトリ、CAN-OTA トランスポート、ゲームパッドマッピングをカバーします——それぞれが独自のタブです。両方とも独立したコンポーネントであり（`src/components/About.tsx`、`src/components/Config.tsx`）、メインダッシュボードシェルにインライン化されてはいません。

## 🔐 アカウントとアクセス

各バックエンドは、自身の初回起動時に 1 つのアカウントを準備します——ユーザー名 `admin`、パスワード `admin`——サーバーが完全に信頼された LAN の外からアクセス可能になったら、すぐに **Config > Users** から変更してください。同じタブでは、管理者アカウントが追加の**オペレーター**アカウントを作成できます：オペレーターはログインし、リアルタイムの状態を確認し、ロボットを駆動できます（ジョグ／再生／一時停止／停止／ツール／バルブ／ポンプ／速度）が、グローバル設定を上書きしたり他のアカウントを管理したりすることはできません。見て回るだけならアカウントは一切不要です——ログイン画面自身の「読み取り専用で続行」を選ぶと、書き込みが無効化された状態でダッシュボードに直接進みます。完全な契約（役割、トークン、`/api/users` ルート）は [HYDRA-UMC-SERVER 自身の `docs/REMOTE_API.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md) の第 2a/2b 節に記載されています。

3 つのリモートクライアント（SUITE、Android、iOS）はそれぞれ `X-Hydra-Client` リクエストヘッダーで自己識別するため、**Config > Remote Access** は、3 つすべてに対する 1 つの結合スイッチではなく、それぞれを独立して許可またはブロックできます。

---

## 💾 永続化された状態

HYDRA-UMC STUDIO 自体は純粋なクライアントです——現在のセッションのためにメモリ上にあるもの以外、自身の状態は一切保持しません。すべての永続化データ（`settings.json`、`users.json`、`WORKS/` 下に保存された軌道、提出されたモデル）は、本アプリがネットワーク越しに通信する別個のバックエンド **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** 上に存在します（全体像は同プロジェクト自身の `data/` と README を参照）——どちらもバックエンドプロセスに一切触れないため、状態はページの再読み込みや本アプリ自身の再デプロイを経ても失われません。`settings.json` 自体は、そのバックエンドの静的ファイル配信から意図的に除外されています（コントローラーの IP、CAN-OTA 設定、ロボットごとの完全な状態を保持しているため）が、その `WORKS/` フォルダは通常どおり配信されます。

同じ `GET`/`POST /api/settings` 契約に加え、ディスカバリーエンドポイント（`GET /api/hydra-info`）とリアルタイムプッシュ更新用の `WebSocket /ws` も、外部クライアントが同じバックエンドに接続する方法です——これにより、[HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) がネットワーク上で稼働中の HYDRA-UMC SERVER インスタンスを発見し、その状態を読み取り／変更でき、本アプリ自身のブラウザタブから行った変更がリアルタイムに反映されるのを見ることができます（その逆も同様）。完全な契約は [HYDRA-UMC-SERVER 自身の `docs/REMOTE_API.md`](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md) にあります。

`GET /api/system/metrics` は概要ダッシュボードのフッターを駆動します：CPU 負荷とメモリ使用率は常に実際の値です（Node 自身の `os` モジュール）。温度は、実際の Raspberry Pi 上で動作している場合は実際の `vcgencmd measure_temp` の出力を読み取り、そうでない場合は明確にフラグ付けされたモック値にフォールバックします（レスポンス内の `temp_is_real`）。Wi-Fi/イーサネット/Bluetooth の状態は `/sys/class/net`/`/sys/class/bluetooth` から読み取られます（Linux 専用、それ以外のホストでは推測値ではなく `null`／不明）。

---

## 📂 リポジトリ構成

```text
HYDRA-UMC-STUDIO/
├── src/
│   ├── Dashboard.tsx            # トップレベルのアプリシェル——ナビゲーション、概要パネル、フッターのシステム指標
│   ├── store.tsx                # グローバル状態：RobotModel/RobotState/HydraController/SystemSettings ——
│   │                             # REST + WebSocket 経由で別個の HYDRA-UMC-SERVER バックエンドと通信
│   ├── i18n.ts                  # react-i18next の設定——src/locales/*.json を読み込み
│   ├── components/
│   │   ├── About.tsx, Config.tsx  # システム設定と About ダイアログ——同じグローバルストアを読み取る
│   │   │                       # 独立したコンポーネント、ダッシュボードシェルにはインライン化されていない
│   │   ├── AuthGate.tsx, UsersPanel.tsx  # ログイン画面と Config > Users の管理者/オペレーターアカウント管理
│   │   ├── RobotDetail.tsx      # 共有のロボットごとのジョグ／軌道／設定実装（モデルピッカーはここにある）——
│   │   │                       # 下記の各 robots/A*.tsx エントリポイントはこれをレンダリングする
│   │   ├── robots/A1.tsx .. A8.tsx  # ロボットごとのエントリポイント——RobotDetail.tsx の薄い再エクスポート、
│   │   │                       # 他の 7 つに触れることなく将来のロボット固有の挙動を追加する場所。A1 は
│   │   │                       # すでに唯一の例外：RobotDetail.tsx 自身の `isFloatingLayout` 分岐
│   │   │                       # （robot.id === 1）が、速度/加速度/J1-J6/XYZ ジョグを、その下のパネルではなく
│   │   │                       # 3D ビューポート上のドラッグ可能なオーバーレイへ移動する。
│   │   ├── Joystick3D.tsx       # そのフローティングオーバーレイが使用する XYZ ジョグ D パッド
│   │   ├── VirtualKinematics.tsx  # React Three Fiber の <Canvas> シーンホスト
│   │   ├── KinematicBrainStage.tsx  # XY ガントリー／ヒートベッド／ATC リボルバー／コンベアパネル
│   │   ├── Flasher.tsx, Tester.tsx  # CAN-OTA ツール（URTC と HYDRA-UMC の両階層）
│   │   ├── ATCToolsConfig.tsx, RackConfigView.tsx, PickAndPlace.tsx, CNC.tsx, Laser.tsx,
│   │   │   VacuumTableConfig.tsx, HeatedBedConfig.tsx, XYTableConfig.tsx
│   │   │                       # アクセサリ／機械制御パネル
│   │   ├── JuanenPnPConfig.tsx, LumenPnPConfig.tsx, JuanenCNCConfig.tsx, JuanenLaserConfig.tsx
│   │   │                       # 機械固有の設定バリエーション——まだどのナビゲーションパスにも
│   │   │                       # 接続されていない（デッドコード）
│   │   ├── CamerasView.tsx, GamepadConfig.tsx, GamepadController.tsx, HelpModal.tsx
│   │   ├── FuturisticSlider.tsx, RotaryKnob.tsx  # 共有のジョグ制御ウィジェット
│   │   └── 3d/
│   │       ├── RobotArm.tsx     # robot.model に応じて正しいモデルごとのリグへディスパッチ
│   │       ├── Parol6Arm.tsx, Faze4Arm.tsx, AR3Arm.tsx, AR4Arm.tsx, EdoArm.tsx, Gen2Arm.tsx,
│   │       │   Gen3LiteArm.tsx, Lite6Arm.tsx, M710icArm.tsx, PiperArm.tsx, SoArm100Arm.tsx,
│   │       │   Vx300sArm.tsx, Wx250sArm.tsx, XArm6Arm.tsx, Z1Arm.tsx, KochArm.tsx,
│   │       │   LumenPnPRig.tsx, GenericRobotArm.tsx
│   │       │                   # メーカー固有のリグ、それぞれが自身の実際の URDF から手作業で転写されたもの
│   │       ├── URArm.tsx, UrClassicArm.tsx  # e-Series/クラシック Universal Robots ラインの共有パラメータ化リグ
│   │       ├── UR3eArm.tsx, UR5eArm.tsx, UR10eArm.tsx, UR16eArm.tsx, UR20Arm.tsx,
│   │       │   Ur3ClassicArm.tsx, Ur5ClassicArm.tsx, Ur10ClassicArm.tsx
│   │       │                   # URArm.tsx / UrClassicArm.tsx を薄くラップしたモデルごとの実装
│   │       ├── Shared3DEnvironment.tsx, SharedModule3DView.tsx, PathVisualizer.tsx,
│   │       │   Toolhead.tsx, DraggableGizmo.tsx, ATC3DView.tsx, Rack3DView.tsx
│   │       │                   # シーン環境、軌道描画、ツール/ギズモのレンダリング
│   ├── examples/
│   │   ├── kinematics.ts, utils.ts, robotKinematicsDispatch.ts
│   │   │                       # 共有の汎用 2 リンク運動学 + モデルごとのディスパッチ
│   │   ├── parol6Kinematics.ts, faze4Kinematics.ts, ar3Kinematics.ts, ar4Kinematics.ts,
│   │   │   edoKinematics.ts, gen2Kinematics.ts, gen3LiteKinematics.ts, kochKinematics.ts,
│   │   │   lite6Kinematics.ts, m710icKinematics.ts, piperKinematics.ts, soArm100Kinematics.ts,
│   │   │   xarm6Kinematics.ts, z1Kinematics.ts
│   │   │                       # メーカー固有の実際の FK/IK
│   │   ├── urKinematicsShared.ts, urClassicKinematics.ts  # e-Series/クラシック UR ラインの共有 FK/IK エンジン
│   │   ├── ur3eKinematics.ts, ur5eKinematics.ts, ur10eKinematics.ts, ur16eKinematics.ts, ur20Kinematics.ts,
│   │   │   ur3ClassicKinematics.ts, ur5ClassicKinematics.ts, ur10ClassicKinematics.ts
│   │   │                       # 薄いモデルごとの UR チェーン/限位/ホームポーズデータ
│   │   └── list/                # 26 個の既定サンプル軌道（円、螺旋、XY テーブルパターン、ピック＆プレースなど）
│   ├── lib/canOta.ts            # CAN-OTA シミュレーション/プロトコル層、GitHub ファームウェアダウンロード
│   ├── lib/apiBase.ts           # バックエンド URL の解決——開発環境では相対パス+プロキシ、本番環境では VITE_API_BASE_URL
│   └── locales/                 # en/es/de/fr/it/zh/ja 翻訳ファイル（react-i18next）
├── public/models/                # 実際の 3D メッシュアセット——ロボットごとに 1 フォルダ（計 24）、
│                                  # それぞれ自身の ATTRIBUTION.txt を持つ——下記のライセンス表を参照
├── images/                       # README バナー
├── .env.example                  # VITE_API_BASE_URL テンプレート——src/lib/apiBase.ts を参照
├── README.md                     # 本ファイル
└── README_spa.md / README_ita.md / README_fra.md / README_deu.md / README_zho.md / README_jpn.md  # 翻訳
```

本アプリが通信するバックエンド（設定の永続化、REST/WebSocket API、`docs/REMOTE_API.md`）は、本リポジトリではなく別個の **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** リポジトリにあります——その構成と実行方法は同プロジェクト自身の README を参照してください。

---

## 🛠️ 開発環境

### 必要環境
- [Node.js](https://nodejs.org/)（v18 以上推奨）
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

実際に `npm run build` が実行されるたびに、`package.json` 自身の `version` が自動的に加算されます（`scripts/bump-version.mjs`、`build` スクリプトの最初のステップとして実行）—— 10 進法の「オドメーター」方式です：ビルドごとに patch を +1 し、9 を超えると minor へ（minor が 9 を超えると major へ）繰り上がります。2 桁の数字を持つセグメントには決して到達しません（`0.0.9` -> `0.1.0` であり、`0.0.10` にはなりません）。現在実行中のバージョンは **About** ダイアログでリアルタイムに確認でき、完全な履歴は [`CHANGELOG.md`](CHANGELOG.md) にあります。

---

## 🔗 関連プロジェクト

本プロジェクトは、同一著者（JuanenRac／Electro Hobby 3D）による、より大きなロボティクスエコシステムの一部です。ご要望が実際にはこれらのプロジェクトのいずれかに関するものであり、本リポジトリのものではない可能性もあるため、知っておく価値があります：

**HYDRA-UMC プラットフォーム** —— マルチロボット・マイクロファクトリーセル
- **[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)** —— マザーボード本体：Raspberry Pi CM5 ホスト + デュアルコア STM32H745 リアルタイムコプロセッサ、CAN-OTA/SPI-OTA 経由で最大 8 台の分散ロボットアームを統括します。自社ハードウェア + ファームウェア、GPL-3.0/CERN-OHL-S v2/CC BY-SA 4.0。
- **HYDRA-UMC STUDIO**（本リポジトリ）—— HYDRA-UMC 向けの Web ベース制御ダッシュボード：マルチロボット 3D 可視化、運動学／軌道記録、プラットフォーム全体の CAN-OTA 書き込みとテスト。純粋な Vite/React クライアント——React + Vite + Three.js、自身のバックエンドコードは持ちません。
- **[HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** —— プラットフォーム全体のためのヘッドレス Express/WebSocket API バックエンド：ロボット/コントローラーの状態、認証、mDNS ディスカバリー、モデル提出。本アプリとは独立して動作します——別個のプロセスである理由は同プロジェクト自身の README を参照。
- **[HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL)** —— Wi-Fi／Bluetooth 経由で HYDRA-UMC を制御する Android アプリ。実際に動作するアプリです——完全なリモート制御機能セット、JWT 認証、暗号化された資格情報の保存。
- **[HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL)** —— Wi-Fi 経由で HYDRA-UMC を制御する iOS/iPadOS アプリ、Flutter 製（クロスプラットフォーム、Mac なしで Windows 上でも検証可能。最終的な `.ipa` パッケージングには Xcode が必要）。実際に動作するアプリです——Android アプリと同じ機能セット。
- **[HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)** —— デスクトップ（Python/PySide6）製の群制御コマンドセンター：マルチコントローラーのネットワークディスカバリー、リアルタイムの双方向同期、実際の 3D ロボットビューポート、Photoshop 風のドッキング可能なワークスペース。実際に動作します、プレースホルダーではありません。
- **[HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF)** —— デスクトップ（Python/PySide6）製のグラフィカル URDF 作成／編集ツール。本プロジェクト自身のモデルカタログ向け：GitHub またはローカルフォルダからソースファイルを取得し、自由度の実現可能性を検証し、リアルタイム 3D プレビューで色／スケール／運動学を編集し、完成した結果を稼働中の STUDIO サーバーへプッシュします（本プロジェクト自身の `POST /api/models/submit` および Config > Models を参照）。実際に動作します、プレースホルダーではありません。
- **[HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)** —— HYDRA-UMC 自身の 5"/7" DSI タッチスクリーン（両サイズとも解像度は 1280×720）向けのネイティブ Flutter タッチ UI。Compute Module 5 上で動作し、ボードから直接この同じサーバーを制御します。実際に動作する雛形で、全 6 のカタログ画面（ダッシュボード、手動制御、カメラ、簡易 3D ビュー、システム指標、ログイン）がすべて実際のサーバーに接続済みです。実際の Linux ターゲットビルドはまだ実機で実行されていません（今のところ Windows 専用の動作環境——同プロジェクト自身の README を参照）。

**URTC プラットフォーム** —— HYDRA-UMC の各ロボットアームが搭載するツールヘッドコントローラー
- **[URTC](https://github.com/JuanenRac/URTC)** —— 汎用ロボットツールコントローラー：STM32F303 ベースの CAN バスツールヘッドコントローラー、25 種の完全実装済みツールプロファイル、CAN-OTA ファームウェア更新に対応。
- **[URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)** —— URTC ボード向けのデスクトップ製 CAN-OTA + フルチップ SWD/JTAG 書き込みツール（Windows/Linux）。
- **[URTC Tester](https://github.com/JuanenRac/URTC-TESTER)** —— URTC ボード向けのデスクトップ製リアルタイム CAN バス診断ツール、ツールプロファイルごとに 1 つのパネル（Windows/Linux）。
- **[URTC Web Studio](https://github.com/JuanenRac/URTC-WEB-STUDIO)** —— 上記 2 つのデスクトップツールに代わるブラウザベースの選択肢（Web Serial API + SLCAN）、ローカルインストール不要。

**本ダッシュボードと直接関連** —— HYDRA-UMC STUDIO に直接接続するプロジェクト：
- **[HYDRA-UMC-DASHBOARD-AI](https://github.com/JuanenRac/HYDRA-UMC-DASHBOARD-AI)** —— この同じダッシュボードに AI 駆動のインサイトを追加拡張します。
- **[HYDRA-UMC-COGNITIVE-NODE](https://github.com/JuanenRac/HYDRA-UMC-COGNITIVE-NODE)** —— 本ダッシュボードに音声／自然言語制御を追加します。
- **[HYDRA-UMC-VOICE-UI](https://github.com/JuanenRac/HYDRA-UMC-VOICE-UI)** —— 本ダッシュボードに音声／自然言語制御を追加します。
- **[HYDRA-UMC-TWIN](https://github.com/JuanenRac/HYDRA-UMC-TWIN)** —— 実際のロボットに触れる前に、本ダッシュボードから直接デジタルツインでプレビューできるようにします。
- **[HYDRA-UMC-HIL-BRIDGE](https://github.com/JuanenRac/HYDRA-UMC-HIL-BRIDGE)** —— 実際のロボットに触れる前に、本ダッシュボードから直接デジタルツインでプレビューできるようにします。

これに加えて、同じ著者は本エコシステムにわたる多くの他のプロジェクトを維持しており、以下カテゴリ別にまとめます：

- **💠 コアエコシステム：** [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) · [HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER) · [HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) · [HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI) · [HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL) · [HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL) · [HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF) · [URTC](https://github.com/JuanenRac/URTC) · [URTC-FLASHER](https://github.com/JuanenRac/URTC-FLASHER) · [URTC-TESTER](https://github.com/JuanenRac/URTC-TESTER) · [URTC-WEB-STUDIO](https://github.com/JuanenRac/URTC-WEB-STUDIO)
- **👁️ ビジョン AI ノード（Hailo-8）：** [HYDRA-UMC-VISION-NODE](https://github.com/JuanenRac/HYDRA-UMC-VISION-NODE) · [HYDRA-UMC-VISION-STREAMER](https://github.com/JuanenRac/HYDRA-UMC-VISION-STREAMER) · [HYDRA-UMC-DETECTION-HEF](https://github.com/JuanenRac/HYDRA-UMC-DETECTION-HEF) · [HYDRA-UMC-SAFETY-ZONES](https://github.com/JuanenRac/HYDRA-UMC-SAFETY-ZONES) · [HYDRA-UMC-VISUAL-SERVOING-API](https://github.com/JuanenRac/HYDRA-UMC-VISUAL-SERVOING-API)
- **🧠 認知 AI ノード（Hailo-10）：** [HYDRA-UMC-VLA-ENGINE](https://github.com/JuanenRac/HYDRA-UMC-VLA-ENGINE) · [HYDRA-UMC-SEMANTIC-PLANNER](https://github.com/JuanenRac/HYDRA-UMC-SEMANTIC-PLANNER) · [HYDRA-UMC-DOCS-QA](https://github.com/JuanenRac/HYDRA-UMC-DOCS-QA)
- **🐝 オーケストレーションと群制御：** [HYDRA-UMC-ORCHESTRATOR](https://github.com/JuanenRac/HYDRA-UMC-ORCHESTRATOR) · [HYDRA-UMC-SWARM-SYNC](https://github.com/JuanenRac/HYDRA-UMC-SWARM-SYNC) · [HYDRA-UMC-PATH-PLANNER-3D](https://github.com/JuanenRac/HYDRA-UMC-PATH-PLANNER-3D) · [HYDRA-UMC-JOB-DISPATCHER](https://github.com/JuanenRac/HYDRA-UMC-JOB-DISPATCHER) · [HYDRA-UMC-NODE-HEALING](https://github.com/JuanenRac/HYDRA-UMC-NODE-HEALING)
- **🎮 デジタルツインとシミュレーション：** [HYDRA-UMC-PHYSICS-REPLICA](https://github.com/JuanenRac/HYDRA-UMC-PHYSICS-REPLICA) · [HYDRA-UMC-SYNTHETIC-DATA-GEN](https://github.com/JuanenRac/HYDRA-UMC-SYNTHETIC-DATA-GEN)
- **📊 データと分析：** [HYDRA-UMC-DATALAKE](https://github.com/JuanenRac/HYDRA-UMC-DATALAKE) · [HYDRA-UMC-TELEMETRY-COLLECTOR](https://github.com/JuanenRac/HYDRA-UMC-TELEMETRY-COLLECTOR) · [HYDRA-UMC-ANOMALY-DETECTOR](https://github.com/JuanenRac/HYDRA-UMC-ANOMALY-DETECTOR) · [HYDRA-UMC-PRODUCTION-REPORTS](https://github.com/JuanenRac/HYDRA-UMC-PRODUCTION-REPORTS)
- **🏭 産業用ゲートウェイ：** [HYDRA-UMC-GATEWAY-INDUSTRIAL](https://github.com/JuanenRac/HYDRA-UMC-GATEWAY-INDUSTRIAL) · [HYDRA-UMC-OPCUA-SERVER](https://github.com/JuanenRac/HYDRA-UMC-OPCUA-SERVER) · [HYDRA-UMC-MQTT-BROKER](https://github.com/JuanenRac/HYDRA-UMC-MQTT-BROKER) · [HYDRA-UMC-MTCONNECT-ADAPTER](https://github.com/JuanenRac/HYDRA-UMC-MTCONNECT-ADAPTER)
- **🛠️ 補完ツール：** [URTC-SMART-RACK](https://github.com/JuanenRac/URTC-SMART-RACK) · [URTC-VISION-TOOL](https://github.com/JuanenRac/URTC-VISION-TOOL) · [HYDRA-UMC-WATCH](https://github.com/JuanenRac/HYDRA-UMC-WATCH) · [HYDRA-UMC-TOOL-CLI](https://github.com/JuanenRac/HYDRA-UMC-TOOL-CLI)

全体として、この著者のエコシステムは本プロジェクトをはるかに超えて広がっています——上記は地図であり、網羅的な機能一覧ではありません。各リポジトリが今日実際に何を行っているかは、それぞれ自身の README を確認してください。

---

## 👤 作者

**JuanenRac**（Electro Hobby 3D）
📧 electrohobby3d@gmail.com
📺 youtube.com/@electrohobby3d

---

## 📜 ライセンスと著作権表示

HYDRA-UMC STUDIO の著作権は (c) 2026 JuanenRac（Electro Hobby 3D）に帰属します。本プロジェクトまたはその派生物を配布する際は、この表示を必ず含めてください。

本アプリケーションのソースコードは、**GNU General Public License v3.0（GPL-3.0）** の下で提供されます。全文は https://www.gnu.org/licenses/gpl-3.0.html を参照してください。

ドキュメント（本 README およびその自身の翻訳版——`README_spa.md`、`README_ita.md`、`README_fra.md`、`README_deu.md`、`README_zho.md`、`README_jpn.md`）は、**クリエイティブ・コモンズ 表示-継承 4.0 国際（CC BY-SA 4.0）** の下で提供されます。全文は https://creativecommons.org/licenses/by-sa/4.0/ を参照してください。

**サードパーティのロボットメッシュアセット：** `public/models/` 配下の実際の 3D ジオメトリは、上記の GPL-3.0 の対象では **ありません**——各ロボットモデル自身のメッシュファイルは、それぞれ別個にライセンスされたサードパーティのアセットであり、それぞれ独自の原本の条件のもとで本リポジトリで再配布されています：

| メーカー | モデル | ライセンス |
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
| Opulo | LumenPnP v4（JuanenPnP でも使用） | CERN-OHL-W v2 |

各モデル自身の正確な参照元リポジトリ、パス、ライセンス条文は、そのモデル自身の `public/models/<slug>/ATTRIBUTION.txt` に記載されています——特定のメッシュセットを再配布する前に、上記の表がその代わりになると想定せず、必ずそのファイルを確認してください。LumenPnP 自身の `ATTRIBUTION.txt` は全文を読む価値があります——上記の他のすべてのロボットアーム（メーカー自身が用意した既製の STL ファイルを、そのままダウンロードしたもの）とは異なり、その 5 つのメッシュファイルは Opulo の実際の FreeCAD ソースから社内で生成されたものであり、そのまま再配布されたものではありません。

本ダッシュボードは [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) マザーボードプロジェクトの Web 制御パネルです——その自身のハードウェア（CERN-OHL-S v2）およびファームウェア（GPL-3.0）のライセンスは同リポジトリを参照してください。本リポジトリ自身のライセンスはそちらには及ばず、その逆も同様です。また、[URTC](https://github.com/JuanenRac/URTC) プロトコルに対する CAN-OTA ツールも実装しています——その自身の独立したライセンスは同プロジェクト自身のリポジトリを参照してください。

本プロジェクトを基に開発を行う際は、このライセンス区分を念頭に置いてください：コードの変更は GPL-3.0 を維持し、ドキュメントの派生物は CC BY-SA を維持し、特定のロボットのメッシュアセットの再配布は、そのモデル自身の原本ライセンスを維持してください——いずれも本プロジェクトおよびその作者への帰属表示を伴う必要があります。
