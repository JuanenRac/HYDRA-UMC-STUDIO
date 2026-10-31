<!-- =============================================================================
HYDRA-UMC-STUDIO - Web control dashboard of the HYDRA-UMC multi-robot micro-factory
Copyright (C) JuanenRac (Electro Hobby 3D) <electrohobby3d@gmail.com>
GPL-3.0-or-later - see LICENSE
============================================================================= -->

<p align="center">
  <img src="images/HYDRA_UMC_BANNER.svg" alt="HYDRA-UMC-STUDIO banner" width="100%">
</p>

# 🤖 HYDRA-UMC-STUDIO

<p align="center"><a href="README.md">🇺🇸 English</a> | <a href="README_spa.md">🇪🇸 Español</a> | <a href="README_fra.md">🇫🇷 Français</a> | <a href="README_ita.md">🇮🇹 Italiano</a> | <a href="README_deu.md">🇩🇪 Deutsch</a> | <a href="README_zho.md">🇨🇳 简体中文</a> | <a href="README_jpn.md">🇯🇵 日本語</a> | 🇵🇹 <b>Português</b></p>

### 🤖 Painel de controlo web da microfábrica multirrobô HYDRA-UMC

<p align="center">
  <img src="https://img.shields.io/badge/License-GPL%203.0--or--later-blue.svg" alt="GPL 3.0 or later">
  <img src="https://img.shields.io/badge/Framework-React%2019-61DAFB.svg" alt="Framework">
  <img src="https://img.shields.io/badge/Tool-Vite-646CFF.svg" alt="Tool">
  <img src="https://img.shields.io/badge/3D-Three.js-black.svg" alt="3D">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6.svg" alt="Language">
  <img src="https://img.shields.io/badge/Tests-733%20passing-2ea44f.svg" alt="Tests">
  <img src="https://img.shields.io/badge/Version-0.8.0.5-0f6cbd.svg" alt="Version">
  <img src="https://img.shields.io/badge/Maturity-functional-0F6CBD.svg" alt="Maturity">
</p>

---

> **Estado de segurança (safety e security):** este ecossistema não é um sistema de segurança certificado. Ainda não existe um caminho de E-STOP por hardware, nem limites ou interlocks impostos pelo firmware, nem um comando de movimento verificado; as imagens de firmware são verificadas com CRC-32 e uma assinatura Ed25519, e uma compilação de versão recusa as chaves de desenvolvimento publicadas (as cabeças de ferramenta e as placas de expansão atrás do relé ainda usam os bootloaders do URTC, que aceitam um HMAC-SHA256 de chave partilhada em vez de uma assinatura); TLS e TLS mútuo são opcionais e estão desativados por defeito; nenhuma placa própria foi ainda montada ou testada. Leia a [base de segurança](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md) e o [modelo de ameaças](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md) antes de confiar em qualquer afirmação aqui para a segurança de uma pessoa.

---

## 📋 Num relance

| | |
|---|---|
| Versão | `0.8.0.5` |
| Maturidade | Funcional |
| Testes | 733 (`npm test`) |
| Tecnologia | React 19 / Vite / Three.js / Tailwind CSS |
| Destino | O Raspberry Pi CM5 de uma célula HYDRA-UMC |
| Em hardware real | Executado numa bancada de ensaio: a verificação de honestidade acima diz que partes correram em hardware real |

