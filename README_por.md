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
  <a href="README_jpn.md">🇯🇵 日本語</a> |
  🇵🇹 <b>Português</b>
</p>


### 🤖 Painel de controlo web da microfábrica multirrobô HYDRA-UMC

<p align="center">
  <img src="https://img.shields.io/badge/License-GPL%203.0-blue.svg" alt="GPL 3.0">
  <img src="https://img.shields.io/badge/Framework-React%2019-61DAFB.svg" alt="React">
  <img src="https://img.shields.io/badge/Tool-Vite-646CFF.svg" alt="Vite">
  <img src="https://img.shields.io/badge/3D-Three.js-black.svg" alt="Three.js">
  <img src="https://img.shields.io/badge/Language-TypeScript-3178C6.svg" alt="TypeScript">
</p>


---

> **Estado de segurança (safety e security):** este ecossistema não é um sistema de segurança certificado. Ainda não existe um caminho de E-STOP por hardware, nem limites ou interlocks impostos pelo firmware, nem um comando de movimento verificado; as imagens de firmware são verificadas com CRC32 e um HMAC-SHA256 de chave partilhada, não com uma assinatura assimétrica; TLS e TLS mútuo são opcionais e estão desativados por defeito; nenhuma placa própria foi ainda montada ou testada. Leia a [base de segurança](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/SECURITY_BASELINE.md) e o [modelo de ameaças](https://github.com/JuanenRac/HYDRA-UMC-DOCS/blob/main/docs/THREAT_MODEL.md) antes de confiar em qualquer afirmação aqui para a segurança de uma pessoa.

## 📋 Num relance

| | |
|---|---|
| Versão | `0.8.0.0` |
| Maturidade | Funcional |
| Tecnologia | React 19 / Vite / Three.js / Tailwind CSS |
| Destino | O Raspberry Pi CM5 de uma célula HYDRA-UMC |
| Em hardware real | Ainda não: não há registo de execução em hardware real para esta versão |

## 🎯 Visão geral

O **HYDRA-UMC STUDIO** é o painel de controlo, no navegador, do [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) - a placa-mãe da microfábrica multirrobô (anfitrião Raspberry Pi CM5 + coprocessador de tempo real STM32H745 de dois núcleos) que orquestra até 8 braços robóticos distribuídos num único barramento FDCAN. Enquanto o repositório do próprio HYDRA-UMC cobre o hardware e o firmware, este repositório é o lado voltado para as pessoas: uma aplicação React de página única que visualiza cada robô em 3D real, move e grava o seu movimento, gere as máquinas e os acessórios que acompanham uma célula de robôs, e flasha/testa toda a cadeia de firmware CAN-OTA - tudo a partir de um único separador do navegador, sem instalação nativa para além do Node.js.

**Nota de honestidade, de acordo com a convenção de documentação deste ecossistema:** o hardware real do próprio HYDRA-UMC ainda não existe como silício testado (os seus bootloaders compilam sem erros mas ainda não correram em placas reais - veja o `docs/architecture.md` desse repositório). Por isso, este painel executa as suas ferramentas CAN-OTA Flasher/Tester contra uma simulação integrada completa que segue o esquema de endereçamento real e documentado de cada nível, em vez de fingir que fala com hardware que não está lá. A visualização 3D dos robôs, a cinemática, a gravação de trajetórias e todos os painéis de controlo de acessórios são totalmente reais e independentes disso - por agora apenas o próprio transporte CAN-OTA é simulado.

Construído com **React 19**, **Vite**, **Three.js** (através de `@react-three/fiber`/`@react-three/drei`) e **TypeScript** - um cliente puro, sem código de back-end próprio. O estado persistente vive no back-end separado **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** com o qual esta app comunica pela rede.

---

## 🦾 Controlo 3D multirrobô

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

---

## 🏭 Etapa do Kinematic Brain

Um painel de controlo dedicado ao subsistema de movimento local da placa-mãe HYDRA-UMC - os eixos acionados diretamente pelo STM32H745, separados dos braços robóticos distribuídos no STACK A:

- 📐 Controlo de jog do **pórtico XY** para os eixos X, Y1, Y2 (pórtico de duplo Y) e Z
- 🔥 Controlo da **cama aquecida** (comutada por SSR, 230 VAC)
- 🔄 **Revólver ATC** - controlo de índice rotativo de ferramentas para o trocador automático de ferramentas acionado pelo E0
- 🎢 **Tapete rolante** - controlo de instalado/em execução/velocidade para a correia de transporte acionada pelo E1
- 🛑 Uma grelha completa de 12 fins de curso, 3 canais de ventoinha e 10 bombas/10 válvulas para a fluídica de processo

---

## 🎛️ Painéis de controlo de acessórios e máquinas

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

## 🔄 Trabalhos e trajetórias

Carregue trajetórias de exemplo prontas, mova e grave os seus próprios pontos em direto, ou carregue/guarde/edite/reproduza trajetórias complexas de vários pontos (JSON) por robô. As trajetórias são portáteis entre modelos de robô - cada ponto gravado é resolvido através da cinemática real desse robô (`src/examples/robotKinematicsDispatch.ts`) ao carregar/desenhar/reproduzir, e não fixado ao robô que por acaso o gravou, pelo que o mesmo ficheiro de trajetória move corretamente um Parol6 e um UR10e ao longo da sua própria geometria alcançável real.

---

## 🛠️ Ferramentas de firmware CAN-OTA

Flashe e teste firmware em toda a cadeia CAN-OTA HYDRA-UMC + URTC a partir de um só painel, com duas entradas dedicadas:

- **URTC → Flasher / Tester** - para a placa da cabeça de ferramenta URTC e as suas próprias placas de expansão (corresponde à cobertura de protocolo das ferramentas de ambiente de trabalho [URTC Flasher](https://github.com/JuanenRac/URTC-FLASHER)/[URTC Tester](https://github.com/JuanenRac/URTC-TESTER))
- **HYDRA-UMC → Flasher / Tester** - para os níveis da placa controladora do robô e do Kinematic Brain, retransmitidos de ponta a ponta de CM5 → SPI → STM32H745 → FDCAN1 → placa controladora do robô → CAN → cabeça de ferramenta URTC, sem sonda JTAG/SWD nem adaptador USB-CAN (veja o [`docs/architecture.md` do próprio HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC/blob/main/docs/architecture.md) para o desenho completo de endereçamento/relay)

Ambos podem descarregar versões de firmware reais diretamente do GitHub (com base em `firmware_manifest.json`, verificadas por CRC32) para o repositório `URTC` ou `HYDRA-UMC`. Como indicado acima, o transporte simula-se por defeito (o Flasher mostra um aviso SIMULAÇÃO, não envia nada às placas e nunca altera a versão guardada); mude-o para hardware em Config > CAN-OTA para flashar placas reais.

---

## 🎮 Suporte de comando

Integração de comandos USB e Bluetooth com mapeamentos personalizados por botão/por eixo, para mover robôs e acessórios sem rato/teclado. As ações em tempo real (jog de articulações/mesa, E-STOP, INICIAR/PARAR, velocidade de reprodução) disparam o mesmo caminho atómico `sendRobotCommand()` que os botões de jog do painel de detalhe do robô usam, não a gravação adiada das definições - veja `GamepadController.tsx`.

---

## 📹 Integração de câmaras

Até 8 transmissões em direto simultâneas (visão USB ou sensores térmicos da família MLX90640/41/42) com gravação e estado de inferência - a matriz de câmaras em torno da qual se constrói o subsistema de hub USB 3.0 duplo do próprio HYDRA-UMC.

---

## 🌐 Interface multilingue

Tradução completa da interface em **inglês, espanhol, alemão, francês, italiano, chinês simplificado, japonês e português** (`src/locales/`), incluindo o menu de Ajuda na app com os seus guias passo a passo, o assistente, a caixa Acerca de (versão/autor/licença) e cada separador da caixa de Configuração do sistema. A cobertura ainda não é de 100 % de cada ecrã: alguns painéis acessórios independentes continuam com o inglês fixo no código, ainda sem chegar ao trabalho de tradução.

---

## 🤖 Ajuda, guias e assistente

A janela de Ajuda tem um separador de **Guias passo a passo**: um guia por tarefa (adicionar um controlador, mover um robô, gravar uma trajetória, usar as câmaras, flashar firmware, gerir utilizadores, acesso remoto, segurança...), cada um com um nível (básico, avançado, técnico), uma caixa de pesquisa e um botão que leva ao ecrã onde a tarefa se faz. O **Hydri**, o assistente, é uma pequena mascote animada que flutua sobre o painel: explica o ecrã em que está, guia-o numa tarefa passo a passo, responde a perguntas escritas com palavras sem servidor nem modelo de IA (em qualquer dos 8 idiomas), pode ler as respostas em voz alta com a voz do próprio navegador, pode ser arrastado para qualquer sítio e fixado aí, e liga-se ou desliga-se a partir da janela de Ajuda. As suas preferências ficam guardadas no navegador (`src/assistant/`).

---

## ℹ️ Acerca de e configuração do sistema

Duas caixas de diálogo independentes, ambas acessíveis a partir do cabeçalho (botões `Config`/`About`): o **Acerca de** mostra a versão da app em execução (lida em direto de `GET /api/hydra-info`), o autor e a licença; a **Config** cobre a identidade do servidor, a gestão de controladores/nós, o tema da interface + idioma, a mudança de nome dos robôs, o mapeamento câmara↔robô com deteção de conflitos, a biblioteca URDF personalizada, as integrações de software de terceiros (back-ends OpenPnP/CNC/Laser), o acesso remoto por cliente (interruptores independentes para SUITE/Android/iOS), as contas de utilizador, os diretórios de trabalho por robô, o transporte CAN-OTA e o mapeamento do comando - cada um no seu separador. Ambas são componentes próprios (`src/components/About.tsx`, `src/components/Config.tsx`), não embutidos na estrutura principal do painel.

## 🛡️ Fiabilidade

A app protege-se contra duas classes diferentes de falhas em execução, ambas nascidas de um incidente real de produção (um ecrã de quiosque a ficar preto após uma reimplantação). O `src/main.tsx` escuta o evento `vite:preloadError` do próprio Vite - emitido quando um separador do navegador deixado aberto durante uma reimplantação tenta obter um bloco de painel carregado por `React.lazy()` (cada painel de `Dashboard.tsx`, com hash de conteúdo em `vite.config.ts`) que já não existe com o hash antigo - e recarrega a página uma vez automaticamente, pelo que um separador de quiosque de longa duração ou um separador antigo em segundo plano se cura sozinho sem ninguém reparar. Uma guarda em `sessionStorage` impede que isso entre em ciclo infinito de recargas se um bloco faltar de facto por outro motivo. Em separado, o `src/components/ErrorBoundary.tsx` envolve a área de painéis `<Suspense>` como rede de segurança para qualquer outra falha de desenho; está associado ao separador ativo, pelo que ao sair de um painel que falhou se tenta de facto o seguinte em vez de deixar todo o painel preso num ecrã de recurso.
Os comandos nunca falham em silêncio: cada comando de jog, reprodução, alimentação, visão e ferramenta devolve um resultado tipado, uma sessão expirada é renovada uma vez e o comando é repetido, e tudo o que continuar recusado aparece num aviso. O botão vermelho **STOP** é global: um clique, sem confirmação, pára todos os robôs de todos os controladores e desliga todas as válvulas e bombas numa só chamada (`POST /api/stop-all`). Está no cabeçalho e no rodapé, no painel do robô e na sobreposição de controlo remoto, e Ctrl+Shift+Espaço prime-o a partir do teclado (uma combinação que não se escreve por acaso, ignorada com a tecla mantida). O resultado é listado robô a robô (aviso se um robô não parou ou o servidor não conseguiu guardar a paragem; os robôs reservados por outra conta ficam assinalados); uma falha de rede é repetida uma vez, um servidor acima do seu limite (429) ou sem a rota (404) é servido com a paragem por robô, e um aviso persistente «STOP não confirmado» permanece até um STOP posterior obter resposta. O jog com o joystick é um comando de homem morto (termina ao cancelar o ponteiro, perder o foco, ocultar o separador ou passados 8 segundos), um movimento de J1 fica no ângulo equivalente mais próximo e um passo de jog superior a 20 graus é recusado. O comando de jogo segue o robô selecionado na interface e tem a frequência limitada. O firmware de uma versão é verificado com o seu sha256 antes de ser gravado por CAN-OTA, as imagens de bootloader são opcionais e as trajetórias e cenas importadas são validadas antes de chegarem ao estado partilhado.

## 🔐 Contas e acesso

Cada back-end cria uma conta no seu primeiríssimo arranque - utilizador `admin`, palavra-passe `admin` - mude-a em **Config > Utilizadores** assim que o servidor for acessível para além de uma LAN totalmente fiável. Esse mesmo separador permite a uma conta de administrador criar contas adicionais de **operador**: um operador pode iniciar sessão, ver o estado em direto e comandar robôs (jog/reproduzir/pausa/parar/ferramenta/válvula/bomba/velocidade), mas não pode substituir as definições globais nem gerir outras contas. Não é preciso conta para espreitar - o "Continuar só de leitura" do próprio ecrã de início de sessão salta direto para o painel com as escritas desativadas. O contrato completo (funções, tokens, as rotas `/api/users`) está documentado nas secções 2a/2b do [`docs/REMOTE_API.md` do próprio HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md). Em produção o primeiro administrador vem das definições de arranque da implantação e o servidor recusa segredos de exemplo (veja o [`docs/PRODUCTION_BOOTSTRAP.md` do HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/PRODUCTION_BOOTSTRAP.md)).

Cada um dos 5 clientes remotos (SUITE, Android, iOS, Watch, DSI) identifica-se através do cabeçalho de pedido `X-Hydra-Client`, pelo que **Config > Acesso remoto** pode permitir ou bloquear cada um de forma independente em vez de um único interruptor combinado para os cinco.

---

## 💾 Estado persistente

O próprio HYDRA-UMC STUDIO é um cliente puro - não guarda estado próprio para além do que está em memória na sessão atual. Toda a persistência (`settings.json`, `users.json`, trajetórias guardadas em `WORKS/`, modelos submetidos) vive no back-end separado **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)** com o qual esta app comunica pela rede (veja o `data/` e o README desse projeto para o quadro completo) - o estado sobrevive a uma recarga da página ou à reimplantação desta app, já que nenhuma delas toca no processo do back-end. O próprio `settings.json` fica deliberadamente excluído do serviço de ficheiros estáticos desse back-end (contém IPs de controladores, a configuração CAN-OTA e o estado completo por robô), embora a sua pasta `WORKS/` seja servida normalmente.

O mesmo contrato `GET`/`POST /api/settings`, mais um ponto final de descoberta (`GET /api/hydra-info`) e um `WebSocket /ws` para atualizações em direto, é também a forma como os clientes externos se ligam a esse mesmo back-end - é isto que permite à [HYDRA-UMC SUITE](https://github.com/JuanenRac/HYDRA-UMC-SUITE) descobrir uma instância do HYDRA-UMC SERVER em execução na rede, ler/modificar o seu estado e ver refletidas em direto as alterações feitas a partir do separador do navegador desta app (e vice-versa). Contrato completo no [`docs/REMOTE_API.md` do próprio HYDRA-UMC-SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER/blob/main/docs/REMOTE_API.md).

O `GET /api/system/metrics` alimenta o rodapé do painel Resumo: a carga da CPU e o uso de memória são sempre reais (módulo `os` do Node); a temperatura lê a saída real de `vcgencmd measure_temp` num Raspberry Pi verdadeiro e recorre a um valor simulado claramente assinalado nos outros casos (`temp_is_real` na resposta); o estado de Wi-Fi/Ethernet/Bluetooth é lido de `/sys/class/net`/`/sys/class/bluetooth` (só em Linux, `null`/desconhecido em qualquer outro anfitrião em vez de um valor adivinhado).

---

## 📂 Estrutura do repositório

```text
HYDRA-UMC-STUDIO/
├── docs/VACUUM_TABLE_MODELS.md
├── docs/HEATED_BED_MODELS.md
├── docs/RACK_MODELS.md
├── docs/MACHINE_ASSETS.md
├── public/models/machine-pnp/{juanenpnp}, machine-cnc/juanencnc, machine-laser/juanenlaser/ # STL + ATTRIBUTION + VARIANT.md
├── src/machineAssets.ts
├── tests/machineAssets.test.ts
├── public/models/racks/default/        # Rack.scad + STL de base/parede/guia/montagem
├── src/racks.ts
├── tests/racks.test.ts
├── public/models/heatedbeds/default/   # catalog.json + HeatedBed.scad + 4 STL
├── src/heatedBeds.ts
├── src/components/3d/HeatedBedMesh.tsx
├── tests/heatedBeds.test.ts
├── public/models/vacuum-tables/default/  # catalog.json + 6 STL + 6 SCAD
├── src/vacuumTables.ts
├── src/components/3d/VacuumTableMesh.tsx
├── tests/vacuumTables.test.ts
├── src/
│   ├── Dashboard.tsx            # Estrutura principal da app - navegação, painel Resumo, métricas do sistema no rodapé
│   ├── store.tsx                # Estado global: RobotModel/RobotState/HydraController/SystemSettings -
│   │                             # comunica com o back-end HYDRA-UMC-SERVER separado por REST + WebSocket
│   ├── i18n.ts                  # Configuração do react-i18next - carrega src/locales/*.json
│   ├── assistant/               # Hydri, o assistente: motor de respostas, base de conhecimento (8 idiomas), mascote, preferências
│   ├── components/
│   │   ├── About.tsx, Config.tsx  # Caixas de Configuração do sistema e Acerca de - componentes independentes
│   │   │                       # que leem o mesmo store global, não embutidos na estrutura do painel
│   │   ├── ConfirmDialog.tsx    # Modal partilhado de confirmação sim/não
│   │   ├── ErrorBoundary.tsx    # Rede de segurança para qualquer falha de desenho de painel - associada ao separador ativo, veja 🛡️ Fiabilidade
│   │   ├── AuthGate.tsx, UsersPanel.tsx  # Ecrã de início de sessão e o gestor de contas admin/operador de Config > Utilizadores
│   │   ├── AdminServer.tsx, AdminLogs.tsx, AdminClients.tsx  # Menu Ecossistema: painéis Admin do servidor, Registos
│   │   │                       # do servidor e Apps ligadas
│   │   ├── EcosystemServices.tsx, EcosystemTelemetry.tsx, AiFamilyStatus.tsx  # Menu Ecossistema:
│   │   │                       # painéis Serviços, Telemetria e estado da Família de IA
│   │   ├── SystemSupervisor.tsx  # Menu Ecossistema: supervisor em tempo real ao estilo Netdata de CPU/memória/disco/temp./
│   │   │                       # processos, a consultar GET /api/system/supervisor do HYDRA-UMC-SERVER
│   │   ├── RobotDetail.tsx      # Implementação partilhada de jog/trajetória/config por robô (o seletor
│   │   │                       # de modelos vive aqui) - cada entrada robots/A*.tsx abaixo desenha este
│   │   ├── robots/A1.tsx .. A8.tsx  # Entradas por robô - reexportações finas de RobotDetail.tsx, o
│   │   │                       # lugar onde crescer qualquer comportamento futuro específico de um robô sem tocar nos
│   │   │                       # outros 7. O A1 já é a exceção: o ramo `isFloatingLayout` de RobotDetail.tsx
│   │   │                       # (robot.id === 1) move Velocidade/Aceleração/J1-J6/jog XYZ para uma
│   │   │                       # sobreposição arrastável na vista 3D em vez do painel por baixo.
│   │   ├── Joystick3D.tsx       # Bloco direcional XYZ usado por essa sobreposição flutuante
│   │   ├── VirtualKinematics.tsx  # O anfitrião da cena React Three Fiber <Canvas>
│   │   ├── KinematicBrainStage.tsx  # Painel do pórtico XY / cama aquecida / revólver ATC / tapete rolante
│   │   ├── Flasher.tsx, Tester.tsx  # Ferramentas CAN-OTA (níveis URTC e HYDRA-UMC)
│   │   ├── ATCToolsConfig.tsx, RackConfigView.tsx, PickAndPlace.tsx, CNC.tsx, Laser.tsx,
│   │   │   VacuumTableConfig.tsx, HeatedBedConfig.tsx, XYTableConfig.tsx
│   │   │                       # Painéis de controlo de acessórios/máquinas
│   │   ├── JuanenPnPConfig.tsx, LumenPnPConfig.tsx, JuanenCNCConfig.tsx, JuanenLaserConfig.tsx
│   │   │                       # Variantes de configuração específicas de máquina - ainda não ligadas a nenhum
│   │   │                       # caminho de navegação (código morto)
│   │   ├── CamerasView.tsx, GamepadConfig.tsx, GamepadController.tsx, HelpModal.tsx
│   │   ├── FuturisticSlider.tsx, RotaryKnob.tsx  # Widgets partilhados de controlo de jog
│   │   └── 3d/
│   │       ├── RobotArm.tsx     # Despacha para o rig correto por modelo segundo robot.model
│   │       ├── Parol6Arm.tsx, Faze4Arm.tsx, AR3Arm.tsx, AR4Arm.tsx, EdoArm.tsx, Gen2Arm.tsx,
│   │       │   Gen3LiteArm.tsx, Lite6Arm.tsx, M710icArm.tsx, PiperArm.tsx, SoArm100Arm.tsx,
│   │       │   Vx300sArm.tsx, Wx250sArm.tsx, XArm6Arm.tsx, Z1Arm.tsx, KochArm.tsx,
│   │       │   LumenPnPRig.tsx, GenericRobotArm.tsx
│   │       │                   # Rigs específicos de fabricante, cada um transcrito à mão do seu URDF real
│   │       ├── URArm.tsx, UrClassicArm.tsx  # Rigs parametrizados partilhados para as linhas e-Series/Clássica da Universal Robots
│   │       ├── UR3eArm.tsx, UR5eArm.tsx, UR10eArm.tsx, UR16eArm.tsx, UR20Arm.tsx,
│   │       │   Ur3ClassicArm.tsx, Ur5ClassicArm.tsx, Ur10ClassicArm.tsx
│   │       │                   # Invólucros finos por modelo em torno de URArm.tsx / UrClassicArm.tsx
│   │       ├── Shared3DEnvironment.tsx, SharedModule3DView.tsx, PathVisualizer.tsx,
│   │       │   Toolhead.tsx, DraggableGizmo.tsx, ATC3DView.tsx, Rack3DView.tsx
│   │       │                   # Ambiente da cena, desenho de trajetórias, desenho de ferramentas/gizmos
│   ├── examples/
│   │   ├── kinematics.ts, utils.ts, robotKinematicsDispatch.ts
│   │   │                       # Cinemática genérica partilhada de 2 elos + despacho por modelo
│   │   ├── parol6Kinematics.ts, faze4Kinematics.ts, ar3Kinematics.ts, ar4Kinematics.ts,
│   │   │   edoKinematics.ts, gen2Kinematics.ts, gen3LiteKinematics.ts, kochKinematics.ts,
│   │   │   lite6Kinematics.ts, m710icKinematics.ts, piperKinematics.ts, soArm100Kinematics.ts,
│   │   │   xarm6Kinematics.ts, z1Kinematics.ts
│   │   │                       # FK/IK reais específicas de fabricante
│   │   ├── urKinematicsShared.ts, urClassicKinematics.ts  # Motor FK/IK partilhado para as linhas UR e-Series/Clássica
│   │   ├── ur3eKinematics.ts, ur5eKinematics.ts, ur10eKinematics.ts, ur16eKinematics.ts, ur20Kinematics.ts,
│   │   │   ur3ClassicKinematics.ts, ur5ClassicKinematics.ts, ur10ClassicKinematics.ts
│   │   │                       # Dados finos por modelo UR de cadeia/limites/pose inicial
│   │   └── list/                # 26 trajetórias de exemplo prontas (círculos, espirais, padrões de mesa XY, pick-and-place, ...)
│   ├── lib/canOta.ts            # Camada de simulação/protocolo CAN-OTA, descarga de firmware do GitHub
│   ├── lib/apiBase.ts           # Resolução do URL do back-end - relativo+proxy em dev, VITE_API_BASE_URL em prod
│   ├── lib/mediaTicket.ts       # Tickets de vida curta para as imagens das câmaras
│   └── locales/                 # Ficheiros de tradução en/es/de/fr/it/ja/zh/pt (react-i18next)
├── public/
│   ├── models/                  # Recursos de malha 3D reais - uma pasta por robô (24 no total),
│   │                             # cada uma com o seu ATTRIBUTION.txt - veja a tabela de licenças abaixo
│   ├── WORKS/                   # Trajetórias de exemplo guardadas, uma pasta por robô
│   ├── settings.json            # Definições de exemplo para um clone novo
│   └── favicon.svg, icons.svg   # Ícone da app e sprite de ícones partilhado
├── images/                       # Faixa do README
├── tests/                        # Suite Vitest real - matemática FK/IK de src/examples/, o assistente, as traduções, sem React/DOM
│   ├── utils.test.ts             # Par FK/IK genérico partilhado do braço + os seus 5 geradores de percursos
│   ├── urKinematicsShared.test.ts  # Motor real de FK por cadeia DH + IK de Newton-Raphson (através da cadeia real do UR5e)
│   ├── parol6Kinematics.test.ts  # A cadeia real fixa do próprio Parol6
│   └── robotKinematicsDispatch.test.ts  # Uma suite genérica parametrizada sobre os 24 modelos de robô reais
├── tools/
│   ├── build_test.py            # Verificação de compilação sem versão
│   ├── ci_validate.py           # Validação de manifesto/CHANGELOG/docs usada pelo CI
│   └── generate_portable_works.py  # Regenera as trajetórias de exemplo de public/WORKS/
├── example_trajectory.json       # Trajetória de exemplo independente (sequência de ângulos de articulação, dados de exemplo)
├── metadata.json                 # Nome/descrição da app (usado pela plataforma de alojamento)
├── bump_manifest_version.py      # Sincroniza a versão de hydra-umc.project.json com a nativa (--sync)
├── build.sh / build.bat          # Instala dependências + compilação de produção
├── build-test.sh / build-test.bat  # Verificação de compilação sem versão
├── dev.sh / dev.bat              # Instala dependências + inicia o servidor de desenvolvimento do Vite
├── vitest.config.ts              # Configuração do Vitest (só tests/, ambiente node real - sem DOM)
├── tsconfig.test.json            # Projeto de verificação de tipos independente para tests/ (separado das referências app/node)
├── .env.example                  # Modelo de VITE_API_BASE_URL - veja src/lib/apiBase.ts
├── README.md                     # este ficheiro
└── README_spa.md / README_ita.md / README_fra.md / README_deu.md / README_zho.md / README_jpn.md / README_por.md  # traduções
```

O back-end com que esta app comunica (persistência de definições, a API REST/WebSocket, `docs/REMOTE_API.md`) vive no repositório separado **[HYDRA-UMC SERVER](https://github.com/JuanenRac/HYDRA-UMC-SERVER)**, não neste - veja o README desse projeto para a sua estrutura e como o executar.

---

## 🛠️ Ambiente de desenvolvimento

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

O `bump_manifest_version.py` (raiz do repositório) é o único dono tanto de `hydra-umc.project.json` como do campo `version` do `package.json` - o `npm run build` (`vite build`) é deliberadamente só de compilação, para nunca criar divergência entre eles ao subir um e não o outro. O `scripts/bump-version.mjs` é um auxiliar legado só nativo mantido como referência; nada neste repositório o chama já. O esquema em si continua a ser o "odómetro" de base 10 de todo o ecossistema: patch +1 por cada subida real, transbordando para minor (e minor para major) depois do 9 em vez de chegar alguma vez a um segmento de dois dígitos (`0.0.9` -> `0.1.0`, não `0.0.10`). A versão em execução é visível em direto na caixa **Acerca de** (a versão do Studio é lida do `package.json` da própria app; a versão do servidor mostrada ao lado vem de `GET /api/hydra-info`), e o histórico completo está em [`CHANGELOG.md`](CHANGELOG.md).

---

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

---

## 📚 Documentação e comunidade

- **[CONTRIBUTING.md](CONTRIBUTING.md)** — pilha tecnológica e diretrizes de código para um pull request.
- **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** — as normas de comportamento esperadas nesta comunidade.
- **[SECURITY.md](SECURITY.md)** — como comunicar uma vulnerabilidade e as áreas de segurança em que este projeto se concentra.
- **[SUPPORT.md](SUPPORT.md)** — onde fazer perguntas e comunicar erros.
- **[LICENSE.md](LICENSE.md)** — a licença deste projeto.

## 👤 AUTOR
**JuanenRac** (Electro Hobby 3D)
📧 electrohobby3d@gmail.com
📺 [youtube.com/@electrohobby3d](https://youtube.com/@electrohobby3d)

## 📜 LICENÇA

O HYDRA-UMC STUDIO é (c) 2026 JuanenRac (Electro Hobby 3D). Este aviso deve ser incluído em qualquer distribuição deste projeto ou de trabalhos derivados.

O código-fonte desta aplicação está disponível sob a **GNU General Public License v3.0 (GPL-3.0)**. Texto completo em https://www.gnu.org/licenses/gpl-3.0.html.

A documentação (este README e as suas próprias traduções - `README_spa.md`, `README_ita.md`, `README_fra.md`, `README_deu.md`, `README_zho.md`, `README_jpn.md`, `README_por.md`) está disponível sob a **Creative Commons Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)**. Texto completo em https://creativecommons.org/licenses/by-sa/4.0/.

**Recursos de malha de robôs de terceiros:** a geometria 3D real em `public/models/` NÃO está coberta pela GPL-3.0 acima - os ficheiros de malha de cada modelo de robô são recursos de terceiros com licença própria, redistribuídos aqui sob os seus termos originais:

| Fabricante | Modelos | Licença |
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
| Opulo | LumenPnP v4 (also used for JuanenPnP) | CERN-OHL-W v2 |

O repositório de origem exato, o caminho e a referência ao texto da licença de cada modelo estão no `public/models/<categoria>/<slug>/ATTRIBUTION.txt` desse modelo - consulte esse ficheiro antes de redistribuir um conjunto de malhas específico, em vez de assumir que a tabela acima o substitui. Vale a pena ler por inteiro o `ATTRIBUTION.txt` da LumenPnP - ao contrário de todos os braços robóticos acima (ficheiros STL já prontos do próprio fabricante, descarregados tal como estão), esses 5 ficheiros de malha foram gerados internamente a partir da fonte FreeCAD real da Opulo, não redistribuídos tal como estão.

Este painel é o painel de controlo web do projeto de placa-mãe [HYDRA-UMC](https://github.com/JuanenRac/HYDRA-UMC) - veja esse repositório para o licenciamento do seu próprio hardware (CERN-OHL-S v2) e firmware (GPL-3.0), ao qual a licença deste repositório não se estende, e vice-versa. Implementa também ferramentas CAN-OTA contra o protocolo [URTC](https://github.com/JuanenRac/URTC) - veja o repositório desse projeto para a sua licença separada.

Se construir sobre este projeto, tenha presente a divisão de licenças: as alterações ao código devem manter-se GPL-3.0, os derivados da documentação devem manter-se CC BY-SA, e qualquer redistribuição dos recursos de malha de um robô específico deve manter-se sob a licença original desse modelo - cada um com atribuição a este projeto e ao seu autor.