**Ir para:** [Visão geral](#-visão-geral) · [Arquitetura](#-arquitetura) · [Funcionalidades](#-funcionalidades) · [Segurança e proteção](#-segurança-e-proteção) · [Interfaces](#-interfaces) · [Configuração](#-configuração) · [Início rápido](#-início-rápido) · [Testes](#-testes) · [Resolução de problemas](#-resolução-de-problemas) · [Estrutura do repositório](#-estrutura-do-repositório) · [Projetos relacionados](#-projetos-relacionados)

## 🚦 Estado do projeto

Cada linha é uma parte deste repositório e a luz diz até onde chega hoje. É escrita com o que o repositório consegue demonstrar (testes, compilações, execuções), não com o que está previsto.

🟢 Feito e verificado · 🟡 Funciona, com limites conhecidos · 🟠 Feito a meio ou ainda por verificar · 🔴 Por fazer ou a não funcionar

| Área | Estado | O que significa aqui |
|---|---|---|
| Software | 🟡 | Funciona para o seu propósito principal; a verificação de honestidade acima lista o que ainda falta |
| Testes | 🟢 | 733 testes automáticos, executados a cada alteração |
| Hardware real | 🟡 | Executado numa bancada de ensaio: a verificação de honestidade acima diz que partes correram em hardware real |
| Documentação | 🟢 | README em oito idiomas, verificado contra o manifesto a cada alteração |

## 🎯 Visão geral

O **HYDRA-UMC STUDIO** é o painel de controlo, no navegador, do [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) - a placa-mãe da microfábrica multirrobô (anfitrião Raspberry Pi CM5 + coprocessador de tempo real STM32H745 de dois núcleos) que orquestra até 8 braços robóticos distribuídos num único barramento FDCAN. Enquanto o repositório do próprio HYDRA-UMC cobre o hardware e o firmware, este repositório é o lado voltado para as pessoas: uma aplicação React de página única que visualiza cada robô em 3D real, move e grava o seu movimento, gere as máquinas e os acessórios que acompanham uma célula de robôs, e flasha/testa toda a cadeia de firmware CAN-OTA - tudo a partir de um único separador do navegador, sem instalação nativa para além do Node.js.

**Nota de honestidade, de acordo com a convenção de documentação deste ecossistema:** o hardware real do próprio HYDRA-UMC ainda não existe como silício testado (os seus bootloaders compilam sem erros mas ainda não correram em placas reais - veja o `docs/architecture.md` desse repositório). Por isso, este painel executa as suas ferramentas CAN-OTA Flasher/Tester contra uma simulação integrada completa que segue o esquema de endereçamento real e documentado de cada nível, em vez de fingir que fala com hardware que não está lá. A visualização 3D dos robôs, a cinemática, a gravação de trajetórias e todos os painéis de controlo de acessórios são totalmente reais e independentes disso - por agora apenas o próprio transporte CAN-OTA é simulado.

Construído com **React 19**, **Vite**, **Three.js** (através de `@react-three/fiber`/`@react-three/drei`) e **TypeScript** - um cliente puro, sem código de back-end próprio. O estado persistente vive no back-end separado **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** com o qual esta app comunica pela rede.

## 🧩 Papel no HYDRA-UMC

O **HYDRA-UMC-STUDIO** é o painel web de controlo da célula: desenha cada robô em 3D com a sua cinemática real, move e grava trajetórias, opera os painéis de acessórios e máquinas, grava e testa firmware pela cadeia CAN-OTA e administra o servidor, em oito idiomas. Não guarda estado próprio e não decide nada de segurança: papéis, limites, reservas e a paragem são decididos pelo HYDRA-UMC-SERVER.

## 🏛️ Arquitetura

<p align="center">
  <img src="images/architecture.svg" alt="HYDRA-UMC-STUDIO architecture" width="100%">
</p>

## 🖼️ Capturas de ecrã

Capturadas a 1920×1080 numa bancada de testes, com dados de exemplo e sem qualquer instalação real por trás.

<table>
<tr><td width="50%" valign="top"><img src="images/screenshots/overview.png" alt="Resumo: os oito nós de robô da microfábrica com a função, o modelo e a ferramenta, e o estado da máquina na barra inferior." width="100%"><br><sub>Resumo: os oito nós de robô da microfábrica com a função, o modelo e a ferramenta, e o estado da máquina na barra inferior.</sub></td><td width="50%" valign="top"><img src="images/screenshots/robot-view.png" alt="Vista do robô: controlos das articulações, jog XYZ, o modelo 3D do braço e o painel de trajetórias com os pontos gravados." width="100%"><br><sub>Vista do robô: controlos das articulações, jog XYZ, o modelo 3D do braço e o painel de trajetórias com os pontos gravados.</sub></td></tr>
<tr><td width="50%" valign="top"><img src="images/screenshots/xy-table.png" alt="Mesa XY: o tamanho da mesa, os botões de jog com o seu passo e a vista 3D em direto dos eixos." width="100%"><br><sub>Mesa XY: o tamanho da mesa, os botões de jog com o seu passo e a vista 3D em direto dos eixos.</sub></td><td width="50%" valign="top"><img src="images/screenshots/flasher-studio.png" alt="Flasher Studio: escolha a placa e a ranhura do robô, escolha um ficheiro de firmware e grave-o por CAN; aqui em simulação, por isso nada é enviado a nenhuma placa." width="100%"><br><sub>Flasher Studio: escolha a placa e a ranhura do robô, escolha um ficheiro de firmware e grave-o por CAN; aqui em simulação, por isso nada é enviado a nenhuma placa.</sub></td></tr>
<tr><td width="50%" valign="top"><img src="images/screenshots/tester-center.png" alt="Tester Center: o LED de estado, a verificação de persistência, a telemetria da ferramenta, o autoteste e o monitor de barramento em bruto de uma placa." width="100%"><br><sub>Tester Center: o LED de estado, a verificação de persistência, a telemetria da ferramenta, o autoteste e o monitor de barramento em bruto de uma placa.</sub></td><td width="50%" valign="top"><img src="images/screenshots/safety-limits.png" alt="Limites de segurança: armação do jog, regra de reservas e os tetos de jog e de temperatura da cama por modelo de robô, guardados no servidor." width="100%"><br><sub>Limites de segurança: armação do jog, regra de reservas e os tetos de jog e de temperatura da cama por modelo de robô, guardados no servidor.</sub></td></tr>
</table>

## ✨ Funcionalidades

### Controlo 3D multirrobô

Gira vários robôs independentes de 6 GDL em simultâneo, cada um com o seu próprio modelo 3D real, cinemática e estado de jog/trajetória. O seletor de modelos (RobotDetail → separador Config) agrupa todos os robôs disponíveis por fabricante:

- 🏭 **Source Robotics** - Parol6, Faze4 (malhas com licença MIT e GPL-3.0 respetivamente, veja o `ATTRIBUTION.txt` de cada modelo)
- 🏭 **Annin Robotics** - AR3, AR4 (malhas com licença MIT)
- 🏭 **Universal Robots** - UR3e, UR5e, UR10e, UR16e, UR20 - geometria oficial, limites de articulação e cinemática dos elos obtidos diretamente do repositório [Universal_Robots_ROS2_Description](https://github.com/UniversalRobots/Universal_Robots_ROS2_Description) da própria Universal Robots (BSD-3-Clause), cobrindo a gama de cargas pequenas a pesadas da linha e-Series
- 🏭 **Universal Robots (clássicos)** - UR3, UR5, UR10 - a linha CB anterior à e-Series, geometria/parâmetros DH oficiais do repositório [universal_robot](https://github.com/ros-industrial/universal_robot) do ROS-Industrial (BSD-3-Clause)
- 🏭 **UFACTORY** - xArm6, Lite 6 (malhas BSD-3-Clause, geometria/cinemática oficial do [xarm_ros2](https://github.com/xArm-Developer/xarm_ros2))
- 🏭 **Comau** - e.DO (malhas BSD-3-Clause, geometria/cinemática oficial do [eDO_description](https://github.com/ianathompson/eDO_description))
- 🏭 **Kinova** - Gen3 Lite, Gen2 (malhas BSD-3-Clause, geometria/cinemática oficial do [ros2_kortex](https://github.com/Kinovarobotics/ros2_kortex))
- 🏭 **FANUC** - M-710iC (malhas BSD-3-Clause, geometria/cinemática oficial do [fanuc_m710ic_description](https://github.com/robot-descriptions/fanuc_m710ic_description))
- 🏭 **The Robot Studio** - SO-ARM100, um braço económico de 5 GDL (não 6) (malhas Apache-2.0, geometria/cinemática oficial do [SO-ARM100](https://github.com/TheRobotStudio/SO-ARM100))
- 🏭 **AgileX** - PiPER (malhas Apache-2.0, geometria/cinemática oficial do [agilex_piper_arm_description](https://github.com/renesas-rdk/agilex_piper_arm_description))
- 🏭 **Unitree** - Z1 (malhas BSD-3-Clause, através do [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie) da Google DeepMind - cada pasta de robô aí mantém a licença original do seu fabricante)
- 🏭 **Trossen Robotics** - ViperX 300, WidowX 250 (malhas BSD-3-Clause, geometria/cinemática oficial do [interbotix_ros_manipulators](https://github.com/Interbotix/interbotix_ros_manipulators))
- 🏭 **Koch / Low-Cost Robot Arm** - Koch v1.1, outro braço económico de 5 GDL (não 6) (malhas Apache-2.0, através do [mujoco_menagerie](https://github.com/google-deepmind/mujoco_menagerie))
- ⚙️ **Genérico** - um braço simplificado de dois elos para qualquer montagem sem modelo dedicado

São 24 modelos de robô reais de 13 fabricantes, mais o marcador Genérico - veja a tabela de licenças mais abaixo para o mapeamento exato modelo↔fabricante↔licença que esta lista resume. Cada modelo real (tudo exceto o Genérico) carrega a sua geometria de malha STL real por elo e move-a através da cadeia de transformações de articulação do próprio fabricante - não um marcador estilizado. A cinemática direta/inversa calcula-se contra a geometria real de cada robô (resolução de Newton-Raphson para a posição, limites reais por articulação quando o robô os define), pelo que uma trajetória gravada ou um alvo cartesiano movido por jog move o braço certo como o robô físico realmente o faria. Os 5 modelos e-Series da Universal Robots partilham ainda um único motor FK/IK (`src/examples/urKinematicsShared.ts`) e um único renderizador de rig 3D (`src/components/3d/URArm.tsx`), já que todas as articulações UR e-Series partilham exatamente a mesma estrutura cinemática - só mudam os comprimentos dos elos de modelo para modelo. Os 3 modelos UR clássicos (UR3/UR5/UR10) partilham o seu próprio motor e renderizador à parte (`src/examples/urClassicKinematics.ts`, `src/components/3d/UrClassicArm.tsx`), já que as articulações dessa geração mais antiga não partilham todas um eixo Z local comum como na e-Series.

Os controlos de jog de cada robô incluem um botão rotativo + deslizador para **velocidade** e **aceleração** em cada eixo, e uma leitura completa de fins de curso/estado junto a um cartão de estado em direto da "Placa controladora do robô" quando o CAN-OTA for ligado a hardware real. Cada botão/deslizador ajusta-se ao valor de **Passo** de jog escolhido na sua própria caixa de seleção (de 0,1° até 100°/mm) em vez de se mover de forma contínua. O robô **A1** é uma prova de conceito em curso de outra disposição: os seus controlos de Velocidade/Aceleração/J1-J6/jog XYZ vivem num painel flutuante arrastável por cima da própria vista 3D (`Joystick3D.tsx` para o bloco XYZ) em vez do painel por baixo que todos os outros robôs ainda usam - veja `src/components/robots/A1.tsx`.

### Etapa do Kinematic Brain

Um painel de controlo dedicado ao subsistema de movimento local da placa-mãe HYDRA-UMC - os eixos acionados diretamente pelo STM32H745, separados dos braços robóticos distribuídos no STACK A:

- 📐 Controlo de jog do **pórtico XY** para os eixos X, Y1, Y2 (pórtico de duplo Y) e Z
- 🔥 Controlo da **cama aquecida** (comutada por SSR, 230 VAC)
- 🔄 **Revólver ATC** - controlo de índice rotativo de ferramentas para o trocador automático de ferramentas acionado pelo E0
- 🎢 **Tapete rolante** - controlo de instalado/em execução/velocidade para a correia de transporte acionada pelo E1
- 🛑 Uma grelha completa de 12 fins de curso, 3 canais de ventoinha e 10 bombas/10 válvulas para a fluídica de processo

### Painéis de controlo de acessórios e máquinas

Painéis dedicados às máquinas e acessórios que acompanham uma célula de robôs: **Mesa XY**, **Ferramentas ATC**, **Gestor de racks**, **Pick & Place** (incluindo a configuração específica do JuanenPnP/LumenPnP), **CNC** (incluindo a configuração específica do JuanenCNC), **Laser** (incluindo a configuração específica do JuanenLaser), **Mesa de vácuo** e **Cama aquecida**.

---

### 🧩 Mesas de vácuo selecionáveis

Escolha um de seis modelos STL reais na Mesa de vácuo: 160 × 120, 230 × 210, 230 × 250, 232 × 217, 240 × 240 ou 250 × 250 mm. A espessura da base é de 15 mm; a altura total com as paredes de alinhamento é de 16,2 mm. A largura e o comprimento são editáveis em passos de 5 mm (10–5000 mm). A área é escalada; a espessura mantém-se. Selecionar uma predefinição repõe as dimensões originais. Os tamanhos personalizados sincronizam-se através do SERVER; os furos/canais escalados são uma disposição visual, não um STL de fabrico regenerado. A seleção preserva a posição, o estado da bomba e da válvula; repor seleciona 160 × 120 mm e desliga a bomba e a válvula. Os IDs de modelo antigos/desconhecidos mostram o primeiro modelo. O STUDIO e as duas interfaces da SUITE usam o mesmo catálogo e modelId nas definições do robô.

[Guia do modelo, configuração e regeneração](docs/VACUUM_TABLE_MODELS.md).

### 🔥 Modelo da cama aquecida

Quatro predefinições STL: 100×100, 200×100, 200×200 e 255×255 mm, todas com 5 mm de espessura. A largura/comprimento ajustam-se em passos de 5 mm (25–5000 mm); selecionar uma predefinição repõe as suas dimensões sem alterar o aquecimento. Apenas modelo visual, não um projeto elétrico nem de fabrico.

[Modelo da cama aquecida — STL / OpenSCAD](docs/HEATED_BED_MODELS.md).

### 🗄️ Racks STL configuráveis

Rack STL: largura e profundidade de 40–1000 mm em passos de 1 mm; 1–24 placas com passo fixo de 10 mm. As dimensões são definições visuais, não calibração do robô.

[Racks STL configuráveis — STL / OpenSCAD](docs/RACK_MODELS.md).

### 🛠️ Modelos de máquina independentes

Cópias STL independentes para JuanenPnP, JuanenCNC e JuanenLaser; a LumenPnP mantém-se original. Edite cada modelo na sua própria pasta. Usam-se as dimensões do CAD; as definições de tamanho antigas não esticam o modelo.

[Modelos de máquina independentes — STL](docs/MACHINE_ASSETS.md).

Estes recursos originais JuanenPNP / HYDRA-UMC e as suas fontes SCAD usam GPL-3.0; não são CAD de máquinas da Opulo.

### Trabalhos e trajetórias

Carregue trajetórias de exemplo prontas, mova e grave os seus próprios pontos em direto, ou carregue/guarde/edite/reproduza trajetórias complexas de vários pontos (JSON) por robô. As trajetórias são portáteis entre modelos de robô - cada ponto gravado é resolvido através da cinemática real desse robô (`src/examples/robotKinematicsDispatch.ts`) ao carregar/desenhar/reproduzir, e não fixado ao robô que por acaso o gravou, pelo que o mesmo ficheiro de trajetória move corretamente um Parol6 e um UR10e ao longo da sua própria geometria alcançável real.

### Ferramentas de firmware CAN-OTA

Flashe e teste firmware em toda a cadeia CAN-OTA HYDRA-UMC + URTC a partir de um só painel, com duas entradas dedicadas:

- **URTC → Flasher / Tester** - para a placa da cabeça de ferramenta URTC e as suas próprias placas de expansão (corresponde à cobertura de protocolo das ferramentas de ambiente de trabalho [URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)/[URTC Tester](https://github.com/JuanenRac/URTC-TESTER))
- **HYDRA-UMC → Flasher / Tester** - para os níveis da placa controladora do robô e do Kinematic Brain, retransmitidos de ponta a ponta de CM5 → SPI → STM32H745 → FDCAN1 → placa controladora do robô → CAN → cabeça de ferramenta URTC, sem sonda JTAG/SWD nem adaptador USB-CAN (veja o [`docs/architecture.md` do próprio HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC/blob/main/docs/architecture.md) para o desenho completo de endereçamento/relay)

Ambos podem descarregar versões de firmware reais diretamente do GitHub (com base em `firmware_manifest.json`, verificadas por CRC32) para o repositório `URTC` ou `HYDRA-UMC`. Como indicado acima, o transporte simula-se por defeito (o Flasher mostra um aviso SIMULAÇÃO, não envia nada às placas e nunca altera a versão guardada); mude-o para hardware em Config > CAN-OTA para flashar placas reais.

### Suporte de comando

Integração de comandos USB e Bluetooth com mapeamentos personalizados por botão/por eixo, para mover robôs e acessórios sem rato/teclado. As ações em tempo real (jog de articulações/mesa, E-STOP, INICIAR/PARAR, velocidade de reprodução) disparam o mesmo caminho atómico `sendRobotCommand()` que os botões de jog do painel de detalhe do robô usam, não a gravação adiada das definições - veja `GamepadController.tsx`.

### Integração de câmaras

Até 8 transmissões em direto simultâneas (visão USB ou sensores térmicos da família MLX90640/41/42) com gravação e estado de inferência - a matriz de câmaras em torno da qual se constrói o subsistema de hub USB 3.0 duplo do próprio HYDRA-UMC.

### Interface multilingue

Tradução completa da interface em **inglês, espanhol, alemão, francês, italiano, chinês simplificado, japonês e português** (`src/locales/`), incluindo o menu de Ajuda na app com os seus guias passo a passo, o assistente, a caixa Acerca de (versão/autor/licença) e cada separador da caixa de Configuração do sistema. A cobertura ainda não é de 100 % de cada ecrã: alguns painéis acessórios independentes continuam com o inglês fixo no código, ainda sem chegar ao trabalho de tradução.

### Ajuda, guias e assistente

A janela de Ajuda tem um separador de **Guias passo a passo**: um guia por tarefa (adicionar um controlador, mover um robô, gravar uma trajetória, usar as câmaras, flashar firmware, gerir utilizadores, acesso remoto, segurança...), cada um com um nível (básico, avançado, técnico), uma caixa de pesquisa e um botão que leva ao ecrã onde a tarefa se faz. O **Hydri**, o assistente, é uma pequena mascote animada que flutua sobre o painel: explica o ecrã em que está, guia-o numa tarefa passo a passo, responde a perguntas escritas com palavras sem servidor nem modelo de IA (em qualquer dos 8 idiomas), pode ler as respostas em voz alta com a voz do próprio navegador, pode ser arrastado para qualquer sítio e fixado aí, e liga-se ou desliga-se a partir da janela de Ajuda. As suas preferências ficam guardadas no navegador (`src/assistant/`).

### ℹ️ Acerca de e configuração do sistema

Duas caixas de diálogo independentes, ambas acessíveis a partir do cabeçalho (botões `Config`/`About`): o **Acerca de** mostra a versão da app em execução (lida em direto de `GET /api/hydra-info`), o autor e a licença; a **Config** cobre a identidade do servidor, a gestão de controladores/nós, o tema da interface + idioma, a mudança de nome dos robôs, o mapeamento câmara↔robô com deteção de conflitos, a biblioteca URDF personalizada, as integrações de software de terceiros (back-ends OpenPnP/CNC/Laser), o acesso remoto por cliente (interruptores independentes para SUITE/Android/iOS), as contas de utilizador, os diretórios de trabalho por robô, o transporte CAN-OTA e o mapeamento do comando - cada um no seu separador. Ambas são componentes próprios (`src/components/About.tsx`, `src/components/Config.tsx`), não embutidos na estrutura principal do painel.

### Fiabilidade

A app protege-se contra duas classes diferentes de falhas em execução, ambas nascidas de um incidente real de produção (um ecrã de quiosque a ficar preto após uma reimplantação). O `src/main.tsx` escuta o evento `vite:preloadError` do próprio Vite - emitido quando um separador do navegador deixado aberto durante uma reimplantação tenta obter um bloco de painel carregado por `React.lazy()` (cada painel de `Dashboard.tsx`, com hash de conteúdo em `vite.config.ts`) que já não existe com o hash antigo - e recarrega a página uma vez automaticamente, pelo que um separador de quiosque de longa duração ou um separador antigo em segundo plano se cura sozinho sem ninguém reparar. Uma guarda em `sessionStorage` impede que isso entre em ciclo infinito de recargas se um bloco faltar de facto por outro motivo. Em separado, o `src/components/ErrorBoundary.tsx` envolve a área de painéis `<Suspense>` como rede de segurança para qualquer outra falha de desenho; está associado ao separador ativo, pelo que ao sair de um painel que falhou se tenta de facto o seguinte em vez de deixar todo o painel preso num ecrã de recurso.
Os comandos nunca falham em silêncio: cada comando de jog, reprodução, alimentação, visão e ferramenta devolve um resultado tipado, uma sessão expirada é renovada uma vez e o comando é repetido, e tudo o que continuar recusado aparece num aviso. O botão vermelho **STOP** é global: um clique, sem confirmação, pára todos os robôs de todos os controladores e desliga todas as válvulas e bombas numa só chamada (`POST /api/stop-all`). Está no cabeçalho e no rodapé, no painel do robô e na sobreposição de controlo remoto, e Ctrl+Shift+Espaço prime-o a partir do teclado (uma combinação que não se escreve por acaso, ignorada com a tecla mantida). O resultado é listado robô a robô (aviso se um robô não parou ou o servidor não conseguiu guardar a paragem; os robôs reservados por outra conta ficam assinalados); uma falha de rede é repetida uma vez, um servidor acima do seu limite (429) ou sem a rota (404) é servido com a paragem por robô, e um aviso persistente «STOP não confirmado» permanece até um STOP posterior obter resposta. O jog com o joystick é um comando de homem morto (termina ao cancelar o ponteiro, perder o foco, ocultar o separador ou passados 8 segundos), um movimento de J1 fica no ângulo equivalente mais próximo e um passo de jog superior a 20 graus é recusado. O comando de jogo segue o robô selecionado na interface e tem a frequência limitada. O firmware de uma versão é verificado com o seu sha256 antes de ser gravado por CAN-OTA, as imagens de bootloader são opcionais e as trajetórias e cenas importadas são validadas antes de chegarem ao estado partilhado.

O servidor decide, para todos os clientes, quem pode mover um robô e até onde. Um robô pode ser **reservado** para a conta e a janela (um identificador de controlador escolhido por janela) que o pede: a mesma conta noutra janela, ou outra conta, é recusada com uma mensagem que diz qual é o caso (`other-controller`, `other-account`, `controller-id-required`), a lista de reservas vem de `GET /api/claims` e um administrador pode assumir um robô. O tamanho de um jog, o intervalo de um jog absoluto e a temperatura alvo máxima da cama são lidos de `GET /api/safety-limits` em vez de ficarem guardados na aplicação; um administrador edita-os por modelo em **Ecossistema > Limites de segurança**, juntamente com o armamento opcional do jog (desativado por predefinição; quando ativo, um botão arma o jog por um tempo limitado) e o identificador de controlador obrigatório. Cada robô tem um interruptor **Live / Sim** (Live por predefinição): em Sim, essa janela não envia nada que mova o robô ou ligue algo, enquanto o STOP passa sempre. Um Work ou exemplo com pontos que o braço não alcança é recusado com a lista desses pontos e pode, em alternativa, ser escalado ao alcance do modelo. A lista de reservas também é enviada pelo servidor pelo WebSocket (a mensagem `claims`, para as ligações que pediram `remoteApiVersion=2`), pelo que a barra de acesso mostra uma alteração logo, sem esperar pela próxima consulta; enquanto os envios chegam, a consulta só corre de vez em quando. As escritas são condicionais: cada uma leva a revisão do robô que esta janela viu pela última vez (`If-Match`); se outra pessoa mudou o robô entretanto, o servidor responde 412, o robô é lido de novo e o aviso di-lo (o modo Padrão verifica reservas, mesa e comandos pontuais; o Estrito verifica tudo exceto STOP; o Desligado não verifica nada; o STOP nunca é verificado). A mesa XY move-se com o comando atómico `table`, e os administradores leem o registo de auditoria só de acrescentar, com a cadeia SHA-256 verificada, em **Ecossistema > Registo de auditoria**.

### Contas e acesso

Cada back-end cria uma conta no seu primeiríssimo arranque - utilizador `admin`, palavra-passe `admin` - mude-a em **Config > Utilizadores** assim que o servidor for acessível para além de uma LAN totalmente fiável. Esse mesmo separador permite a uma conta de administrador criar contas adicionais de **operador**: um operador pode iniciar sessão, ver o estado em direto e comandar robôs (jog/reproduzir/pausa/parar/ferramenta/válvula/bomba/velocidade), mas não pode substituir as definições globais nem gerir outras contas. Não é preciso conta para espreitar - o "Continuar só de leitura" do próprio ecrã de início de sessão salta direto para o painel com as escritas desativadas. O contrato completo (funções, tokens, as rotas `/api/users`) está documentado nas secções 2a/2b do [`docs/REMOTE_API.md` do próprio HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md). Em produção o primeiro administrador vem das definições de arranque da implantação e o servidor recusa segredos de exemplo (veja o [`docs/PRODUCTION_BOOTSTRAP.md` do HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/PRODUCTION_BOOTSTRAP.md)).

Cada um dos 5 clientes remotos (SUITE, Android, iOS, Watch, DSI) identifica-se através do cabeçalho de pedido `X-Hydra-Client`, pelo que **Config > Acesso remoto** pode permitir ou bloquear cada um de forma independente em vez de um único interruptor combinado para os cinco.

O **Server Admin** tem um cartão de **início de sessão em dois passos** para a conta com que entrou (desativado até o seu dono o ativar): a palavra-passe, um código QR do endereço otpauth (desenhado na aplicação, sem pacotes adicionais) e a chave para escrever à mão, o primeiro código da aplicação de autenticação e dez códigos de recuperação de uso único mostrados uma vez. O formulário de início de sessão pede então o código de uma conta que o tenha ativado, e em **Config > Users** um administrador pode remover o segundo passo de uma conta que perdeu o telemóvel e os códigos de recuperação.

### Estado persistente

O próprio HYDRA-UMC STUDIO é um cliente puro - não guarda estado próprio para além do que está em memória na sessão atual. Toda a persistência (`settings.json`, `users.json`, trajetórias guardadas em `WORKS/`, modelos submetidos) vive no back-end separado **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** com o qual esta app comunica pela rede (veja o `data/` e o README desse projeto para o quadro completo) - o estado sobrevive a uma recarga da página ou à reimplantação desta app, já que nenhuma delas toca no processo do back-end. O próprio `settings.json` fica deliberadamente excluído do serviço de ficheiros estáticos desse back-end (contém IPs de controladores, a configuração CAN-OTA e o estado completo por robô), embora a sua pasta `WORKS/` seja servida normalmente.

O início de sessão dura enquanto o separador do navegador estiver aberto: a sessão e o respetivo token de renovação ficam em `sessionStorage`, pelo que fechar o separador termina-a. A opção de início de sessão **Manter sessão iniciada neste dispositivo** guarda-os antes em `localStorage`, e sobrevivem ao reinício do navegador (desativada por predefinição). A página de produção inclui uma Content-Security-Policy como etiqueta meta (scripts apenas da própria página, sem scripts em linha, sem plug-ins); `HYDRA_STUDIO_CSP=off` na compilação omite-a, para uma implementação que define o cabeçalho por si, e qualquer outro valor é usado como política.

O mesmo contrato `GET`/`POST /api/settings`, mais um ponto final de descoberta (`GET /api/hydra-info`) e um `WebSocket /ws` para atualizações em direto, é também a forma como os clientes externos se ligam a esse mesmo back-end - é isto que permite à [HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) descobrir uma instância do HYDRA-UMC SERVER em execução na rede, ler/modificar o seu estado e ver refletidas em direto as alterações feitas a partir do separador do navegador desta app (e vice-versa). Contrato completo no [`docs/REMOTE_API.md` do próprio HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md).

O `GET /api/system/metrics` alimenta o rodapé do painel Resumo: a carga da CPU e o uso de memória são sempre reais (módulo `os` do Node); a temperatura lê a saída real de `vcgencmd measure_temp` num Raspberry Pi verdadeiro e recorre a um valor simulado claramente assinalado nos outros casos (`temp_is_real` na resposta); o estado de Wi-Fi/Ethernet/Bluetooth é lido de `/sys/class/net`/`/sys/class/bluetooth` (só em Linux, `null`/desconhecido em qualquer outro anfitrião em vez de um valor adivinhado).

## 🔒 Segurança e proteção

| Ameaça | Defesa | Onde |
|---|---|---|
| Scripts injetados a correr na página | A compilação põe uma Content-Security-Policy na página: scripts só da própria página (mais WebAssembly e o anfitrião do descodificador 3D), sem objetos, base e formulários limitados à página; `HYDRA_STUDIO_CSP` pode desligá-la ou substituí-la | `scripts/csp.ts`, `vite.config.ts` |
| Um token de sessão lido de novo do armazenamento | Um início de sessão escrito aqui vive em `sessionStorage` (sobrevive a recarregar, não a fechar o separador); `localStorage` só se «manter sessão» estiver marcado. Um token que chega no endereço vai só para `sessionStorage`, chega no fragmento `#token=` que um navegador nunca envia, e é retirado do endereço assim que é lido | `src/lib/session.ts` |
| Dois operadores a alterar o mesmo robô | Cada robô tem uma revisão: uma escrita envia-a com `If-Match` e uma desatualizada é recusada com 412; a mesa move-se de forma atómica; reservas e quem pode mover são decididos pelo servidor para todos os clientes | `src/lib/revisions.ts`, `src/lib/tableMove.ts`, `src/lib/robotEdits.ts` |
| Uma paragem que espera por uma confirmação ou por um ecrã lento | O STOP vermelho é global e não pergunta nada: um `POST /api/stop-all` para todos os robôs e desliga todas as válvulas e bombas; se a rota estiver limitada ou não existir, recorre à paragem de cada robô, e um robô que não parou aparece num aviso | `src/lib/stopAll.ts`, `src/components/StopAll.tsx` |
| Uma opção de acesso baixada por engano (voz, MAVLink, Bluetooth, TLS...) | O Server Admin mostra de onde vem cada valor e bloqueia os que o ambiente do servidor define; baixar um pede confirmação e, depois de guardado, fica um aviso no ecrã: uma resposta de voz que repete o que foi dito, uma confiança do reconhecedor de 0, mensagens MAVLink sem assinatura ou a assinatura MAVLink desligada | `src/components/AdminServer.tsx`, `src/lib/serverSecurity.ts` |
| Um painel avariado ou uma página antiga depois de um novo deploy a deixar o ecrã preto | Cada separador fica no seu próprio limite de erros, e um fragmento antigo depois de um deploy provoca um recarregamento automático (protegido, para que um ficheiro realmente em falta não entre em ciclo) | `src/main.tsx`, `src/components/ErrorBoundary.tsx` |

**O que nunca faz:** decidir sobre segurança. Não guarda estado próprio e não é um caminho de paragem de emergência em hardware; a etapa do cérebro cinemático e as ferramentas CAN-OTA só correram contra a simulação integrada.

## 🔌 Interfaces

| Tópico ou rota | O que leva |
|---|---|
| `/api/login`, `/api/refresh`, `/api/logout` | iniciar sessão, renovar o token uma vez ao expirar e terminar sessão |
| `/api/settings`, `/api/robot/:id`, `/api/robot/:id/command` | a árvore de estado e os comandos tipados (mover, reproduzir, ferramenta, válvula, bomba, visão) com `If-Match` |
| `/api/robot/:id/claim`, `/release`, `/jog-arm`, `/api/claims` | reservar um robô para esta conta e janela, libertá-lo, armar o movimento, ver quem tem o quê |
| `/api/stop-all`, `/api/safety-limits` | a paragem global e os limites de segurança que o servidor impõe |
| `/ws` | envio em direto do estado (token como subprotocolo `hydra.bearer`, `remoteApiVersion=2`) |
| `/api/camera/*`, `/api/cameras/status` | fluxos de câmara, instantâneos, gravações, PTZ e o bilhete de imagem de curta duração |
| `/api/hardware/canota/version`, `/api/hardware/canota/flash` | a cadeia CAN-OTA usada pelo Flasher e pelo Tester (uma simulação completa até existirem placas reais) |
| `/api/admin/server-config`, `/api/admin/clients`, `/api/admin/logs`, `/api/audit` | Server Admin: os interruptores de acesso, as aplicações ligadas, o registo do servidor e o registo de auditoria (administradores) |

## ⚙️ Configuração

Dois tipos de definições: a compilação e o navegador desta aplicação, e os interruptores de acesso do servidor que o Server Admin edita (o ambiente do servidor prevalece sobre o guardado; o ecrã mostra qual vale e bloqueia os outros).

| Variável | Predefinição | O que define |
|---|---|---|
| `HYDRA_STUDIO_CSP` | `default` | ao compilar: `default`, `off` (sem política, para um anfitrião que define o cabeçalho) ou uma política completa própria |
| `VITE_API_BASE_URL` | o anfitrião desta página na porta 3000 | ao compilar: onde está o servidor quando não está no mesmo anfitrião (ver `.env.example`) |
| `server.proxy` (`vite.config.ts`) | `localhost:3000` | só no servidor de desenvolvimento: reencaminha `/api`, `/ws` e `/WORKS` para o servidor, sem configurar CORS |
| `aiAccess` | `open` | quem pode usar o reencaminhamento de IA local: `open` é qualquer conta com sessão iniciada, `admin` só administradores |
| `infoAuth` | desligado | pedir início de sessão para a informação só de leitura do equipamento (métricas, supervisor de processos, estado do ecossistema) |
| `tls.enabled` | desligado (HTTP simples) | HTTPS e WSS com o certificado e a chave indicados; o ecrã mostra a impressão digital do certificado em uso |
| `ble.mode` | `off` | Bluetooth LE para telemóveis perto do servidor: `off`, `state` (só publica o estado) ou `commands` (também aceita comandos); uma palavra desconhecida significa desligado |
| `ble.requireEncryption` | ligado | a característica de comandos só é escrita, e o estado só é lido, numa ligação cifrada; só `off` na variável o desliga |
| `mqtt.mode` | `off` | a ponte MQTT para o broker da célula: `off`, `state` ou `commands`, com o seu URL, prefixo e utilizadores |
| `voice.includeHeardText` | desligado | uma resposta de voz repete o que foi dito; são dados pessoais, por isso está desligado, e na variável só a palavra exata `1` o liga |
| `voice.minConfidence` | `0.6` | a confiança mínima do reconhecedor de voz, de 0 a 1, para aceitar um pedido que inicia um movimento; 0 desliga a verificação, uma paragem nunca fica retida, e um número errado na variável é ignorado |
| `mavlink.signingKeyFile` | vazio (sem assinatura) | assinatura MAVLink 2 da ponte UAV: o caminho de um ficheiro com a chave de 32 bytes (32 bytes em bruto ou 64 caracteres hexadecimais); só o caminho é guardado, nunca a chave, e a ponte lê-o ao arrancar |
| `mavlink.signingAllowUnsigned` | desligado | continuar a aceitar mensagens sem assinatura (um veículo que ainda não assina); o ecrã avisa enquanto estiver ligado |

## 🚀 Início rápido

Requer Node.js 22 ou superior com npm, e um HYDRA-UMC-SERVER a correr (porta 3000): o STUDIO é um cliente puro e sem ele não tem com quem falar.

```bash
npm install
./dev.sh                           # Vite dev server on port 5173, proxying /api, /ws and /WORKS to the server on port 3000 (dev.bat on Windows)
npm test                           # the Vitest suite
npm run typecheck && npm run lint  # types and lint
./build.sh                         # production build into dist/ (build.bat on Windows)
```

## 🧪 Testes

733 testes automáticos correm com `npm test`. Não precisam de hardware nem de nada fora desta máquina.

A CI executa `HYDRA_UMC_CI=1 python tools/ci_validate.py`, que verifica o manifesto, os documentos, os oito README e as imagens.

## 🏗️ Compilação e publicação

### Requisitos
- [Node.js](https://nodejs.org/) (v22 ou superior)
- npm
- Um back-end **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** em execução (`npm run dev` lá também, porta por defeito `3000`) - esta app é um cliente puro e não tem com quem comunicar sem ele.

### Instalação

```bash
npm install
```

### Modo de desenvolvimento

Executa o servidor de desenvolvimento do próprio Vite (`vite` simples, porta `5173`) com recarga automática. O `server.proxy` de `vite.config.ts` reencaminha de forma transparente `/api`, `/ws` e `/WORKS` para `http://localhost:3000`, pelo que as chamadas fetch/WebSocket de caminho relativo da app chegam ao back-end HYDRA-UMC SERVER sem qualquer configuração de CORS - basta garantir que esse back-end está a correr primeiro:
- **Windows:** faça duplo clique em `dev.bat` ou execute `npm run dev`
- **Linux/Mac:** execute `./dev.sh` ou `npm run dev`

### Testes automatizados

```bash
npm test          # vitest run - testes reais sobre src/examples/, o assistente e as traduções
npm run typecheck # tsc -b --noEmit (src/) + tsc -p tsconfig.test.json --noEmit (tests/)
```

Encontrado ao auditar o código: `src/examples/` (a matemática FK/IK de cada um dos 24 modelos de robô reais para os quais `robotKinematicsDispatch.ts` despacha - a fórmula genérica de braço partilhada de `utils.ts`, o motor real de cadeia DH + Newton-Raphson de `urKinematicsShared.ts` partilhado por todos os modelos da família UR, a cadeia real fixa de `parol6Kinematics.ts` e os 23 ficheiros `*Kinematics.ts` por robô) não tinha qualquer cobertura de testes automáticos. Corrigido: `tests/` (novo, Vitest) - a maioria dos testes é uma suite genérica parametrizada sobre a própria tabela de despacho de `robotKinematicsDispatch.ts` em vez de 23 ficheiros à medida quase duplicados, pelo que um robô novo acrescentado a essa tabela fica coberto automaticamente. Em separado: o `npm run typecheck` também era, durante todo esse tempo, um no-op silencioso - o `tsc --noEmit` sozinho contra o `tsconfig.json` raiz em estilo de solução deste repositório (`"files": []`, só `"references"` de projetos) não verifica nada; a correção real exige o modo de construção de projeto (`tsc -b --noEmit`), que de imediato fez surgir 8 erros de tipos reais e já existentes (agora corrigidos) que se vinham acumulando em silêncio, já que a transpilação esbuild/SWC do `vite build` nunca verifica tipos. Veja o [`CHANGELOG.md`](CHANGELOG.md) para o detalhe completo.

### Compilação de produção

Compila para uma versão estática otimizada (`vite build` simples - sem empacotamento de servidor, esta app já não tem código de back-end):
- **Windows:** faça duplo clique em `build.bat` ou execute `npm run build`
- **Linux/Mac:** execute `./build.sh` ou `npm run build`

Pré-visualize localmente a versão de produção com:
```bash
npm run preview
```

Implante a pasta `dist/` resultante em qualquer alojamento estático. Por defeito, a app compilada procura o seu back-end no mesmo nome de anfitrião da própria página, na porta `3000` (corresponde à implantação comum "tudo no CM5"); defina `VITE_API_BASE_URL` em tempo de compilação (veja `.env.example`) para a apontar a uma instância do HYDRA-UMC SERVER alojada noutro lado. Todo o estado e dados reais persistem no diretório `data/` desse back-end, não neste repositório.

### Versionamento

O `bump_manifest_version.py` (raiz do repositório) é o único dono tanto de `hydra-umc.project.json` como do campo `version` do `package.json` - o `npm run build` (`vite build`) é deliberadamente só de compilação, para nunca criar divergência entre eles ao subir um e não o outro. O `scripts/bump-version.mjs` é um auxiliar legado só nativo mantido como referência; nada neste repositório o chama já. A versão em execução é visível em direto na caixa **Acerca de** (a versão do Studio é lida do `package.json` da própria app; a versão do servidor mostrada ao lado vem de `GET /api/hydra-info`), e o histórico completo está em [`CHANGELOG.md`](CHANGELOG.md).

## 🩺 Resolução de problemas

| Vê | Porque | Faça |
|---|---|---|
| O início de sessão falha, ou cada chamada diz que o servidor não é alcançável | O servidor não está a correr, ou a página procura-o no anfitrião errado | Arranque o HYDRA-UMC-SERVER (porta 3000 em desenvolvimento) ou compile com `VITE_API_BASE_URL` |
| Um movimento ou comando é recusado porque outra conta ou janela tem o robô | O servidor reserva um robô para a conta e a janela que o pediram primeiro; o movimento também tem de ser armado | Liberte-o na barra de acesso do robô, ou espere; um administrador pode ver quem o tem |
| Uma gravação é recusada com 412 | Outro cliente alterou o robô depois de o carregar, por isso a sua revisão está desatualizada | Recarregue o robô e repita a alteração |
| Um interruptor do Server Admin está a cinzento | O valor vem do ambiente do servidor, que prevalece sobre o guardado | Altere a variável do servidor e reinicie-o; o ecrã indica a origem de cada valor |
| A página fica em branco depois de o servidor ser reimplantado | O separador aberto ainda aponta para fragmentos que já não existem | A página recarrega-se uma vez sozinha; se continuar em branco, recarregue à mão e recompile se um ficheiro estiver mesmo em falta |

## 📂 Estrutura do repositório

<p align="center">
  <img src="images/repository-structure.svg" alt="Repository structure of HYDRA-UMC-STUDIO" width="100%">
</p>

<details>
<summary>Versão em texto da árvore</summary>

```text
HYDRA-UMC-STUDIO/
├── src/                             código-fonte
│   ├── App.tsx                      O encaminhador e a disposição, o ponto de entrada e o fornecedor do estado global
│   ├── Dashboard.tsx                Estrutura principal da app - navegação, painel Resumo, métricas do sistema no rodapé
│   ├── store.ts                     Estado global: RobotModel/RobotState/HydraController/SystemSettings -
│   ├── motionSource.ts              O que a pose desenhada representa (comandada ou seguida pela máquina) e o núcleo puro de transição de estado de sendRobotCommand()
│   ├── i18n.ts                      Configuração do react-i18next - carrega src/locales/*.json
│   ├── hooks/                       usePartColors.ts: cores por peça guardadas pelo HYDRA-UMC-EDITOR-STL
│   ├── assets/                      O ícone, o ecrã de arranque e as imagens da app, e os estilos globais
│   ├── assistant/                   Hydri, o assistente: motor de respostas, base de conhecimento (8 idiomas), mascote, preferências
│   ├── components/                  os ecrãs e painéis: detalhe do robô, cena 3D, administração, ferramentas CAN-OTA
│   ├── examples/                    cinemática direta e inversa dos 24 modelos reais de robô
│   ├── lib/canOta.ts                Camada de simulação/protocolo CAN-OTA, descarga de firmware do GitHub
│   ├── lib/apiBase.ts               Resolução do URL do back-end - relativo+proxy em dev, VITE_API_BASE_URL em prod
│   ├── lib/mediaTicket.ts           Tickets de vida curta para as imagens das câmaras
│   ├── lib/claims.ts                Reservas, identificador de controlador, limites de segurança lidos do servidor, modo Live/Sim
│   ├── lib/revisions.ts             Revisão de cada robô (If-Match, 412), movimento atómico da mesa, registo de auditoria e verificação da sua cadeia
│   ├── lib/session.ts               Tokens de sessão, opções de acesso do servidor, textos de erro para o operador, quem pode guardar as definições, SHA-256 sem crypto.subtle
│   ├── lib/stopAll.ts               O STOP global, a resposta a um comando de robô, as edições de um robô como comandos, o robô selecionado, a numeração dos passos de reprodução, o aviso de trajetórias inalcançáveis, onde a ferramenta fica no flange, ângulos pelo caminho mais curto
│   ├── lib/claimsFeed.ts            A lista em direto das reservas, verificações antes de importar um ficheiro, limitação da entrada mantida, repetição de um botão de jog mantido, regras de teclado dos diálogos, o analisador das gravações MJPEG, o catálogo de modelos submetidos pelos editores
│   └── locales/                     Ficheiros de tradução en/es/de/fr/it/ja/zh/pt (react-i18next)
├── docs/                            guias dos modelos de mesa de vácuo, cama aquecida, rack e máquinas
├── public/                          modelos 3D: robôs, racks, camas aquecidas, mesas de vácuo, máquinas (STL e OpenSCAD)
├── images/                          Faixa do README
├── tests/                           Suite Vitest real - matemática FK/IK de src/examples/, o assistente, as traduções, sem React/DOM
├── tools/                           ferramentas do projeto e verificações da CI
├── scripts/                         bump-version.mjs (subida de versão explícita) e csp.ts (a política de segurança de conteúdo da página compilada)
├── .github/                         fluxo de CI e modelos de problemas
├── index.html                       A página a partir da qual o Vite constrói a app (a política de segurança de conteúdo é inserida na compilação)
├── example_trajectory.json          Trajetória de exemplo independente (sequência de ângulos de articulação, dados de exemplo)
├── metadata.json                    Nome/descrição da app (usado pela plataforma de alojamento)
├── bump_manifest_version.py         Sincroniza a versão de hydra-umc.project.json com a nativa (--sync)
├── build.sh / build.bat             Instala dependências + compilação de produção
├── build-test.sh / build-test.bat   Verificação de compilação sem versão
├── dev.sh / dev.bat                 Instala dependências + inicia o servidor de desenvolvimento do Vite
├── vitest.config.ts                 Configuração do Vitest (só tests/, ambiente node real - sem DOM)
├── tsconfig.test.json               Projeto de verificação de tipos independente para tests/ (separado das referências app/node)
├── .env.example                     Modelo de VITE_API_BASE_URL - veja src/lib/apiBase.ts
├── CHANGELOG.md                     o que mudou em cada versão
├── hydra-umc.project.json           manifesto: versão, maturidade, família
├── package.json                     metadados e scripts do pacote
├── mesh_pack.config.json            De onde vêm os modelos 3D: local (predefinição), auto ou download, com o endereço do pacote
├── meshes.pack.json                 Tamanhos e SHA-256 do pacote de malhas e de cada malha que contém
└── test.sh                          executa os testes
```

</details>

## 🗺️ Roteiro e limites conhecidos

**Limites conhecidos hoje**

* A cadeia CAN-OTA (Flasher e Tester) e a etapa do cérebro cinemático só correram contra a simulação integrada: ainda não existe nenhuma placa controladora HYDRA-UMC para gravar ou testar.
* Os tamanhos de mesa, cama aquecida e rack são definições visuais, não uma calibração do robô nem um projeto elétrico ou de fabrico.
* A PARAGEM passa pelo servidor; não há paragem de emergência sem fios nem um caminho de paragem em hardware.
* Tudo o que move um robô é decidido pelo servidor (papéis, limites, reservas); esta aplicação não consegue tornar um movimento seguro por si só.

**A seguir:** cada novidade desta aplicação é portada para o HYDRA-UMC-SUITE, e as ferramentas CAN-OTA esperam pelas primeiras placas reais.

## 🌍 Idiomas

Este README e os documentos do repositório existem em oito idiomas: inglês, espanhol, alemão, francês, italiano, japonês, chinês e português (Portugal). São escritos em conjunto e a CI verifica que os oito ficheiros têm as mesmas secções e as mesmas ligações.

## 🔗 Projetos relacionados

Este projeto faz parte do ecossistema de robótica HYDRA-UMC do mesmo autor (JuanenRac / Electro Hobby 3D). Vale a pena conhecê-los, porque um pedido pode ser, na verdade, sobre um destes e não sobre este repositório.

**Projeto-mãe**
- **[HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** — o back-end headless real (REST/WebSocket) com que todos os clientes de controlo realmente comunicam; este painel é um cliente puramente frontend dele, sem código de back-end próprio.

**Projetos irmãos** — também falam com a API do próprio HYDRA-UMC-SERVER, cada um como cliente próprio
- **[HYDRA-UMC-SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE)** — centro de comando de enxame para desktop (PySide6) para vários servidores ao mesmo tempo, empacotado como executável independente.
- **[HYDRA-UMC-ANDROID-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-ANDROID-CONTROL)** — aplicação Android nativa de controlo, com início de sessão biométrico e um companheiro Wear OS emparelhado.
- **[HYDRA-UMC-IOS-CONTROL](https://github.com/JuanenRac/HYDRA-UMC-IOS-CONTROL)** — aplicação de controlo para iOS/iPadOS (Flutter) com sincronização WebSocket em tempo real.
- **[HYDRA-UMC-DSI](https://github.com/JuanenRac/HYDRA-UMC-DSI)** — interface tátil nativa para o ecrã tátil DSI de 7" integrado, executada no próprio CM5.
- **[HYDRA-UMC-BRIDGE-AMR](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-AMR)** — fronteira de coordenação para frotas AGV/AMR através de um publicador MQTT VDA 5050 (testado apenas contra uma frota emulada).
- **[HYDRA-UMC-BRIDGE-CNC](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-CNC)** — coordenador de células CNC de alto nível com acesso ao estado GRBL e aos bytes de controlo (testado apenas contra um emulador).
- **[HYDRA-UMC-BRIDGE-DROIDS](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-DROIDS)** — fronteira de coordenação para droides com patas/humanoides, com um emissor de comandos para o Boston Dynamics Spot (testado apenas contra um emulador).
- **[HYDRA-UMC-BRIDGE-LASER](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-LASER)** — coordenador de células laser que lê 3 sinais GPIO (chave, caixa e interlock) (testado apenas contra um chip simulado; não pode armar nem disparar um laser).
- **[HYDRA-UMC-BRIDGE-OPENPNP](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-OPENPNP)** — coordenador seguro de fluxo de placa de alto nível para pick-and-place com OpenPnP.
- **[HYDRA-UMC-BRIDGE-PRINTER3D](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-PRINTER3D)** — fronteira de coordenação segura para impressoras 3D Moonraker/Klipper, com comandos de trabalho reais protegidos por portas.
- **[HYDRA-UMC-BRIDGE-ROS2](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-ROS2)** — coordenador com um transporte ROS 2 baseado em rclpy importado sob demanda (ainda não executado contra uma instalação ROS 2).
- **[HYDRA-UMC-BRIDGE-UAV](https://github.com/JuanenRac/HYDRA-UMC-BRIDGE-UAV)** — fronteira de coordenação para UAV com câmara, com um emissor de comandos MAVLink (testado apenas contra um emulador).

**Projetos filhos**
- **[HYDRA-UMC-EDITOR-URDF](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-URDF)** — criador/editor gráfico de URDF para desktop que envia os modelos terminados para o catálogo deste painel através de `POST /api/models/submit`.
- **[HYDRA-UMC-EDITOR-STL](https://github.com/JuanenRac/HYDRA-UMC-EDITOR-STL)** — editor de modelos STL para desktop da biblioteca `public/models/` deste painel (e do espelho dela na HYDRA-UMC-SUITE) - transforma/substitui/remove/acrescenta peças reais, sem nunca apagar nada de forma permanente.

**Diretamente relacionados**
- **[HYDRA-UMC-DASHBOARD-AI](https://github.com/JuanenRac/HYDRA-UMC-DASHBOARD-AI)** — painéis de Resumos inteligentes e Realce de anomalias sobre o DATALAKE/ANOMALY-DETECTOR, com um recurso estatístico honesto; alarga este mesmo painel com resumos estatísticos (ainda sem modelo de linguagem).
- **[HYDRA-UMC-COGNITIVE-NODE](https://github.com/JuanenRac/HYDRA-UMC-COGNITIVE-NODE)** — hub de integração para o pipeline cognitivo Hailo-10 (orquestração de LLM/VLA/voz); acrescenta controlo por voz/linguagem natural a este painel.
- **[HYDRA-UMC-VOICE-UI](https://github.com/JuanenRac/HYDRA-UMC-VOICE-UI)** — front-end de voz real (VAD + analisador de intenções) com um relay Watch limitado e protegido por confirmação; acrescenta controlo por voz/linguagem natural a este painel.
- **[HYDRA-UMC-LOCAL-TECHNICIAN](https://github.com/JuanenRac/HYDRA-UMC-LOCAL-TECHNICIAN)** — técnico de manutenção de IA local, protegido por políticas, para o próprio ecossistema: observa, diagnostica e propõe correções; os dois níveis de maior risco não estão implementados de propósito.
- **[HYDRA-UMC-TWIN](https://github.com/JuanenRac/HYDRA-UMC-TWIN)** — hub de integração para o motor de gémeo digital, com um contrato real de sincronização de compatibilidade de versões; permite pré-visualizar no gémeo digital antes de tocar no robô real, a partir deste painel.
- **[HYDRA-UMC-HIL-BRIDGE](https://github.com/JuanenRac/HYDRA-UMC-HIL-BRIDGE)** — encaminhador hardware-in-the-loop com um interlock de software de colisão entre a simulação e o hardware real (testado sem hardware real); permite pré-visualizar no gémeo digital antes de tocar no robô real, a partir deste painel.

**Também fazem parte do ecossistema**

*Hardware e plataforma centrais*
- **[HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC)** — o desenho da placa-mãe do braço robótico: anfitrião CM5 + STM32H745 de dois núcleos, pensado para orquestrar até 8 braços de ferramenta por CAN-OTA/SPI-OTA (firmware numa fase inicial; ainda sem placa montada).
- **[HYDRA-UMC-OS](https://github.com/JuanenRac/HYDRA-UMC-OS)** — camada de produto reproduzível do Raspberry Pi OS para o CM5: agente só de leitura, configuração/perfis validados, aprovisionamento Wi-Fi de primeiro contacto.
- **[HYDRA-UMC-SDK](https://github.com/JuanenRac/HYDRA-UMC-SDK)** — o contrato JSON-Schema partilhado e a fronteira de software de controlo de trabalhos contra a qual cada bridge valida os seus comandos (não é uma função de segurança certificada).
- **[HYDRA-UMC-CONNECTOR-HUB](https://github.com/JuanenRac/HYDRA-UMC-CONNECTOR-HUB)** — registo declarativo de manifestos de adaptador e validador para conectores de máquinas externas; estende a ideia de contrato do SDK a máquinas externas sem substituir os projetos de gateway industrial.

*Plataforma de ferramentas URTC*
- **[URTC](https://github.com/JuanenRac/URTC)** — firmware da placa física Universal Robot Tool Controller, mais de 25 perfis de ferramenta por barramento CAN.
- **[URTC-FLASHER](https://github.com/JuanenRac/URTC-FLASHER)** — ferramenta gráfica de gravação para desktop das placas URTC, por CAN-OTA e também SWD/JTAG de chip completo.
- **[URTC-TESTER](https://github.com/JuanenRac/URTC-TESTER)** — ferramenta de diagnóstico CAN em tempo real para desktop das placas URTC, com um painel por perfil de ferramenta.
- **[URTC-WEB-STUDIO](https://github.com/JuanenRac/URTC-WEB-STUDIO)** — alternativa no navegador ao URTC-TESTER através da Web Serial API, sem instalação local.
- **[URTC-GATEWAY](https://github.com/JuanenRac/URTC-GATEWAY)** — gateway à frente do barramento CAN do URTC: lista de identificadores permitidos, limite de taxa e chave de sessão; software testado num computador, ainda não num barramento real.

*Nó de IA de visão (Hailo-8)*
- **[HYDRA-UMC-VISION-NODE](https://github.com/JuanenRac/HYDRA-UMC-VISION-NODE)** — centro de integração do pipeline de visão Hailo-8, com uma verificação real de prontidão de hardware por fase.
- **[HYDRA-UMC-DETECTION-HEF](https://github.com/JuanenRac/HYDRA-UMC-DETECTION-HEF)** — registo real de modelos compilados com verificação segura de carga por arquitetura Hailo e soma de verificação.
- **[HYDRA-UMC-VISION-STREAMER](https://github.com/JuanenRac/HYDRA-UMC-VISION-STREAMER)** — pipeline GStreamer real e gerador de configuração MediaMTX com uma fronteira de integração HailoRT real.
- **[HYDRA-UMC-VISUAL-SERVOING-API](https://github.com/JuanenRac/HYDRA-UMC-VISUAL-SERVOING-API)** — lei de correção de servovisão baseada em posição com autorização condicionada ao estado da zona; ainda sem estimativa de pose por câmara.
- **[HYDRA-UMC-SAFETY-ZONES](https://github.com/JuanenRac/HYDRA-UMC-SAFETY-ZONES)** — lógica v0 de violação de zonas, atualidade da calibração e pedido de E-STOP que lê as posições dos objetos de um ficheiro; nenhum detetor a alimenta e ainda não há E-STOP físico ligado.

*Nó de IA cognitiva (Hailo-10)*
- **[HYDRA-UMC-VLA-ENGINE](https://github.com/JuanenRac/HYDRA-UMC-VLA-ENGINE)** — codificação/descodificação real de tokens de ação e geração de trajetórias para um modelo Visão-Linguagem-Ação.
- **[HYDRA-UMC-SEMANTIC-PLANNER](https://github.com/JuanenRac/HYDRA-UMC-SEMANTIC-PLANNER)** — decomposição real de tarefas baseada em regras e recuperação semântica de erros sobre os códigos de erro do MCU.
- **[HYDRA-UMC-DOCS-QA](https://github.com/JuanenRac/HYDRA-UMC-DOCS-QA)** — pesquisa real de documentos TF-IDF só com a biblioteca padrão sobre a documentação Markdown deste ecossistema.

*Orquestração e enxame*
- **[HYDRA-UMC-ORCHESTRATOR](https://github.com/JuanenRac/HYDRA-UMC-ORCHESTRATOR)** — centro de integração com um contrato real de relatório de saúde gRPC/Protobuf e uma máquina de estados de missões.
- **[HYDRA-UMC-JOB-DISPATCHER](https://github.com/JuanenRac/HYDRA-UMC-JOB-DISPATCHER)** — fila real de trabalhos por prioridade com deduplicação, sobre uma API HTTP real.
- **[HYDRA-UMC-NODE-HEALING](https://github.com/JuanenRac/HYDRA-UMC-NODE-HEALING)** — vigilante real de saúde da frota por gRPC com repetição/recuo e deteção de identidade incoerente.
- **[HYDRA-UMC-PATH-PLANNER-3D](https://github.com/JuanenRac/HYDRA-UMC-PATH-PLANNER-3D)** — planeador real de trajetórias 3D baseado em RRT com validação real de colisões com obstáculos e espaço de trabalho.
- **[HYDRA-UMC-SWARM-SYNC](https://github.com/JuanenRac/HYDRA-UMC-SWARM-SYNC)** — sincronização real de estado CRDT LWW-Element-Map, testada por propriedades para a convergência de várias células.

*Gémeo digital e simulação*
- **[HYDRA-UMC-PHYSICS-REPLICA](https://github.com/JuanenRac/HYDRA-UMC-PHYSICS-REPLICA)** — cinemática direta real e validação de limites de juntas sobre um subconjunto real de URDF.
- **[HYDRA-UMC-SYNTHETIC-DATA-GEN](https://github.com/JuanenRac/HYDRA-UMC-SYNTHETIC-DATA-GEN)** — gerador procedural real de cenas 2D com exportação de anotações YOLO/COCO.

*Dados e análise*
- **[HYDRA-UMC-DATALAKE](https://github.com/JuanenRac/HYDRA-UMC-DATALAKE)** — armazém real de séries temporais sobre sqlite3 com uma API HTTP real de ingestão/consulta.
- **[HYDRA-UMC-ANOMALY-DETECTOR](https://github.com/JuanenRac/HYDRA-UMC-ANOMALY-DETECTOR)** — detetor real de anomalias por FFT e linha de base estatística, com monitorização de deriva.
- **[HYDRA-UMC-PRODUCTION-REPORTS](https://github.com/JuanenRac/HYDRA-UMC-PRODUCTION-REPORTS)** — cálculo real de OEE/disponibilidade sobre o histórico do DATALAKE, com exportação CSV reprodutível.
- **[HYDRA-UMC-TELEMETRY-COLLECTOR](https://github.com/JuanenRac/HYDRA-UMC-TELEMETRY-COLLECTOR)** — pipeline real de ingestão CAN/WebSocket para o DATALAKE, com deduplicação por sequência.

*Gateway industrial*
- **[HYDRA-UMC-GATEWAY-INDUSTRIAL](https://github.com/JuanenRac/HYDRA-UMC-GATEWAY-INDUSTRIAL)** — centro de integração que retransmite para protocolos industriais, com uma camada real de lista de comandos permitidos e contrapressão.
- **[HYDRA-UMC-OPCUA-SERVER](https://github.com/JuanenRac/HYDRA-UMC-OPCUA-SERVER)** — espaço de endereços OPC-UA real, verificado com uma sessão de cliente real do protocolo binário.
- **[HYDRA-UMC-MQTT-BROKER](https://github.com/JuanenRac/HYDRA-UMC-MQTT-BROKER)** — broker MQTT real com autenticação opcional por cliente e ACL de tópicos.
- **[HYDRA-UMC-MTCONNECT-ADAPTER](https://github.com/JuanenRac/HYDRA-UMC-MTCONNECT-ADAPTER)** — endpoints XML MTConnect `/probe` e `/current` reais com saída em modo degradado.

*Ferramentas complementares e operações do ecossistema*
- **[HYDRA-UMC-TOOL-CLI](https://github.com/JuanenRac/HYDRA-UMC-TOOL-CLI)** — CLI da frota com um contrato de códigos de saída real e estável, um cliente vivo genuíno da API do HYDRA-UMC-SERVER.
- **[HYDRA-UMC-WATCH](https://github.com/JuanenRac/HYDRA-UMC-WATCH)** — aplicação companheira WearOS com padrões de alerta tátil e um relé de voz para o telemóvel emparelhado (ainda não executada num relógio físico).
- **[URTC-SMART-RACK](https://github.com/JuanenRac/URTC-SMART-RACK)** — firmware de um rack de montagem de placas com descodificação real do ID da ferramenta e lógica de pré-aquecimento Smart Idle.
- **[URTC-VISION-TOOL](https://github.com/JuanenRac/URTC-VISION-TOOL)** — firmware mais um companheiro de visão em Python real para uma cabeça de ferramenta de inspeção térmica/RGB.
- **[HYDRA-UMC-UPDATER](https://github.com/JuanenRac/HYDRA-UMC-UPDATER)** — ferramenta administrativa de desktop que descobre, clona e atualiza todos os repositórios deste ecossistema.
- **[HYDRA-UMC-OS-REBUILDER](https://github.com/JuanenRac/HYDRA-UMC-OS-REBUILDER)** — ferramenta de desktop para Windows/Linux que constrói uma imagem do CM5 pronta a gravar com as versões mais recentes do ecossistema, com configuração de primeiro arranque de Wi-Fi/utilizador/SSH ao estilo do Raspberry Pi Imager.
- **[HYDRA-UMC-OPS-AGENT](https://github.com/JuanenRac/HYDRA-UMC-OPS-AGENT)** — coordenador de incidentes de manutenção: um papel de borda de poucos privilégios recolhe um inventário/estado higienizado, um papel de plano de controlo mostra-o só de leitura e pede a um fornecedor de IA que sugira um diagnóstico; nunca aplica um patch nem implanta nada.
- **[HYDRA-UMC-DEV-SERVER](https://github.com/JuanenRac/HYDRA-UMC-DEV-SERVER)** — anfitrião de desenvolvimento reproduzível (Raspberry Pi 5 / CM5) que guarda o código-fonte do ecossistema e executa tarefas limitadas de compilação/teste numa fila durável; um papel de desenvolvimento dedicado, explicitamente não um CM5 operacional.

## 📚 Documentação

Onde ler mais:

* [Base de segurança do ecossistema](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md)
* [Modelo de ameaças do ecossistema](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md)
* [Registo de alterações deste repositório](CHANGELOG.md)
* [Licença deste repositório](LICENSE.md)

## 🤝 Contribuir e comunidade

* Antes de um pull request execute `HYDRA_UMC_CI=1 py -3 tools/ci_validate.py` (ou `HYDRA_UMC_CI=1 python3 tools/ci_validate.py`): tem de imprimir `CI_VALIDATION=PASS`. Não execute `build.sh` nem `build.bat` para esta verificação; compilar não é verificar.
* Os oito README são escritos a partir de uma única fonte em HYDRA-UMC-DOCS; não os edite à mão. Altere a fonte e escreva-os de novo com `tools/make_readmes.py`.
* Não afirme num README o que não foi executado: diga «simulado» ou «não testado em hardware» quando for a verdade.
* Consulte [CONTRIBUTING.md](CONTRIBUTING.md), o [código de conduta](CODE_OF_CONDUCT.md), [SECURITY.md](SECURITY.md) e [SUPPORT.md](SUPPORT.md).

## 👤 AUTOR

**JuanenRac (Electro Hobby 3D)** · electrohobby3d@gmail.com

## 📜 LICENÇA

GPL-3.0-or-later - [LICENSE](LICENSE).
