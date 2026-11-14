# Changelog

## [Unreleased]

- **The screens use 40 more common words:** the `common` block of the eight catalogs goes from 13 to 53 words (the ones of `contracts/i18n/common.json` of HYDRA-UMC-SDK: delete, pause, next, previous, done, status, name, password, language, theme, type, key, time, robot, robots, temperature, connect, disconnect, role, account, memory, telemetry, approve, controllers, services, users, export, download, load, clear, search, value, enable, disable, saved, basic, advanced, technical, sign in and finish) and 50 keys that repeated them are removed from the catalogs, so each word is written once. Nothing changes on screen: a word was taken only when its text was the same in the eight languages in every place it appeared; keys that a test names, or that are built from a prefix at run time, were left as they are. A test checks the 53 words in the eight catalogs and that the old keys do not come back.
- **The screens use the common words instead of their own copies:** 13 keys of the catalogs held a word that is now in the `common` block with exactly the same text in the eight languages (Save in eight panels, Cancel in two, Loading, Close of a dialog and Administrator). The screens now ask for `common.save`, `common.cancel`, `common.loading`, `common.close` and `common.administrator`, and the 13 old keys are removed from the eight catalogs, so the word is written once. Nothing changes on screen. Keys whose text differs in even one language (for example "Loading..." with three dots against the ellipsis of the contract) were left as they are. A test fails when one of the old keys comes back or a panel stops using the common word.
- **The `common` block of the catalogs carries the common words of the apps:** `common` had two words (confirm, cancel); it now has the thirteen of `contracts/i18n/common.json` of HYDRA-UMC-SDK (save, close, try again, yes, no, loading, online, offline, administrator, operator, viewer too), the same in the eight catalogs, European Portuguese for `pt`. The words are written once in the contract and every app takes them in its own format; `python tools/i18n_common.py check-studio --repo <this folder>` in the SDK says whether this catalog still carries them as written. A test checks the thirteen words in the eight catalogs and, when a checkout of the SDK is at hand, that they are the ones of the contract.
- **Guided tours, in the eight languages:** the Help has two new buttons, **Guided tour** (a welcome tour of seven steps: the menu, the overview, the vision center, the settings, the Help and the always-visible STOP) and **Tour of this screen** (for the overview and the vision center). A tour dims the page, lights up the part a step explains with an outline, puts a card with the title and the words next to it, opens by itself the screen a step belongs to, waits for the part to be on the screen (and says so if it never comes, for example when it needs another role), follows the window when it is resized and works from the keyboard (arrows move, Esc closes). The card has Back, Next or Finish, Skip, and a tick **Do not offer tours again**. A switch in the Preferences tab (**Offer the guided tours**, on by default, kept in this browser only) hides the buttons and closes a tour that is open. Nothing starts by itself and nothing is sent to the server. The words of every step are in the eight catalogs (European Portuguese included) and a test fails when a step lacks its sentences in one of them, when a catalog has words for a step that does not exist, or when a step points at a part the dashboard does not mark. Tests: the store, the window, the switch and the buttons of the Help.
- **The tool selector says when the tool of a robot is not one of the URTC family:** the robot keeps the tool it has (the server accepts any text for the tool command and only writes a line in its log for one outside the family), and the Config tab now shows that value as an option of its own with a short note in the eight languages instead of a selector that seems to point at another tool. Nothing is changed or refused. Tests: the list of the selector and the note in every language.
- **The close buttons of the About window, the settings window and the camera message have a name for screen readers:** each one held only a multiplication sign and was read as "times"; they now carry the translated label that the Help window already used. A test reads every component and fails for a close button made of a multiplication sign without a name.
- **The shared tools and the CI jobs have time limits:** the project tool, the validators and the build test pass a timeout to every child process (`HYDRA_UMC_GIT_TIMEOUT_S`, 120 s by default, and `HYDRA_UMC_COMMAND_TIMEOUT_S`, 3600 s by default; a value that is not a positive number means the default), and the baseline and notify jobs of the workflows carry `timeout-minutes`, so a stuck step ends with a message instead of holding a runner.
- **More tests of the assistant, and a coverage floor:** reading aloud (no speech in the browser means no sound and no error, a voice of the language of the interface, the callbacks, the numbering of steps) and the placement of the bubble (inside the work area whenever it fits, for 500 boxes drawn with a fixed seed, the preference for the sides, windows smaller than their margins). The coverage step of the CI now keeps a floor at the measured values (86 % statements, 79 % branches, 78 % functions, 87 % lines).
- **The CI measures the coverage of the tests:** a step of the workflow runs the tests with V8 coverage and prints the table of each file and a summary (report only, no floor yet); the floor will be fixed with the measured number.
- **The jog pad has names for screen readers:** the eight direction buttons and the two Z buttons of the 3D jog pad carried only an icon (or a bare Z); each now has an `aria-label` built from the existing "Jog X +" sentences, so it is translated in the eight languages. `tests/joystickLabels.test.tsx`.
- **Server Admin > Machine bridges shows the flight policy switches of the machine bridges:** the UAV bridge's envelope requirement, human confirmation, chaining in flight and geofence upload, and the droid bridge's human confirmation and going home, in the eight languages. The server reports them like the other bridge switches, the risky values (a requirement turned off, chaining or the geofence upload turned on) ask for a confirmation first, and the bridges apply them in the tightening direction only.
- **The read-only mode of the server can be switched in Server Admin, and its refusal is told in the language of the person:** Server Admin > Security has a switch for the read-only mode of the whole server (off by default, asks to confirm every change, locked when the variable of the server fixes it; a server that predates the option shows nothing). A command refused with `server-read-only` (423) is no longer shown as a robot in safe mode: the banner says that the server is read-only and that only STOP and the safe-mode disable go through, in the eight languages. `tests/serverReadOnly.test.ts`.
- **Listen only can be set for one server (off by default):** next to the general switch, Configuration, Preferences has a switch for the server this window talks to (`listenOnlyServers`, the list of origins kept in this browser). While it is on, every write to that server is answered with a 423 at the door of `fetch` and every robot command except STOP and the safe-mode disable is refused with the translated notice, and nothing is lost: reads, STOP and the sign-in go on, other servers are not affected, and the switch is locked while the general one is on. The text is in the eight languages. `tests/listenOnlyServers.test.tsx`.

## [0.8.2.0] - Listen-only mode, one stop state in the header, the kinematic table of the SDK and the F-RAM self-test and erase in the Flasher

- **README: the platform statement:** a note says that where the README speaks of the CM5 it means the pilot bench that runs today, and that the target platform of HYDRA-UMC, an NVIDIA Jetson Orin NX 16 GB, is a design that has not been built or tested.
- **Listen only (off by default):** a switch in Configuration, Preferences makes this window show the robots and their data without sending any robot command. While it is on, the guard of every command refuses everything except STOP and the safe-mode disable (refusing a stop would be the unsafe side), says so with its own sentence, and a banner stays on top of the page; the choice is kept in this browser. Every other write to the server (services, cameras, settings, users, files, shutdown) is also refused at the door of the browser with a 423 and never leaves it, except STOP, the sign-in, the renewal and the end of the session (`lib/listenOnlyGuard.ts`, installed on fetch once). Texts in the eight languages; 17 tests.

- **The folders the dev server forwards to the server are a list in `dev-proxy.config.json`:** `/api` and `/ws` are always forwarded and the raw data folders (the Works of the robots, `/WORKS` by default) are the `paths` of the file, so a Works path outside WORKS/ is forwarded by adding its prefix instead of editing `vite.config.ts`; `target` (and `HYDRA_STUDIO_PROXY_TARGET`) says where the server is. A prefix that is not safe to forward (the root, a pattern, a blank, a dot segment, a path the dev server itself answers) is left out and named in a warning, and a file that cannot be read falls back to the defaults. Development only; the production build is unchanged. 8 tests.

- **The inverse kinematics gives the joints inside their travel:** a solver may return a joint as the same angle a whole turn away (-333 for 27, 351 for -9); the dispatcher now brings such a joint back inside the travel of its model, so the pose is the same and the value is no longer outside the range (11 models returned values outside it). Tests cover the angles taken from inside the range of every model.

- **Enabling the XY table writes its layout at once:** a robot that gets a table now has the 300 mm layout from the first click, so the size fields and the jog answer without pressing Reset first.

- **The kinematic table is the document of the SDK, and the F-RAM routes are checked against the pinned contract:** `src/data/kinematicData.json` is now byte for byte `contracts/kinematics.json` of the SDK (a test compares both when the SDK is next to this repository or in `HYDRA_UMC_SDK_DIR`), the continuous integration is pinned to the SDK tag that carries the F-RAM routes and that document, and the exemption the route test kept for `/api/hardware/fram/*` is gone: the app may only call routes the pinned contract declares.

- **The Flasher offers the self-test and the erase of the F-RAM of the kinematic brain when the server announces them:** the preflight no longer refuses the erase outright; it reads `capabilities.fram_erase` of the version query (true only when the SPI bridge and the server both offer the operation, both off by default) and refuses with a reason when it is missing or the target is not the brain, whose main board holds the chip. A new panel under the Flasher has a self-test button and an erase button whose dialog asks for the word `ERASE` typed (the server and the bridge ask for it again); the option "erase the F-RAM after the flash" runs the erase after a successful hardware flash of the brain, and the confirmation of the flash says so. All the texts are in the eight languages.

- **The emergency stop watch and the F-RAM erase are options of Server Admin:** the safety block of Server Admin > Security has the interval of the watch of the physical emergency stop (`safety.estopWatchMs`: empty or 0 is off, otherwise 500 to 60000 milliseconds, applied on restart of the server; the environment variable still wins and locks it) and the switch that offers the F-RAM erase (`safety.framErase`, off by default, asks for a confirmation to turn on). A server that predates them shows neither.

- **The window of a slot of the stack bus is 64 identifiers in the Flasher addressing:** `slotBaseId` and `SLOT_WINDOW` follow the firmware (`0x600 + slot * 0x40`, the last slot at `0x7C0`); they were still 32 wide.

- **One stop state in the header, joining the physical emergency stop with the global stop:** the server pushes a `stop-state` message on the socket (right after the connection opens and at every change) and `StopStateBadge` beside the STOP button shows it: red `STOPPED` while the physical emergency stop (the frame on identifier `0x001`, as the kinematic brain holds it) or the global stop is on, green `Ready` once the physical stop is known to be released, grey `Stop not monitored` while the server does not watch it (its default). The tooltip names both stops, nothing is drawn before the server has said anything, a damaged message leaves the last state as it was, and the badge only reads: it never sends a stop. In the eight languages, with `src/lib/stopStateFeed.ts` as the feed and tests of the message, the feed, the socket routing, the badge, the language and the locale keys. Needs the server to watch the stop (`HYDRA_UMC_ESTOP_WATCH_MS`); not run against a real brain.

- **The robot detail screen is cut into parts, with the same behaviour:** `RobotDetail.tsx` goes from 761 to about 330 lines. The five confirmation dialogs (`RobotDetailDialogs.tsx`), the action row under the 3D view (`ActionRow.tsx`), and the controls over the 3D view (`ViewportControls.tsx`: move/rotate/scale/centre and full screen, the camera windows and the buttons that reopen them, the compact STOP/START/PAUSE panel of the embedded Android screen) are their own components that receive what they need as properties. Component tests with a real DOM check each part: one click on the global stop, no play without points, START turning into STOP and ALL for a group, PAUSE through the atomic command for the whole group, HOME and delete-points asking first, REPEAT keeping the rest of the playback state, the icon-only Android layout, the reach dialog offering only the refusal when the trajectory cannot be scaled, the camera windows of the combined robots. The comments that told the story of old bugs are now one line each with the reason for the decision.

- **The shapes of the state live in their own file:** the types of the robots, cameras, controllers, settings and the store context move from `store.ts` to `types/hydra.ts` (a file with only types; `store.ts` re-exports every name, so no import changes and `store.ts` keeps only the values: the stream labels, the default port, the context and its hook). A test checks that the types file exports no value and that every name is still reachable through the store.

All notable changes to this project are documented here.

## [0.8.1.9] - The Flasher sends the board and the oldest bootloader the manifest names: the entry of an image in the manifest of the release may state `target` (the board the image is for) and `min_bootloader` (the oldest bootloader that may take it); the Flasher reads them

- **The Flasher sends the board and the oldest bootloader the manifest names:** the entry of an image in the manifest of the release may state `target` (the board the image is for) and `min_bootloader` (the oldest bootloader that may take it); the Flasher reads them (the binary entry wins over the component, a value the relay would refuse is dropped) and sends them with the flash request, so that the flashing service refuses a foreign board or an older bootloader before it sends a byte. A manifest that states neither sends nothing, as before. Tests cover the reading, the request and the release listing.

- **A switch for the relay of the live state of the twin in the server administration, in eight languages (off by default):** the new box `twinRelay.enabled` (locked when the server sets it from the environment) turns on `/api/twin/ws` on the server; until now only an environment variable did.

- **Tests for the audit record screen, the connected apps panel and the render boundary, three screens that no test reached:** the audit screen is checked for who may read it, the lines newest first with their account, window, address and robot, every filter (the ones the server knows are sent to it), the chain verified by the server and in the window (a line changed, a line that no longer names its predecessor, gaps), each way the read can fail, the record switched off, reading again by itself and saving the lines to a file; the panel of connected apps for the order, the counts, how long ago each one connected and the failures; and the boundary that keeps one broken panel from blanking the page. Line coverage goes from 63.2 % to 64.4 %.

- **A panel for the live state of the twin in the server administration, in eight languages (off by default):** with the box ticked the window opens the relay of the server (`/api/twin/ws`, the session token as a subprotocol, since a browser cannot send the header the twin's own socket asks for) and shows whether the state is of the real robot or of a simulation, how many joints it holds, why there is none when the twin says so, and the vehicles it follows. A state older than the last one of the same robot is dropped, a refused session is not retried with the same token, a server that cannot pass the twin on says so, and an unreachable twin is tried again shortly. The choice is kept in this browser only and the window only reads.

- **The Flasher checks an image before it goes over the real bus:** an image without a hardware id (a file picked from the disk) or without a readable version is no longer sent as id 0 and version 0.0, an image older than the installed version is held back unless the downgrade choice is ticked, and the F-RAM erase, which the bridge has no command for, is refused instead of silently ignored. The four reasons are told in the log in the eight languages, and `flashPreflight` is tested on its own. The simulation is unchanged.

- **A setting for what the Live Activity of a robot shows on the lock screen, in the server administration, in eight languages:** the card is off by default and shows only the state of the robot; an administrator can raise it to the state and the progress, or to the whole panel (the most there is), and the server applies the level before anything leaves it. Turning the card on or raising the level asks for a confirmation that says what the lock screen will show; lowering it or turning it off never asks. No level above the one the server allows is offered, a value fixed by the environment of the server is locked, push being off is said, and the section stays out of the way on a server that predates it.

- **A reset of the arm state of a tool changer in the arm state panel, for administrators, in eight languages:** a disarmed tool with a fresh report offers a Reset that asks for the robot id to be typed exactly before the button works, sends it to the server (off by default there; it answers that it is switched off) and reads the list again afterwards; a refusal of the server (the robot is moving or armed, a report is old, the state could not be read) is told in words, nothing is reset on a guess, and the reset moves nothing mechanical.

- **A read-only panel of the arm state of the URTC tools in the safety limits screen, in eight languages:** for each robot and tool whether its power stage may act, who reported it and how old the report is, read through the server; a report older than the time limit is never shown as safe (an armed tool with an old report is a warning, a disarmed one is unknown), the dangerous rows come first, and a server without the safety zones service says the state is not available instead of showing an empty list. Nothing on the screen arms, disarms or stops a tool.

- **A switch for the loaded-model reports of the detection service in the server administration, in eight languages:** off by default, it asks for a confirmation on screen before turning on (the request carries the confirmation only then), is locked when the server's environment fixes it, and stays out of the way on a server that predates it.

## [0.8.1.8] - The reading of the connection list and sign-in history goes through the shared HTTP client of the kit: the calls keep their behaviour (one plain request, no repeat, no time limit; an answer that is not JSON reads as an empty... (and 2 more changes)

- **The reading of the connection list and sign-in history goes through the shared HTTP client of the kit:** the calls keep their behaviour (one plain request, no repeat, no time limit; an answer that is not JSON reads as an empty list; a missing route, a refusal, a server error and an unreachable server are still told apart), and the tests now also cover an answer that is not JSON and the single attempt on a server error.

- **The tool changer screen no longer carries a reset button that could never be shown, and has its own tests:** the button sat in the branch that only runs when the robot has no changer, so it never appeared; the screen is covered by tests for enabling a changer with the default layout and for opening a robot that already has one. Comments that told how something used to work now say what the code does.

- **A gamepad mode that is off until it is armed, with a dead zone, a speed limit and safety rules, read from the browser's own Gamepad API:** the mode starts off in every new window and is armed from the Gamepad tab after an explicit confirmation, with a robot selected and (unless that switch is turned off) reserved by this window; the dead zone, the speed limit, the time between commands, the most unanswered commands and three safety switches (reservation required, stop on disconnect, focus required) are settings with safe defaults, and the mapping of buttons and sticks, now with next and previous robot, stays in the settings; the stick push scales every step, STOP is always the only event of its frame and cancels what was queued, a gamepad that disconnects stops every robot and switches the mode off with a notice that stays on screen, nothing is read while the tab has no focus, and after arming, after a pause or after a reconnection nothing moves until every input has been let go; the tab lists the live inputs with how hard they are pushed and the action each one has, the footer says whether the mode is armed, the Help has a basic and an advanced guide, and every text is in eight languages. It is tested with a simulated Gamepad API (`lib/gamepadMode.ts`, `tests/gamepadMode.test.ts`, `tests/gamepadController.test.tsx`); it has not been tried with a physical gamepad.

## [0.8.1.7] - An Updates tab in the configuration window shows the installed versions, in eight languages: the version of this Studio, the one of the server and the version each program next to the server reports (GET /api/hydra-info, GET... (and 6 more changes)

- **An Updates tab in the configuration window shows the installed versions, in eight languages:** the version of this Studio, the one of the server and the version each program next to the server reports (`GET /api/hydra-info`, `GET /api/ecosystem/status`). The server has no route that tells the newest published version or installs one, so the tab says so and changes nothing.

- **A Security tab gathers the sign-in checks, the second factor and the token signing keys, with a guarded rotation:** two checks (two-step sign-in on, tokens signed with asymmetric keys), the existing two-step sign-in card and, for administrators, the public state of the signing keys (`GET /api/admin/jwt-keys`). Rotating the key (`POST /api/admin/jwt-keys/rotate`) needs a switch that is off every time the tab opens and a confirmation, and the answers of the server (shared secret in use, key file unusable) are told apart.

- **An Installation tab shows a first-run checklist read from the server:** the server answers, a controller is added, a robot is set up and the account has its second factor, each marked done, to do or not known, with the next step and where it is done. It only checks and tells, because the server has no route that installs or repairs anything.

- **A remote access setup tab walks through the address, the kinds of app and the check from the phone:** the address the apps type with its QR code (and a warning when the page was opened from the machine itself), the same per-app switches as the Remote Access tab, and a close-all that asks first.

- **A Preferences tab keeps the level the Help opens at, the density and reduced animations in this browser:** each change is saved and applied at once, nothing is sent to the server, and the Help opens its step-by-step guides at the chosen level.

- **A Notifications tab shows the state of the push notifications to administrators:** off, on without usable credentials, or ready; how many phones are registered and which events are announced (`GET /api/admin/push`). The server takes these switches from its own security file, so the tab has no switches.

- **A History tab joins the connections and, for administrators, the audit record, and the Help has a guide for each new tab:** the existing connection history and audit record screens appear under one tab of the configuration window, and the step-by-step guides of the Help (by level, in eight languages) cover updates, security, installation, remote access setup, preferences, notifications and history.

## [0.8.1.6] - A fourth view of the path of a trajectory that turns around it, and a point that moves to a typed position: next to the views from above, the side and the front, the check shown before Play draws the path from a point of view... (and 1 more changes)

- **A fourth view of the path of a trajectory that turns around it, and a point that moves to a typed position:** next to the views from above, the side and the front, the check shown before Play draws the path from a point of view that turns in steps (left, right, up, down; the starting angles and the step are in `src/config/trajectoryPreview.json`). In the form that edits a point, typing X, Y and Z in millimetres and pressing the button finds the joints that bring the tool closest, keeping its orientation, with the inverse kinematics of the model; a position the model cannot reach (the tool would miss it by more than the reach tolerance) leaves the point as it was and says by how much it misses, and a model with no kinematics of its own is told so. Texts in the eight languages.

- **Sending a robot command and the global STOP leave the global state provider, and the ATC and XY table screens save their file through the shared download, with no change in what the screens do:** the POST of a command, the command with its optimistic change and its rollback, and the reading of one robot after a 412 are in `src/hooks/useRobotCommandSender.ts`; the global STOP with its retries and its fallback robot by robot is in `src/hooks/useEmergencyStop.ts`. The provider keeps the shared configuration, the live state and the preferences.

## [0.8.1.5] - The npm dependencies are up to date, with no change in what the screens do: React 19.3, Three.js 0.186 with its drei and fiber bindings, motion 14, i18next 26.5 with react-i18next, lucide-react 1.64, tailwind-merge, the Vite... (and 1 more changes)

- **The npm dependencies are up to date, with no change in what the screens do:** React 19.3, Three.js 0.186 with its drei and fiber bindings, motion 14, i18next 26.5 with react-i18next, lucide-react 1.64, tailwind-merge, the Vite React plugin 6.1 and the type packages move to their latest releases, and the one translation call whose typing changed with i18next is written so both forms of it type-check.

- **The sign-in session, the API base address, the connection history answers, the assistant preferences and the access state are built on the shared web kit, with no change in what the screens do:** the kit is pinned as a built archive by its https address and its integrity hash (`npm ci --ignore-scripts` is enough, no SSH key and no build step), and the client files keep their names, their exports and their tests unchanged. Calls through the connection history still use the client's own fetch, without the kit's retries or time limit.

## [0.8.1.4] - The shared configuration leaves the global state provider, and the gamepad, heated bed and vacuum table screens keep their decisions in the tested place, with no change in what the screens do: the settings tree, the... (and 2 more changes)

- **The shared configuration leaves the global state provider, and the gamepad, heated bed and vacuum table screens keep their decisions in the tested place, with no change in what the screens do:** the settings tree, the controllers and the active controller, the first read of `GET /api/settings`, the full-tree message and the targeted delta of the live socket, and the save of the whole tree with its ETag move to `hooks/useSharedConfig.ts` together with the refs that guard the echo of the server (the provider goes from 586 to about 400 lines and keeps the commands, the global STOP and the wiring); the menu of gamepad actions in its order, the live inputs of a pad, the layouts a heated bed or a vacuum table reset restores and the switch of a module go to `lib/moduleConfigs.ts` (`tests/moduleConfigsPads.test.ts`).

- **The planning view can ask for the kinematic check of a plan and shows the verdict `unchecked` as what it is, in eight languages:** a second button asks the semantic planner (`POST /plan/trajectory-check`, through the relay of the server) whether the moves are reachable and within the limits. When part of the plan is not shown (for example the orientation of the tool, which the replica does not solve) the verdict is painted in amber with the list of what was not checked, never as an acceptance; an accepted answer that lists something unchecked, or an unchecked one that lists nothing or a broken limit, is refused as malformed. The route answers "off" until the planner has it switched on and the server relays it.

- **The map of the ecosystem can show what each project has been tried on:** a switch (off by default, remembered in this browser) adds a line to each tile from the maturity ledger that ships with Studio (`src/data/maturityLedger.json`, the file the documentation hub generates; nothing recorded, a computer, a simulator, the bench or real hardware, and the number of open gaps), in the language of the interface. A test compares the shipped copy with the hub's when its checkout is at hand.

## [0.8.1.3] - The configuration dialog is one component per tab, and the module screens keep their decisions in one tested place, with no change in what the screens do: Config.tsx goes from 941 to about 150 lines (each tab is a file of... (and 2 more changes)

- **The configuration dialog is one component per tab, and the module screens keep their decisions in one tested place, with no change in what the screens do:** `Config.tsx` goes from 941 to about 150 lines (each tab is a file of `components/config/`; the connection tests of the integration cards and the camera tools, which keep their state when the tab is left, are the hooks `useConnectionTests` and `useCameraTools`). How many slots a tool changer has, the tool and position of a slot, the end of a jog of the XY table, the layout a reset restores and the usable slots of a rack move to `lib/moduleConfigs.ts`, and the tool changer screen uses the one list of tools of the robot screen instead of a copy. The state provider hands the state of the live link (reachable, last save, CAN flash progress, log clear mark) to `useLiveStatus` and the change of a setting by the person (shared for an administrator, local for any other account) to `useSettingsPreferences`. New tests: `tests/configTabs.test.tsx`, `tests/moduleConfigs.test.ts`, `tests/moduleScreens.test.tsx`, `tests/providerLiveAndPreferences.test.tsx`.

- **Server Admin > Security has the switches for what the services hand to the server, all off by default, with a confirmation to turn one on, in eight languages:** the faults of the machines, the outcomes of reproduction scenarios, the status of the developer node, the verdicts of the anomaly detector (and their relay to the voice interface), the signed record of the voice commands and the check of signed trajectory proposals, plus the name of the file with the operators' public keys. They travel in the `ingest` block of `GET` and `PUT /api/admin/server-config`; only what changed is sent, with `confirm: true` exactly when a switch goes on or another keys file is chosen; a switch fixed by the environment of the server is locked and says so, and the panel tells when the feeds that read the broker apply on the next start. A server without the block shows nothing. Tests in `tests/ingestSwitches.test.tsx`.

- **Server Admin > Security shows the status of the developer node:** the latest status each developer node sent to the server (`GET /api/developer-node/status`), drawn only as plain text, with a refresh and a check of the signed record that says whether its chain is intact or broken; while the switch of the server is off it says so instead of showing an empty list.

## [0.8.1.2] - Server Admin has a switch for the read-out protection level of a production flash, in eight languages: the Security tab shows production.rdpLevel of the server (off by default; level 2 is never offered), says whether the... (and 26 more changes)

- **Server Admin has a switch for the read-out protection level of a production flash, in eight languages:** the Security tab shows `production.rdpLevel` of the server (off by default; level 2 is never offered), says whether the environment locks it, and asks for a confirmation before turning it on, because only a full erase of the chip undoes level 1. It only records the choice; no flashing tool reads it yet.

- **The global state provider and the robot screen lose more of their size:** the problem of the last command and the answer of the global STOP (`hooks/useCommandIssues.ts`), the safety limits poll (`hooks/useSafetyLimitsSync.ts`), the POST of a robot command and the table move as jogs (`lib/robotCommandPost.ts`), the save and load of trajectories and scenes (`hooks/useSceneFiles.ts`), the reach check of a trajectory (`hooks/useReachGate.ts`) and the command that loads a Work or an example (`lib/trajectoryCommand.ts`, built once instead of three times) moved out unchanged; the provider goes from 1046 to under 950 lines and the robot screen from 1317 to about 1230. 11 tests.

- **Wording corrections in the translations:** the Japanese counter of connected apps reads `接続済み` (connected, not connecting), the Portuguese standard mode is `Padrão`, the Portuguese pause buttons are the verb `Pausar`, the flasher uses the European Portuguese `gravar` (write) instead of `flashar`, the save-configuration button is spelled out in German, French and Italian, and the labels of Spanish, French and Italian no longer capitalise every word.

- **The answers of the server are replayed against the readers of the app:** `tests/fixtures/server-answers.json` is the file the SDK generates from the server inventory (a minimal and a full body for every answer of every route), kept identical by `tools/sync_sdk_answers.py --check` in the CI validator; `tests/serverAnswers.test.ts` feeds every body to the readers of the connections, the reservations, the safety limits, the health of the ecosystem, the server security state and the result of a command: none may throw, a command result follows its status, and the text of a refusal is kept.

- **Server Admin shows and changes whether a real command needs a pass verdict of the twin:** a section for the switch `require_twin_pass` of the HIL bridge (`GET` and `POST /api/hil-bridge/settings`). It is off by default, any change asks for a confirmation on screen and sends `confirm: true`, what the bridge would refuse (locked on, no twin key or robot, no identity key) is said before saving, and nothing is shown when the server has no such bridge. Eight languages; 9 tests.

- **The build test of the repository compiles only on CI or when allowed:** for the stacks that compile (`rust`, `go`, `android`, `flutter`, `firmware-c`), `tools/build_test.py` prints `BUILD_TEST=SKIPPED` with exit status 2 on a plain PC, never a pass; `ALLOW_LOCAL_BUILD=1` allows it and a CI runner always may. The `python` and `node` stacks are not locked.

- **One folder for the 3D model library, shared with the desktop app and the STL editor:** with `HYDRA_UMC_LIBRARY_DIR` set to an existing folder (the layout of `public/models`: category / model / files) the dev and preview servers answer `/models/...` from it, a production build copies it into `dist/models`, and the mesh package (`npm run meshes`, `predev`, `prebuild`) never installs over it. A request can never leave the folder. Unset (the default), or naming something that is not a folder, nothing changes. The sentence the command line prints is in the eight languages; 10 tests.

- **Server Admin lists the proposals of the node watchdog and lets an administrator decide them:** the proposals that wait for a person are read through `GET /api/ops-agent/proposals`; approving asks for a confirmation on screen and sends `confirm: true`, rejecting needs none, and the decision is made in the name of the signed-in account (no name is sent). The last decisions are listed and nothing is shown when the server has no channel to the watchdog. Eight languages; 7 tests.

- **Server Admin shows and changes whether the approval of a plan needs the person who is signed in:** the semantic planner releases a plan only when the approver is signed in with a token of the server and is the person named in the approval (on by default). A new section reads the switch through `GET /api/semantic-planner/settings`, relaxing it asks for a confirmation on screen and sends `confirm: true`, tightening it again needs none, and nothing is shown when the server has no planner set up. Eight languages; 8 tests.

- **Server Admin shows whether the settings sent to the machine bridges can be signed:** under the switches of the machine bridges it lists, for each bridge, the state of the key that signs its settings (ready, not made yet, or unusable), when a message was last signed and the path of the key file, never the key. A bridge applies a setting only with a valid, current signature, so a bridge without the key keeps its own configuration. In the eight languages (Portuguese from Portugal). 1 more test.

- **Server Admin shows the identity of the server in its calls to the services:** a new section "Identity of the services" (administrators only) shows whether the server presents its signed token to the services, whether its key can sign, which services take the identity, which keep a verifier of their own and which do not yet, and the safe order of the steps. The switch is off by default, turning it on asks for a confirmation, turning it off warns that a service whose identity key is on will refuse the server, and the key itself is still given to each service on the machine. Available in eight languages.

- **Server Admin shows the switch of the connector hub gate that answers a caller without identity:** it reads and changes `allowLoopbackNoIdentity` of the hub through the server (`GET` and `POST /api/connector-hub/gate/settings`). It is off by default, turning it on asks for a confirmation on screen, it tells whether the change is kept in the hub settings file or only until the hub restarts, and nothing is shown on a server that has no such gate. Eight languages.

- **Portuguese camera badge:** the live badge of the camera matrix reads `EM DIRETO`, the whole expression.

- **The firmware downloader reads the release assets of HYDRA-UMC:** the images of the controller and kinematic boards are no longer in the repository, so the manifest, each image and its signature file come from the latest release (the CRC32 of the manifest and the SHA-256 of the manifest or, failing that, the one GitHub states for the asset are checked before anything is flashed); URTC keeps being read from its repository. Five tests.

- **Three translations corrected:** the Italian label of the port is `Porta` (it was left in English), the Portuguese counter of connected apps agrees in gender (`Ligados`) and the heated bed is the heated table (`mesa aquecida`) in Portuguese, as in the rest of the family.

- **The trajectory files and the G-code export moved out of the robot screen:** the listing of the WORKS folder and the save of the recorded points are in `hooks/useWorkFiles.ts` and the G-code text in `lib/gcodeExport.ts`, unchanged, with nine tests.

- **The session moved out of the global state provider:** the token read on the first render, the sign-in with its second step, the silent renewal and the sign-out are in `hooks/useAuthSession.ts`, unchanged, with eight tests; the provider keeps the settings, the socket and the robots.

- **Licence and credit of the submitted models:** Config > Models lists the credit each model came with and has a switch (off by default) that makes the server refuse a submission without it, in the eight languages.

- **The command handlers of the robot screen live in their own hook (`src/hooks/useRobotCommands.ts`):** recording a point, the Cartesian and base jogs, HOME and RESET, the XY table slider, RESET 3D and the valves and pumps moved out of `RobotDetail.tsx` (about 200 lines fewer) with the same behaviour and their own tests of what each one sends to the command channel.

- **The files of trajectories and scenes leave the provider:** the name of a saved trajectory, the reading of a trajectory or scene file (points, one pose or the reason it is refused) and the download of a JSON file are in `src/lib/sceneFiles.ts` with their own tests (8), and the stop robot by robot (the fallback of the global STOP) moved to `src/lib/stopAll.ts` with 2 tests of its own (valves and pumps off, one retry of a network failure), so `HydraProvider` keeps only the state and the commands. No change in what the screens do.

- **The AI dashboard inside the app:** a new entry in the Ecosystem menu shows the dashboard of the AI services (trend summary, anomaly check, fleet view) that the server serves at `/dashboard-ai`, in a frame that follows the height the page announces. The page uses the login of this app, so it is framed only when it comes from the same address; from another address the panel says so and offers a link. The message about the height is believed only from the frame itself, from the origin of the page, with the expected type and a sensible number. The texts are in the eight languages and 5 new tests cover the checks.

- **Server Admin > Machine bridges:** the switches of BRIDGE-DROIDS (`globalStop`, `cutOnGlobalStop`), BRIDGE-UAV (`missionUploadEnabled`), BRIDGE-AMR (`publishState`, `publishOpcua`, `zoneInterlock`, `zoneUnknown`) and BRIDGE-OPENPNP (`boardCode`), each with its value, its source, its default and the name the bridge reads on its own host. Only what changed is sent, turning on a risky function asks first, the warnings of the server are shown, and the screen says whether the gateway that carries the values to the bridges is on. A server that does not report the switches does not show the section. The texts are in the eight languages.

- **Server Admin > Request limits per address:** the switch for the limiters of the server (sign-in, renewals, API, code and service routes, global stop; on by default) and their eight numbers, each with its range and its source. Only what changed is sent, a number outside its range or a value that is not a whole number is refused before sending, a value fixed by the environment of the server is locked, switching the limiters off asks first, and the warnings of the server (`rate_limits_off`, `rate_limits_loose`) are shown. A server that does not report the limits does not show the section. The texts are in the eight languages.

- **Server Admin > Sign-in tokens:** choose how the server signs the login tokens (HS256 with the shared secret, the default, or EdDSA with public keys published at `/.well-known/jwks.json`), keep or refuse HS256 tokens during the switch (asks first, since the sessions that hold one must sign in again) and rotate the signing key (the previous one stays valid for the overlap). An option fixed by the environment of the server is locked; the sentences are in the eight languages.

- **The settings tree is saved with `PUT /api/settings` and `If-Match`:** the window keeps the ETag of the last read and sends it back; when the server answers 412 (or 428) the window reads the tree again, sends the save once more if the server still holds the tree it last received (a robot that moved changes the revision), and otherwise shows the server's version with a message in the eight languages asking to apply the change again. A server without `PUT` is saved with `POST` as before; the factory reset refreshes a stale revision and goes through.

- **The audit record knows the motion and model-submission entries:** `robot-motion` (play, pause, stop, trajectory, table, speed, tool, valve, pump and the jog stream) and `model-submit` have a name in the eight languages, appear in the type filter, and the keys of their detail (command, points, table X and Y, model, category, replaces, meshes, reason) are shown with a translated name.

- **Server Admin > Safety limits has the interval of the audit of the jog stream:** a whole number of seconds from 0 to 3600 (10 by default), saved with the other limits; 0 leaves the jog stream out of the audit record while the discrete commands are always recorded.

## [0.8.1.1] - An editor of the tier plan of the data lake inside the Telemetry panel with strict rules, the panel layout moved out of the robot detail into its own hook and tests of the global stop and the sign-in

- **Bench test script:** `docs/BENCH_TESTS.md` lists the flashing and emergency-stop checks that need a real board, all marked not executed.

- **The drag of the right panel and of the 3D view of a robot screen lives in its own hook (`usePanelLayout`), and the global STOP and the login gate have tests with a real DOM** (button, keyboard chord, report banner, credentials, second step, read-only entry and the confirmation of the kiosk power buttons). Same limits and same saving as before; 26 new tests.
- **Editor of the tier plan of the data lake, in the Telemetry panel (administrators only):** a table of levels (kind, field, raw time, rollup width, narrow rollup width and the two retentions) that reads the plan through the server and saves it with a check first. The rules are strict and are the data lake's own, applied while typing: the rollup width is not longer than the raw time, no retention is shorter than the raw time, the narrow retention is not longer than the rollup retention, the narrow width divides the rollup width, no level is listed twice and every kind exists in the data lake. Each problem is written next to its cell in the eight languages and Save stays disabled while there is one; the data lake has no option to relax the rules, so the screen has none either. Saving asks the data lake what it would do (nothing is written), shows the effects, and asks for a confirmation that sends the hash that was read, so a plan changed by somebody else is refused with an offer to read it again. The control that turns real deletion on is disabled, with its reason, unless the operator started the data lake with that option; it has its own red confirmation. The mode now and the latest changes are shown.
- **The README shows screenshots of Studio** (overview, robot view, XY table, Flasher Studio, Tester Center and safety limits), taken with made-up sample data by `tools/capture_screenshots.mjs`; the list and the captions in the eight languages are in `docs/screenshots.json`.

## [0.8.1.0] - A check of the trajectory before Play, an audit record that filters by who and from where, trusted networks and the gateway switch in Server Admin, a map of the ecosystem and a refused home pose that says so

- **A check of the trajectory before Play:** a switch in the trajectories tab (off by default, kept in this browser) makes START show the path from above, from the side and from the front first, with the joints that are outside the limits of the model and the steps that swing a joint too far, and ask before it plays. The largest step, the tolerance of the limits and the size of the views are in `src/config/trajectoryPreview.json`; texts and help in the eight languages.

- **The audit record screen narrows by who and from where:** besides the type and the robot, it filters what it read by account, window, address and text, has an *Only mine* button, knows every kind of entry the server writes (global stop released, robot enabled or disabled, bridge commands, job dispatcher options and reload, notification devices, remote access policy) and can read the record again by itself (off by default; the interval is in `src/config/auditView.json`).

- **Trusted networks in Server Admin:** a new option, off by default (locked when the environment of the server fixes it), that makes the server refuse to be administered from outside the house network and the VPN; the ranges and the policy for the outside stay in the configuration file of the server. It speaks the eight languages and warns once it is saved.

- **A refused HOME / RESET says so:** when the server will not send a robot home (the pose is not the home pose of its model, or a joint would leave its range) the banner says the robot did not move, in the eight languages.

- **A map of the ecosystem:** Ecosystem > Map of the ecosystem draws every project that the server finds next to it, grouped by family, one tile each with its version, port, maturity and a state (up, error, down, unknown) from the scan and the probe of `GET /api/ecosystem/status`, with the totals as filters, a search box and a mark on the project whose version differs from its manifest when the health of the ecosystem is on. Read only, no new route; eight languages.

- **The switch of the gateway to the machine bridges:** Server Admin shows the new option `bridgeGateway.enabled` (off by default; locked when the environment of the server sets it) with a warning when it is turned on, in the eight languages.

## [0.8.0.9] - One guard for every motion command, the store cut in five domains, local and global settings by role, the robot screen cut in parts, a chip with the state of the reload of the job dispatcher and TypeScript 7

- **The state of the reload of the job dispatcher in Server Admin:** next to the replanning options a chip says what came of the request to read the dispatcher file again (pending, applied, failed or not configured), read from `jobDispatcher.replan.reload`, in the eight languages; while the request is pending the screen asks the server again every two seconds.
- **One guard for every motion command:** Sim mode, the size of a jog, the size of a table move and a single step that swings a joint a long way are decided in one module (`lib/motionGuard.ts`) that the provider, the robot screen and the gamepad all use, so the order and the sentence of a refusal are the same everywhere; a stop is never refused.
- **The store is cut in five domains** (session, command feedback, link status, settings, fleet), each with its own hook, stable functions and its own context: a screen that reads one domain no longer draws again when another changes (a joint moving no longer redraws the login gate). `useHydraStore()` still gives the whole value.
- **Local and global settings:** the theme, the language and the layout of the panels (the keys are in `src/config/localSettings.json`) are a choice of the person in front of the screen: an operator or a viewer changes them, they stay in this browser under that account and are put over what the server sends. Every other setting belongs to the installation: only an administrator changes it, and for anyone else the change is refused with a sentence of its own (the server refuses it as well).
- **One table of joint ranges and home poses:** `src/data/kinematicData.json` is read by this program and by HYDRA-UMC-SUITE instead of two tables typed by hand; a test compares it with the constants of every model and, when both repositories sit side by side, with the copy of SUITE.
- **The robot screen is cut in parts:** the camera window, the configuration tabs and the table of points are components of their own, held in place by tests of the rendered screen; a work-file list that is not a list no longer breaks the configuration tab.
- **TypeScript 7:** the type checker is the native TypeScript 7 compiler; the typecheck, the lint, the 782 tests and the production build pass with it.

## [0.8.0.8] - A Planning and operation view under Ecosystem and the job dispatcher options in Server Admin

- **A Planning and operation view under Ecosystem:** the dry run of a plan (the answer is shown only if it says that nothing was executed), the estimates of the job dispatcher with their ranges, the remaining useful life of a series of scores typed or pasted, a reader of the output of `train plan --json` of the updater (read from a file, only shown) and the state of the window statistics of the data lake. Each function says so when its service has the switch off. Eight languages.


- **The job dispatcher options in Server Admin:** a card with the switch and the robot map (one `id = number` per line) of the delivery of the stop requests and the two options of the replanning (send a job back to the queue without a confirmed stop, seconds to wait for it), in the eight languages. The replanning part is read only when the server was not told the configuration file of the dispatcher, and switching the delivery on or allowing a job to move without a confirmed stop asks for a confirmation first.


## [0.8.0.7] - The 3D models from one downloadable package instead of the repository tree, a view of the health of the ecosystem and switches in Server Admin for it and for the remaining useful life relay

- **A switch for the remaining-useful-life relay in Server Admin:** the security screen gets the `rul.enabled` option (off by default, locked by the environment like the others) that lets operators use the remaining-useful-life estimate of the AI dashboard through the relay of the server; without it only an administrator can. Texts in the 8 languages; tests in `tests/serverSecurity.test.ts`.
- **The 3D models leave the repository tree:** the 847 meshes shared with HYDRA-UMC-SUITE (221 MiB) are fetched, on the first `npm run dev`, `npm run build` or `npm test`, from one verified package (SHA-256 pinned in `meshes.pack.json`, published in HYDRA-UMC-MESHES) into `public/models/`, and the source defaults to `auto`. The package is kept in `~/.cache/hydra-umc/meshes` (or `HYDRA_UMC_MESH_CACHE`) and reused; without a network, copy it there or give its path in `HYDRA_UMC_MESH_PACKAGE`, and a failed download says exactly that. The tests fetch the models once before the suite and the CI downloads and verifies every mesh (with the package cached between runs) before the type check, the tests and the build. The 167 `.glb` files only STUDIO has stay in the tree. A zip of the repository no longer carries the models. See `docs/MESH_PACKAGE.md`.
- **A new view, Ecosystem health:** under Ecosystem, one card per service of the ecosystem with its state (ok, degraded, down or unknown), the reason in plain words, the version it reports against the version expected (marked when they differ) and how long since it last answered, filters by state and by version drift, and notices when the TLS certificate of the server is about to expire, has expired or cannot be read, and when a service is down, degraded or reports another version than its manifest. It reads the new `GET /api/ecosystem/health` of the server, so an operator or an administrator can open it; a server that does not offer the route, or where an administrator has not turned it on, gets a plain sentence instead, and a service that does not answer never hides the others. The screen shows no port, address or unit. The switch for it is in Server Admin (administrators only, off by default, locked when the server fixes it). Texts in the eight languages; new `tests/ecosystemHealthApi.test.ts` and `tests/ecosystemHealth.test.tsx`.

## [0.8.0.6] - Two more security switches in Server Admin and the meshes from one downloadable package, off by default

- **Two more security switches in Server Admin:** a new "Installation and camera passwords" card lets an administrator keep the password of an IP camera out of the command line of its process (`camera.credentialsViaEnv`) and let a new installation switch TLS on by itself (`install.newInstallTls`). Both start on the safe side, show where their value comes from, are locked when the server environment fixes them, appear only when the server offers them, send only what changed and ask before lowering the protection. Texts in the eight languages.
- **The meshes can come from one downloadable package:** `meshes.pack.json` pins the SHA-256 of a package and of every mesh shared with HYDRA-UMC-SUITE, and `node scripts/mesh_pack.mjs` (`npm run meshes -- status | check | ensure | prepare`) can bring `public/models/` to that state. The source is chosen in `mesh_pack.config.json` or with `HYDRA_UMC_MESH_SOURCE`: `local` (the default, nothing changes and nothing is downloaded), `auto` (the local meshes are used when all are present, only the missing ones are fetched) or `download` (every mesh is checked by its hash). A package that does not match installs nothing; only `https` addresses are accepted. `npm run dev` and `npm run build` run the silent `prepare` step first. Messages in the eight languages; covered by `tests/meshPack.test.ts`. See `docs/MESH_PACKAGE.md`.

## [0.8.0.5] - Four more security switches in Server Admin

- **Four more security switches in Server Admin:** a new "Exposure and logs" card lets an administrator open the camera pictures without a ticket, accept a token in the WebSocket address, stop blanking secrets in the log and require a verified signature on a confirmed spoken request. All four start on the safe side, show where their value comes from, are locked when the server environment fixes them, appear only when the server offers them, send only what changed and ask before anything that lowers the protection. Texts in the eight languages.

## [0.8.0.4] - The history of connections in Connected Apps, two more switches in Server Admin, safe mode of a robot, the routes the app calls fixed by a test and the unit of the meshes declared by each model

- **The routes the app calls are fixed by a test:** `tests/restPaths.test.ts` lists every server route used by the sources in `tests/fixtures/rest_routes.json` (a route can only be added or dropped on purpose) and, when the shared contracts sit next to this repository, checks that each one exists in the server contract.
- **Portuguese wording aligned with SUITE:** the camera library reads "multimédia" instead of "media" and the CPU is masculine ("Carga do CPU").
- **Two more switches in Server Admin:** whether `GET /health` answers without a sign-in (off by default; opening it asks first) and whether the server announces a global stop on the MQTT bridge (off by default). Each shows where its value comes from, is locked when the server's environment fixes it, and appears only when the server offers it. Texts in the eight languages.
- **Connection history in Connected Apps:** under the list of live connections, a simple view of who has signed in to the server: the clients it has seen (kind, user, version, local or from outside, the sessions open now, the sign-ins that worked or were refused) and the latest sign-ins, refused sign-ins, sign-outs and ended sessions, read from the connection routes of the server. It says so plainly when the server is too old to offer them. Studio now names itself to the server in the sign-in (`X-Hydra-Client`). Server Admin has a switch to keep the address and user agent of each client in that history (off by default, asks before turning it on, locked when the environment fixes it). Texts in the eight languages.
- **Safe mode of a robot:** the robot bar has a Disable button (the robot stops, its valves and pumps go off and the server refuses everything but STOP; a `Safe mode - disabled` badge shows it) and, for an administrator, an Enable button that asks first. The server keeps enabling off by default, so Server Admin has a new switch (`Allow a client to enable a robot that is in safe mode`, with a confirmation before it is turned on); a refused command says in its own sentence why (robot disabled, enabling not allowed, administrator required), in the eight languages.
- **The unit of the meshes is declared by each model:** the `metadata.json` of every model in `public/models` says `mm` or `m`, the same declaration that SUITE and the URDF editor read.

## [0.8.0.3] - Two-step sign-in screens, numbered motion commands and three more switches in Server Admin

- **Two-step sign-in screens:** Server Admin has a Two-step sign-in card for the signed-in account (it is off until its owner turns it on): the password, then a QR code of the otpauth address and the key to type by hand (the QR code is drawn by a small encoder in src/lib/qrCode.ts, no extra package), the first code, and the ten one-time recovery codes shown once. Turning it off asks for the password and a current or recovery code. The sign-in form asks for the code when the account has the second step on, and Config > Users has a button that removes the second step of an account that lost both the phone and the recovery codes. In the eight languages; 22 new tests.
- **The motion commands are numbered:** every jog, table move, joints command and stop this window sends carries a `seq` that grows with each command and follows the clock (`src/lib/commandSequence.ts`), so a server that orders them refuses a jog that reaches the robot after a stop sent later than it. When the server refuses one as out of order, the window says so in its own text in the eight languages instead of reporting that another operator holds the robot. A server that does not know `seq` ignores it. 6 tests.
- **README in the universal layout:** the README and its seven translations follow the layout that the four families share (22 sections in a fixed order), with an architecture picture and a repository-structure picture drawn from `docs/architecture.json` and `docs/structure.json`; the CI validator checks both pictures and the file tree.

- **Server Admin has three more switches:** whether a voice reply repeats what was said, the least confidence of the speech recognizer before a request that starts a movement is accepted, and the MAVLink 2 signing key file with the switch for unsigned messages. Each shows where its value comes from (the environment of the server wins and locks the field), asks for a confirmation before the protection is lowered, and explains itself in the eight languages. The defaults are the conservative ones. Tested.
- **The layout of the README is checked in the CI:** the validator runs `tools/universal_readme_check.py` and lists, as a warning, what differs from the universal layout of the README.

## [0.8.0.2] - Server Admin sets up the MQTT bridge of the server and the frames of a slot are named

### Firmware and protocol

- **The frames of a slot are named.** `SLOT_FRAMES` in `canOta.ts` lists the offsets of the relay (requests +0x10/+0x13, answers +0x16/+0x18, the status poll +0x17) and of the bootloader (acknowledgements, signed header, downgrade token) inside the 0x20 window of a slot, as the firmware has them now that no identifier has two emitters; a test keeps them distinct and inside the window.
- **Users can be read-only.** Config > Users offers the `viewer` role (it reads and changes nothing), in eight languages; a viewer's session never sends the settings tree.
- **Signed firmware flashes.** The flash sends the patch of the image version, its Ed25519 signature (from the manifest or the `.sig` file next to the image) and, when the image is older than the installed one, the installed version, as the bootloaders of the HYDRA-UMC boards require. Tested.

### Programs and windows

- **An operator's edits of a robot are saved.** The recorded points, the repeat flag, the model, the role, the robots it is combined with, the layout of the XY table and the joint sliders are sent to the server as commands (`points`, `loop`, `model`, `role`, `combine`, `xyTableConfig`, `joints`) instead of only inside the settings tree, which the server takes from an administrator alone: they are no longer lost for an operator, and two windows no longer overwrite each other's edit (the newest edit of a kind waits for the one on its way). What no command covers still travels in the tree, a robot in Sim keeps the joint edits in the window, and a server without the commands gets the tree as before. The XY table jog buttons of its panel use the table command.
- **Config > Models lists the models the editors submitted.** `GET /api/models` (sent with the session token, so a server that asks for a sign-in on it answers) shows the name, category and date of each model the URDF and STL editors submitted, and a button saves the URDF of one under a plain file name (the meshes stay on the server). A server that refuses, fails or does not answer says so; an entry that is not a model is skipped. In the eight languages, 6 new tests (610 in all).
- **An operator no longer gets a "Save failed" after every edit.** The server takes the whole settings tree (POST /api/settings) only from an administrator, so every camera view, recorded point or panel width an operator touched was sent, refused with a 403 and shown as a pulsing "Save failed - Retry". An operator's edits of the tree now stay in the window, nothing is sent, and the header says once, in the eight languages, that they are not saved on the server. The robot commands (jog, play, stop, speed, table) are unchanged: they go through the atomic route that an operator may use. 5 new tests, one of them with the real provider against a fake server (604 in all).
- **Server Admin: the Bluetooth LE options.** A selector for what the Bluetooth service of the server does (off, phones read the state, or phones also send commands) and a switch for the encrypted link it asks for by default, with where each value comes from and whether the running server still has the old one. Allowing commands without an encrypted link asks for a confirmation (the access token of the account travels in every command) and the answer of the server carries a warning that stays on screen. A server that predates the service shows no section. In the eight languages; 3 new tests (600 in all).
- **Conditional writes.** Every reservation, release and robot command carries the revision of the robot this window last saw (`If-Match`, read from the answers of the server and from `GET /api/robot/:id`). When someone else changed the robot in between, the server answers 412: nothing is applied, the robot is read again so the screen shows what it is now, and the banner says so in the eight languages. STOP is never conditional, a write is not conditional while another write to the same robot is on its way, a renewal of one's own reservation and a take-over are never conditional, and saving the whole tree from this window forgets the revisions. A browser setting (in the reservations list of the access bar) chooses Standard (reservations, the table and the one-off commands; the default), Strict (everything but STOP) or Off.
- **New Ecosystem > Audit record screen (administrators only).** Reads `GET /api/audit`: filter by type and robot, the newest lines first with the account, window, address, robot, outcome and detail, export of the lines as stored (`.jsonl`), and a chain check that is done twice: by the server over the whole record (`?verify=1`) and in the page over what it was given (every SHA-256 is computed again and every pair of neighbouring lines must be linked). Says why when it can not read (not an administrator, older server, record switched off or locked off). Texts in the eight languages.
- **Session lasts as long as the tab by default.** A login typed into the page is kept in sessionStorage (with its refresh token); the new sign-in option **Keep me signed in on this device** keeps it in localStorage across browser restarts. An older saved login keeps working. Texts in the eight languages; tests for both storages, switching between them and sign-out.
- **Content-Security-Policy in the production page.** The build adds a policy as a meta tag (scripts only from the page itself, no inline scripts, no plugins, restricted base and forms). `HYDRA_STUDIO_CSP=off` omits it and any other value is used as the policy. The dev server is unchanged. Tested.
- The header, the sidebar, the settings, the About window, the robot panel and the messages kept by the store (save, factory reset and login failures) no longer contain English-only sentences: they come from the eight language catalogs, and a test fails if a literal sentence, tooltip or accessible name appears again in those files.
- Fixed the module panels in every language but English: "No {machineType} Assigned" and "Enable {machineType}" showed the braces as typed because the catalogs used a single-brace placeholder, and the CNC and laser panels filled it with the internal id instead of the machine name.
- Only English ships with the first screen; the other seven catalogs are fetched when a language is selected, so the main bundle drops from about 739 kB to about 283 kB.
- The confirmation dialog is now also described by its message for screen readers, and there are component tests with a real DOM (jsdom and Testing Library as development dependencies) for its roles, focus handling and keyboard behaviour.
- Each window has its own controller id (kept for the life of that window, 1 to 64 letters, digits and `. _ : -`) and sends it with every reservation, release, jog arming and robot command. The same account on another window, another account, and a reservation that names a controller when the request names none are now told apart (`other-controller`, `other-account`, `controller-id-required`) and shown with their own sentence in the eight languages instead of one generic "held by another operator".
- New access bar under the name of each robot: reserve it for this window, release it, see who holds it and for how long, and, for an administrator, take it over after confirming. A reservation held by this window is renewed while it is kept. The list of every reservation (`GET /api/claims`) opens from the same bar.
- New **Ecosystem > Safety limits** screen (administrators only): relative and absolute jog and bed temperature by model, whether the jog has to be armed and for how long, and whether a reservation has to name its controller. Every number is checked against the ceilings the server reports before it is sent, and the server checks again.
- Optional arming of the jog: when an administrator turns it on, the access bar shows an **Arm jog** button with the seconds left, and a jog refused for lack of arming offers the same button in the banner. It is off by default.
- A trajectory (a Work or an example) whose points the arm cannot reach no longer goes to the server: each point is measured (the distance between the pose asked for and the pose the joints really give) and, when any is further than the tolerance (5 mm by default), the trajectory is refused and the dialog lists the points that are out of reach with their distance, and offers to scale the trajectory about the base of the robot to the reach of the model (the largest factor at which every point fits, or the one that leaves the fewest outside), or to reject it. The tolerance next to the Works selector stays the operator's to set.
- New **Live / Sim** switch for each robot, Live by default and kept in the browser (a browser can also start the robots it has no choice for in Sim): in Sim, nothing that moves the robot or switches something on (jog, play, reset, tool, valves, pumps, loading a trajectory and changing the speed) leaves that window, and the banner says so; STOP, pause and the harmless settings still go through.
- A new Help guide and assistant answer, in the eight languages, explain reserving a robot, Live / Sim, the arming of the jog and where the limits are set.
- Switching the heater of the heated bed on (the 230 V solid-state relay, in the Kinematic Brain Stage and in the heated bed screen) asks first, in the eight languages; switching it off never asks. The endstops of the Kinematic Brain Stage are shown as the inputs they are (triggered or open) instead of buttons that write them.
- The confirmation dialog can show extra content under its message and leave only the cancel button. Texts in the eight languages; 61 new tests, among them the access bar, the limits screen and the heater confirmation rendered against a fake server.

### Tests, builds and checks

- **The classic UR3, UR5 and UR10 put the wrist where the real robot has it.** The lateral offset `d4` of a UR arm is split in the URDF between the shoulder joint, the elbow joint and the step from wrist_1 to wrist_2; the chains put `d4` itself in that last step as well, which moved the wrist 27 mm (UR3), 16 mm (UR5) and 49 mm (UR10) sideways, in the 3D view and in every Cartesian value. The step is now `d4` minus the other two offsets (0.08505, 0.093 and 0.1149 m), written from the official DH table that each chain file now carries. `tests/urClassicChains.test.ts` checks the link lengths and the sum of the lateral offsets against that table and the tool position at three poses against the reference values HYDRA-UMC-SUITE holds for the same robots (it fails on the old chains).
- **The XY table moves with the atomic `table` command.** The sliders of the table send one absolute move to the position they reached, the gamepad sends a relative one; the whole move is checked against the limits of the model before it is sent (the server checks again and applies all of it or none of it), a robot in Sim does not receive it, and a server that predates the command is detected and gets the jogs that did the same before.
- The README counters follow the suite (589 tests) and the file tree lists the new files, in the eight languages. 42 new tests: revisions and the reservation calls with `If-Match`, the table move and its limits, and the audit chain (intact, changed, removed, filtered, rewritten).
- **Reservations arrive live**: the connection (which already asks for `remoteApiVersion=2`) takes the `claims` message the server pushes when a reservation or an arming changes (`lib/claimsFeed.ts`), and the access bar shows it at once, including when the jog is armed, instead of waiting for its next poll of `GET /api/claims`; the poll only runs now and then while the pushes arrive. The test counters of the README follow the suite (547).
- CI builds the production page (`npm run build`) next to the type check, the tests and the lint (oxlint), so a break of the bundle or of the policy injection is caught before a release.
- Building no longer changes the version; raising it is the explicit `bump` command (`python tools/hydra_project_tool.py bump`). The build scripts only report the version they built, and CI fails if a build script runs a bump.

### Documentation

- **Server Admin sets up the MQTT bridge of the server** (off, publish the state, or publish the state and carry out commands; broker address, topic prefix, user name and the account that carries the commands out), in eight languages. The passwords are never entered here (the server reads them from its environment), a value fixed by the environment is shown as locked, and turning commands on asks for a confirmation first. It applies when the server restarts.
- Server Admin (administrators only) now shows and changes the access options of the server: who may use the local AI relay (any signed-in user or administrators only), whether the host information asks for a sign-in, and TLS with the paths of the certificate and key and the SHA-256 fingerprint of the certificate in use. A value that the server's own environment fixes is shown as locked, turning the sign-in requirement off asks for confirmation and shows a warning, and TLS says that it applies on the next restart. Texts in the eight languages; a server that predates these options simply does not show the section.
- Changing the model of a robot asks for confirmation before it is applied (its kinematics, limits and 3D view change with it), like the tool change already did; message in the eight languages.

### Other changes

- The size of a jog, the range of an absolute jog and the hottest heated-bed target are read from the server (`GET /api/safety-limits`) instead of being kept in the app: a jog step above the limit of the model is refused before it is sent, with the limit in the message, and the bed target fields follow the ceiling of the model. The built-in 150 degrees ceiling is gone; until the server answers, the conservative defaults of the server apply.
- The remarks of the server are shown in the user's language: a jog it did not apply (with the server's explanation) and a bed target it lowered to the ceiling of the model.

## [0.8.0.1] - Token in the fragment, accessible dialogs and confirmed tool changes

- The banner follows the animated style of the ecosystem banners, with the name, the kind and the technologies of the project.
- Added `tools/hydra_project_tool.py`: the same `validate`, `test`, `version`, `status` and `bump` commands in every repository. The checks run with `HYDRA_UMC_CI=1` and fail if the version changes; only `bump` changes it.
- A token that arrives in the launch address is read from the fragment (`#token=`), which a browser never sends to a server and no proxy or access log records; the query form (`?token=`) is still read for an app that has not moved yet. Either form is removed from the address bar as soon as it is read (`extractLaunchToken`, six new tests).
- The live connection of the page no longer falls back to `/ws?token=`: the token travels only as the `hydra.bearer` subprotocol, which every server since the subprotocol was added answers and which the server now requires (it refuses the address form by default). A server that does not answer it is reported as a failed connection instead of being handed the token in the address.
- Every icon-only button that had a tooltip now also has an accessible name, and a test keeps it that way.
- Confirmation dialogs are announced as dialogs, close with Escape, keep the keyboard focus inside while open, start on the safe Cancel button and give the focus back when they close.
- Changing the tool of a robot asks for confirmation before it is sent, like going home, resetting and deleting points already did (message in the eight languages).

## [0.8.0.0]

- Maturity is functional: nothing here has been verified on real hardware yet.
- The READMEs say, in the eight languages, what is planned and what has only been tested against fakes, emulators or fixtures, and carry a short safety and security status note.

## [0.7.9] - One-click global STOP

- **Global STOP:** a red **STOP** button in the header (and the footer, the robot panel and the remote-control overlay) stops every robot of every controller, whichever one is selected, and switches every valve and pump off, with one click and no confirmation. It calls `POST /api/stop-all` at once, with the session's bearer token and without waiting for any refresh; any signed-in account (admin or operator) can use it, and a reservation held by another account never blocks it.
- **Keyboard:** `Ctrl+Shift+Space` presses STOP from anywhere, even with a text field focused. It is a modifier chord that is never typed by accident and is ignored while the key is held down; it is shown in the button's tooltip, the help and the assistant.
- **The result, robot by robot:** a panel lists each robot (stopped or not, valves and pumps switched off, the reason when it failed, "reserved by ..." when another account holds it), turns into a persistent red warning when a robot did not stop or the server could not save the stop, offers a retry, and fades by itself when everything went well. The settings are read again afterwards.
- **A stop that gets through:** a network failure is retried once with a short timeout, an expired session is renewed once, and a server over its rate limit (429) or without the route (404) is answered with the per-robot stop of every robot. When nothing answers, the "STOP not confirmed" warning stays on screen until a later STOP gets an answer.
- **The old E-STOP buttons:** the robot panel's E-STOP (and the overlay one), the gamepad actions `E-STOP` and `E-STOP ALL` (saved mappings keep working) and the retry button of the warning all make the same global call; the per-robot START/STOP control is unchanged.
- The STOP texts, the help and the assistant's answers in the 8 languages; 13 new tests (286 in all): the request without a body and with the bearer token, the reading of the answer, the 429/404 fall back, the expired session, the single retry, the timeout and the keyboard chord.

## [0.7.8] - Commands that report their result, an E-STOP that acts at once, and safer jogging, flashing and imports

- Every robot command (jog, play, pause, stop, tool, valve, pump, speed, vision, power, trajectory) now returns a typed result. An expired session is refreshed once and the command retried; anything still refused (not signed in, not allowed, robot claimed by another client, server error, no network) appears in a banner instead of failing silently.
- The **E-STOP** buttons (robot panel, top bar, gamepad) act immediately with no confirmation: they stop the robot, switch its valves and pumps off, retry once on a network failure and keep a persistent warning if the stop could not be delivered. They no longer mark the robot offline.
- Joystick jogging is a held (deadman) control: it ends on pointer cancel, window blur, a hidden tab or after 8 seconds. A J1 move keeps the nearest equivalent angle, and a jog step above 20 degrees is refused with a message.
- The gamepad drives the robot selected in the interface (the dashboard shows which one), is rate limited with a cap on unanswered commands, clamps the speed to 10..500 and stops when the tab is hidden.
- The debounced settings save builds its payload when it fires, so a change made while a save is pending is no longer lost; the session token is kept per tab, and the WebSocket falls back to the query-string token only when the server answers over HTTP.
- CAN-OTA: the release image is checked against its sha256 before flashing, bootloader images are opt-in, flashing is blocked while the robot is playing, the transport selection is bound to a hardware confirmation, and a failed flash shows its own message. Simulated version queries are never persisted.
- Imported trajectories and scenes are validated (shape, finite numbers, at most 5000 points and 16 robots, unique ids) before they reach the shared state; a refused file reports why.
- HOME, RESET and deleting recorded points ask for confirmation; a point added from the panel or the gamepad keeps its motion type; playback speed uses a step of 5; the heated bed target keeps 0 and is limited to one maximum.
- Camera: the connection retry polls the real status, and the download link of a saved recording carries a fresh ticket. The default cameras no longer seed invented detections.
- The Help and assistant texts no longer describe buttons that do not exist (Auto-Search, Add Robot, Config > Bluetooth), name the Resources menu correctly, and no longer claim the transfer is verified with an HMAC.
- Build scripts stop on the first failing step and no longer run `npm audit fix` or approve install scripts; `.vscode/`, local backups and the Bun lockfile are ignored and untracked, and `public/settings.json` is no longer tracked. `package.json` declares Node 22 or newer.
- Code: the arm joint chains moved to `src/components/3d/chains/`, the provider to `src/HydraProvider.tsx` (state, types and defaults stay in `src/store.ts`), and small helpers to `src/lib/`, which clears every lint warning.
- Tests: 273 across 26 files (jog safety and continuity, command results, session handling, jog repeater, sha256, CAN-OTA download checks, playback step, import validation, the API base).

## [0.7.7] - Help with step-by-step guides, the Hydri assistant, Portuguese, and safer camera, token and flasher behavior

- New **Step-by-step guides** tab in the Help window: 14 guides (controllers, robots, jog, emergency stop, trajectories, tools, cameras, flashing, gamepad, users, language, remote access, server, security), each with a level (basic, advanced, technical), a search box and a button that goes to the screen where the task is done.
- New assistant **Hydri** (`src/assistant/`): an animated mascot that explains the current screen, walks through a task one step at a time, answers typed questions in any of the 8 languages with no server and no model, can read answers aloud with the browser's voice, can be dragged anywhere, pinned and put away; its preferences are kept in the browser and edited from the Help window.
- **Portuguese** added: `src/locales/pt.json` with every key of the other languages, a language option in Config > UI & Themes, and a `README_por.md`.
- The Help text about the default account and the CAN-OTA transport matches what the server does now (development `admin`/`admin`, production bootstrap with no example values; the hardware transport exists).
- The Flasher no longer hides that it is simulating: while the CAN-OTA transport is the simulated one it shows a fixed SIMULATION banner, and a simulated flash never writes the new firmware version into the board's saved state or into what every other client sees.
- The session token passed as `?token=` is removed from the address bar after it is read, and the WebSocket sends it as the `hydra.bearer` subprotocol (falling back to the query string against a server that does not answer the subprotocol).
- The live camera streams and the saved photos and recordings carry a short-lived `?ticket=` (`POST /api/camera/ticket`, renewed before it expires), so they keep working on a server that demands one (`HYDRA_UMC_CAMERA_AUTH=required`); a recording being played is not restarted by a renewal.
- The kiosk power buttons of the login screen and the deletion of a camera file ask through the in-app confirmation dialog instead of `window.confirm()`, which a kiosk browser or a WebView can disable.
- The assistant floats below the modal windows (Help, Config, About), so its bubble never covers their buttons.
- Tests: the assistant (all 8 languages of every task, every sample question finds its own task, steps numbered alike in every language, bubble placement), the ticket helper, and the locale catalogs now include Portuguese (212 tests).

## [0.7.6] - A TLS-enabled server would have been mixed-content-blocked

- **Real bug, found reviewing this app for the same TLS rollout that fixed HYDRA-UMC-ANDROID-CONTROL:** in STUDIO's own default same-origin deployment (this app's static files served BY HYDRA-UMC-SERVER itself), `apiBase.ts`'s production fallback hardcoded `http://` for every `fetch()`/WebSocket call regardless of the scheme this exact page was loaded over. HYDRA-UMC-SERVER's optional `TLS_CERT_PATH`/`TLS_KEY_PATH` (server.ts) makes that page load over `https:` - every one of those calls would then be a browser-blocked mixed-content request, not just a wrong-looking URL. `defaultProdBase()` now matches `window.location.protocol`; a plain-HTTP deployment (today's default) is unaffected. `wsUrl()` already derived `ws:`/`wss:` correctly from `API_BASE` - only the API origin itself was wrong. 2 new tests (`tests/apiBase.test.ts`).

## [0.7.5] - Motion source badge

- The robot detail header now says whether the drawn pose is offline, simulated (no tool controller connected, the machine does not move) or live, in all seven languages.

## [0.7.4] - A saved per-part color now reaches the live 3D viewers, not just HYDRA-UMC-EDITOR-STL's own preview

The separate HYDRA-UMC-EDITOR-STL tool already saved a real per-part
color annotation (`part_colors.json`, one sidecar per model folder) next
to a model's own STL parts, but nothing here ever read it back - a color
picked there never appeared in this app's own robot/heated-bed/vacuum-
table/rack/LumenPnP 3D views. Every real STL-loading component across
those 5 categories (17 files) now fetches that same sidecar (a new
`hooks/usePartColors.ts`) and overrides its own per-part material color
when one is saved - never a synthetic default when the sidecar simply
doesn't exist yet.

## [0.7.3] - Robot joint rotations now smoothly interpolate at 60fps, decoupled from telemetry rate

Every 3D robot model's joint rotations (all ~26 model-specific
components, via the shared `RobotArm.tsx` dispatcher) used to bind
directly to the raw telemetry-driven `robot.joints` value with zero
interpolation - a robot updated at whatever rate telemetry actually
arrives (well under 60fps) visibly snapped between poses instead of
moving smoothly. `RobotArm.tsx` now owns one smoothed copy of `joints`,
advanced toward the real target every render frame via a genuine
`useFrame` loop (decoupled from telemetry's own update rate), with
shortest-path angle interpolation (`lerpAngleDeg`, 5 new tests) so a
wrap-around like 350°→10° takes the real 20° step, never the long way
around. Snaps immediately, no slide, the moment `robot.id` changes
(a genuinely different robot, not the same one moving).

## [0.7.2] - A real recording player (play/pause/stop/seek), permanent delete, and a manual live-stream retry

- Camera Media Library used to render a saved recording with a plain
  `<img>` - since a recording is raw multipart/x-mixed-replace bytes,
  not a real video container, that "played" automatically with zero
  controls (no pause, no seek). New `MjpegRecordingPlayer.tsx` fetches
  the whole file once, parses it into real per-frame JPEG Blobs
  (`lib/mjpegParser.ts`, 4 new tests), and steps through them under its
  own control - real Play/Pause/Stop and a real seek bar, showing real
  elapsed time when the server's own new recording metadata
  (durationMs/frameCount) is present, honestly falling back to "frame
  N / M" for an older recording saved before that metadata existed.
- New Delete button (with a confirmation prompt) permanently removes a
  selected snapshot or recording via HYDRA-UMC-SERVER's own new `DELETE
  /api/camera/media/:cameraId/:kind/:filename`.
- Vision Center: a live stream stuck retrying after 3+ consecutive
  failures (e.g. from a server restart the tab was already open for)
  now shows a real "No image - retry now" button that forces an
  immediate fresh attempt instead of only ever waiting out the backoff
  timer or needing a full page reload.

## [0.7.1] - Real bugs found via live testing: recording indicator could get stuck, Robots catalog layout swapped

- `toggleRecording()`'s own `recordingIds` could show a camera as
  recording after clicking Stop with no visible effect, if the
  recording had actually already ended server-side for an unrelated
  reason (see HYDRA-UMC-SERVER's own CHANGELOG for the exact stop-race
  bug this closes on that side too) - a failed stop/start attempt now
  re-syncs from the server's own real `GET /api/camera/media` instead
  of silently leaving the stale local guess on screen, and the panel
  also re-syncs every 10s on its own so a recording that stops itself
  (camera/stream dropping) is reflected without needing to navigate
  away and back. Failures now show a real, dismissible error message
  instead of failing silently.
- `RobotsCatalogView.tsx`'s 3D preview and filter/list panel are now
  swapped (3D on the right, filters/list on the left) per the project
  owner's own preference after seeing the shipped layout.

## [0.7.0] - New Robots catalog menu, with a real per-model activate/deactivate switch

- New **Robots** menu (first item under Industrial) - `RobotsCatalogView.tsx`
  lists every real robot model this ecosystem has kinematics/mesh support
  for (`REAL_ROBOT_MODELS`, store.tsx - the same 24-model set the Config
  tab's own model picker already offers), filterable by manufacturer and
  DOF, with a real 3D preview of the selected model on the left (the same
  `RobotArm` dispatcher every live robot uses, fed a minimal synthetic
  preview state at zero joints - never registered or sent to the server).
- Each model has a real **activate/deactivate** toggle
  (`settings.enabledRobotModels`), and the Config tab's own model picker
  now actually respects it via the new `isModelSelectable()` - a
  deactivated model disappears from the picker's `<option>` list, except
  it never hides a robot's own CURRENTLY assigned model out from under it
  just because it was deactivated afterward. An unset/missing
  `enabledRobotModels` (no visit to the new panel yet, or a settings.json
  saved before this feature existed) reads as "everything enabled" -
  matches this ecosystem's own "old settings.json keeps working
  unchanged" convention for optional settings fields, no migration
  needed.
- All 7 languages: new `robotsCatalog.*` keys.

## [0.6.9] - About dialog shows both real versions; Config dialog made taller

- The About dialog's single "Version" row only ever showed
  HYDRA-UMC-SERVER's own `appVersion` (from `GET /api/hydra-info`),
  generically labeled enough to look like this app's own version - a
  STUDIO/SERVER version mismatch after deploying one without the other
  was invisible. Now shows both, separately labeled: **Studio Version**
  (this build's own real `package.json` version, imported directly - the
  same value `bump_manifest_version.py` keeps in sync with
  `hydra-umc.project.json`) and **Server Version** (unchanged, still from
  `GET /api/hydra-info`).
- The Config dialog was a fixed 750px tall - real bug on the Gamepad tab,
  where `BluetoothPairing`'s own scan/pairing list routinely had more
  entries than that height could show without scrolling mid-list,
  clipping/hiding real device rows. Grown to 1000px (capped at 95vh on
  shorter screens) - `BluetoothPairing.tsx` itself needed no change,
  since its content already lives in the dialog's own scrollable body.
- All 7 languages: `about_version` split into `about_version_studio`/
  `about_version_server`.

## [0.6.8] - Real camera snapshots/recordings, and a new Camera Media library menu

- Vision Center's photo/record buttons only ever flipped local UI state
  (a flash animation, a red REC dot) with no backend call behind either -
  nothing was ever actually saved, and navigating away from Vision Center
  reset that local state regardless of what a real recording would have
  been doing server-side. `toggleRecording`/`takePhoto` in `CamerasView.tsx`
  now call HYDRA-UMC-SERVER's new `POST /api/camera/:id/snapshot` and
  `POST /api/camera/:id/recording/{start,stop}`, and `recordingIds` syncs
  from the server's own real `GET /api/camera/media` on mount instead of
  starting empty every time - since the recording itself now lives
  server-side, it survives navigating away and back (closes the reported
  "recording stops when I leave Vision Center" bug, which was really "there
  was never a real recording to stop").
- New **Camera Media** menu (HYDRA-UMC section) - `CameraMediaView.tsx`
  lists every saved snapshot/recording via `GET /api/camera/media`, grouped
  and filterable by camera, with a viewer pane and a download link. A saved
  recording plays back through a plain `<img>` the same way a live camera
  stream already does, since the server serves it with the identical
  `multipart/x-mixed-replace` framing.
- All 7 languages: new `cameraMedia.*` keys.

## [0.6.7] - Model library reorganized into category folders

- `public/models/` was one flat folder mixing 24 robot arms, 4 independent
  PnP/CNC/laser machine copies, heated beds, racks and vacuum tables. Split
  into `robots-5-dof/`, `robots-6-dof/` (plus a reserved, currently-empty
  `robots-7-dof/` - no 7-DOF model exists in `robotKinematicsDispatch.ts`
  yet), `machine-pnp/{lumenpnp,juanenpnp}/`, `machine-cnc/juanencnc/`,
  `machine-laser/juanenlaser/`, and `heatedbeds/default/`,
  `racks/default/`, `vacuum-tables/default/` (a `default/` variant
  subfolder under each, room for future alternates without another
  reshuffle). DOF classification per robot comes straight from
  `robotKinematicsDispatch.ts`'s own model-name strings (e.g. `(5-DOF)`),
  not guessed from STL file/joint counts. Every `*Arm.tsx`'s `MESH_BASE`/
  `meshBase`, `machineAssets.ts`'s per-machine `directory`, and the rack/
  heated-bed/vacuum-table mesh loaders were updated to the new paths; all
  183 existing tests plus a full production build were re-run to confirm
  nothing broke. Added a `metadata.json` (id/model/manufacturer/dof/
  category, or id/name/manufacturer/category for machines) next to each
  model folder alongside its existing `ATTRIBUTION.txt` - the
  heated-bed/rack/vacuum-table `catalog.json` files already carried
  equivalent per-variant metadata and were left as-is.

## [0.6.6] - Geometry disposal on every robot arm's own STL scaling hook

- Real gap found on code review: `useRealScaleSTL()` (duplicated
  verbatim across 13 `*Arm.tsx` files - AR3, AR4, Edo, Faze4, Koch,
  M-710iC, Parol6, SO-ARM100, UR e-Series/classic, ViperX 300, WidowX
  250, Z1) clones the shared, cached STL geometry `useLoader` returns and
  scales it, but never disposed that clone - a real WebGL-side VBO/IBO
  leak (not a JS heap one; the shared `raw` cache itself is deliberately
  never touched or disposed, only each hook's own private clone) every
  time a model switch unmounts/remounts one of these components. Each
  hook now disposes its own clone via a `useEffect` cleanup when a new
  one replaces it or the component unmounts.
- **Investigated, not implemented this pass:** whether joint pose
  interpolation could be decoupled from telemetry arrival rate so the
  viewport stays visually smooth at 60fps even when telemetry updates
  slower. Found this is genuinely more involved than a drop-in fix - the
  correct implementation needs each joint's `Object3D` mutated
  imperatively inside `useFrame` via a direct ref (an R3F-idiomatic
  requirement, not stylistic), which means restructuring 6 levels of
  nested JSX per robot model across ~24 files; a simpler approach that
  only forces a React re-render every frame would trade the current
  jerkiness for a real render-performance regression instead. Left for a
  dedicated pass with live visual verification rather than a wide,
  unverified change across every robot model.

## [0.6.5] - Pair a Bluetooth gamepad directly to the CM5 from Config, no SSH needed

Gamepad Config's own "Bluetooth Connection" mode used to be purely informational - it never actually
paired anything, and `navigator.getGamepads()` only ever sees a controller connected to whichever
machine is running the browser, not the CM5 itself. Switching Gamepad Controller to Bluetooth mode now
shows a real pairing panel: **Scan for devices** powers on the CM5's own Bluetooth adapter and runs a
real ~10-second discovery window on the device itself, listing whatever it actually finds; **Pair**
runs the real pair/trust/connect handshake against that same device. Everything here is a real,
admin-gated action against HYDRA-UMC-SERVER's own new `POST /api/system/bluetooth/*` routes - nothing
here is simulated or client-side-only. Translated in all 7 languages.

## [0.6.4] - Parol6's real j1 range widened to match the recalibrated physical unit

- `PAROL6_JOINT_LIMITS_DEG.j1` was `[-97.40, 97.40]`, taken straight from
  the stock `PAROL6.urdf`. The owner's own real unit has since been
  recalibrated to a wider physical range - confirmed real j1 travel is
  now `[-97.40, +187.40]`. This is the single source of truth
  `jointLimitsFor()` (`robotKinematicsDispatch.ts`) already exposes to
  both the jog UI (`RobotDetail.tsx`) and gamepad jog clamping
  (`GamepadController.tsx`), so both pick up the wider real range with
  this one change.
- `parol6CartesianToJoints`'s own j1 solve is `Math.atan2(y, x)`, whose
  range is inherently `(-180, 180]` - it can never actually reach the new
  187.40 upper bound, only the -97.40 lower one. Updated
  `tests/parol6Kinematics.test.ts` to test the lower-bound clamp for real
  (the old test's own Cartesian target no longer needs clamping at all
  under the wider limit) and added a new test documenting that the upper
  bound is only ever reachable from a direct joint jog, not from this
  Cartesian solve.

## [0.6.3] - 2 missing translation keys, and Supervisor network data-flow graphs

- Add the 2 translation keys used by real `t(...)` calls but missing from
  all 7 locale catalogs (`dashboard.rp1_temp`, `robot_detail.delete_points`)
  - i18next's own behavior for a key missing everywhere and passed no
    literal default is to render the raw key string itself in the UI.
- Add `tests/i18nKeys.test.ts`: statically extracts every literal-string
  `t(...)` call under `src/` and checks it resolves against the real
  locale catalogs, plus asserts all 7 catalogs carry the exact same key
  set - a key added to one language but not the rest is exactly how the
  bug above happened, and would now fail this test instead of only being
  found by hand.
- System Supervisor panel: real per-interface network traffic, consuming
  the new fields on `GET /api/system/supervisor` (HYDRA-UMC SERVER
  0.6.7) - cumulative Wi-Fi/Ethernet totals since boot as stat tiles, plus
  a live throughput graph (RX/TX, computed client-side from consecutive
  cumulative-byte samples). Bluetooth traffic has no real source on the
  server side yet and is never shown as a fabricated number. Nothing
  renders when the host has neither interface, rather than an all-N/A
  panel with no real content.

## [0.6.2] — table model configuration

- Separate JuanenPnP, JuanenCNC and JuanenLaser into independent editable STL
  directories (167 meshes each), retaining the untouched LumenPnP source and
  attribution. Replace CNC/laser primitive previews with the copied CAD assembly.
- Load variant STL directly, isolate caches by machine and document CAD-size
  behavior, editing/reloading and retained module settings in seven languages.

- Add configurable rack width/depth (1 mm steps), capacity-driven STL guides
  and independent color metadata. Preserve pickup poses and the other rack.
  Ship editable OpenSCAD/components/default assembly, seven-language controls
  and documentation, geometry regression tests and live rack previews.

- Replace the heated-bed primitive with four detailed STL presets (100x100,
  200x100, 200x200, 255x255 mm), all exactly 5 mm thick, with matching OpenSCAD.
- Heated-bed footprint edits step by 5 mm and preserve heater/placement state.
  Add geometry/contract tests, model guide and seven-language UI/README coverage.

- Edit width/length in 5 mm steps, keeping the original thickness and presets.
  Explicit customSize settings preserve legacy rendering and synchronize via SERVER.
- Preview and cell meshes reflect the custom footprint; selecting a model
  restores its original dimensions. Update all seven UI/README languages and guide.

## [0.6.1]

- Build version synchronized with `hydra-umc.project.json` and the repository-native version source.

## [0.6.0] - Real selectable vacuum table models replace the primitive one

- The vacuum table module was a bare parametric box. It is now a catalog of
  six real vacuum tables (`public/models/vacuum-tables/`), each shipping its
  own OpenSCAD source and a binary STL mesh rendered in the 3D viewport
  (`VacuumTableMesh.tsx`). Selecting a model keeps pump/valve state, world
  pose and render scale intact - only geometry and the fixed physical
  dimensions change (`selectVacuumTable()` in `src/vacuumTables.ts`).
- `VacuumTableModule` gains a `modelId`, persisted through the existing robot
  settings; a missing or unknown id falls back to the 160x120 model rather
  than erroring.
- Seven-language selector label, compatibility note and error text; new
  `docs/VACUUM_TABLE_MODELS.md`; `tests/vacuumTables.test.ts` validates every
  STL's real triangle count and bounding box against its catalog dimensions,
  the pose/pump/valve preservation, unknown-id rejection, and the locale keys.

## [0.5.9] - Real silent recovery from a WS 1008 close, instead of always forcing logout

Follow-up to 0.5.7: forcing a full `logout()` on EVERY WebSocket 1008
close was still overly broad - the most common real cause (the access
token's own 30-day expiry on a dashboard tab left open) doesn't mean the
account was actually revoked, and a forced logout loses whatever
view/robot selection was open. `store.tsx` now tries HYDRA-UMC-SERVER's
own new `POST /api/refresh` first (silent, no visible interruption,
using a real opaque refresh token `login()` now also stores) before
falling back to today's forced logout - which still happens exactly when
it should (a genuinely revoked session, an expired/never-issued refresh
token, or an older server that doesn't support this yet). `logout()`
itself now also calls the new `POST /api/logout` so a real sign-out
revokes the refresh token server-side, not just discards it locally.
154 tests still pass - no dedicated new test file for this specific
change, `store.tsx`'s WS-reconnect effect isn't unit-tested in isolation
from its own provider (see `tests/decodeJwtRole.test.ts` for the one pure
function that already is); verified instead against HYDRA-UMC-SERVER's
own new `tools/verify_refresh_token_contract.mjs`, which proves the exact
`/api/refresh`/`/api/logout` contract this change calls.

## [0.5.8] - LumenPnP: 26 more real parts (160 total) + a real bucketing bug fixed

26 more real parts (`public/models/lumenpnp/parts/`, batch 5): the 2
real nozzle-rotation motors (hollow-shaft NEMA11), a real 2nd pair of
blade-dispenser units, a real 2nd pump/valve pair with their own
pneumatic fittings, 2 spare nozzle tips, the real X-axis drag chain (4
links), a 3rd Z-rail carriage, and generic frame hardware. 160 real
parts total now across 5 batches, ~23.9MB combined - fasteners
(screws/nuts/washers/binders, ~2400 real instances in the source CAD)
excluded throughout by explicit instruction.

Also fixes a real bucketing bug found in the same pass:
`nozzle-camera-mask_001` (added in the very first batch) was attached
to `base_link` - its own real bbox sits at the toolhead's own height,
matching `z_carriage_left`/`nozzle_left`, not the static frame. Moved
to `x_carriage` alongside its new `_002` sibling.

## [0.5.7] - Real bug: an expired/revoked session looped forever instead of logging out

`store.tsx`'s WebSocket reconnect effect rescheduled itself unconditionally
on every close, including code 1008 (server.ts's own real close code for
every auth rejection - no token / invalid token / session revoked, see
its own 4 `ws.close(1008, ...)` call sites). A token that just expired or
was revoked kept being retried with itself forever, silently, never
surfaced to the user - the same real class of bug already fixed for
Android/iOS/DSI's own `wsAuthRejected` handling earlier this session, just
never ported to STUDIO itself. Fixed: `ev.code === 1008` now calls
`logout()` (which reloads the page) instead of rescheduling.

Also: `decodeJwtRole()` is now exported and has real unit tests
(`tests/decodeJwtRole.test.ts`, 9 cases - a malformed/missing token, a
non-JSON payload, a role field present but not a string, the URL-safe
base64 alphabet a real JWT can use) - STUDIO's first test of its own
session/credentials handling (found missing while reviewing this;
IOS-CONTROL/ANDROID/SERVER already had their own).

## [0.5.6] - LumenPnP: 87 more real parts (motors, pulleys, belts, drag chain, rails) + ground-offset fix + Pick & Place resizable split

Three real fixes/additions made after the previous release shipped and
was checked live on the real CM5:

- **Ground-offset bug**: the 47 parts added in 0.5.5 made a real,
  visible bug obvious for the first time - half the machine (the real
  legs, which reach down to Z=-100.81mm, the machine's own real feet)
  rendered below this app's shared ground plane, because CAD Z=0 is the
  machine's own WORK surface, not its feet. `LumenPnPRig.tsx`'s root
  group now carries a `GROUND_OFFSET_M` lift so the real lowest point
  sits at Y=0 like every other robot in this app.
- **87 more real CAD parts** (`public/models/lumenpnp/parts/`, batches
  2-4 - see ATTRIBUTION.txt for the full per-batch breakdown): the 2 Y
  motors + their pulleys/idlers + the X motor/pulley/idler + the
  toolhead's own motor/pulley/idler (batch 2, 46 parts, plus the real
  30-link Y drag chain), the GT2 belt loops + tension arms + belt-clamps
  (batch 3, 13 parts), and the fixed/moving linear rails+carriages, the
  fiducial reference board, the 2 blade-feeder mechanisms, the main
  work-surface staging plates and cable clips (batch 4, 28 of 30
  exported - 2 PCB parts dropped for the same "fine copper-trace
  geometry, no payoff at this scale" reason Group027 was dropped in the
  very first cut). 134 real parts total now, ~20.7MB combined .stl.
- **Pick & Place panel**: the 3D viewer and Module Settings panel are
  now a resizable split (default 40/60, viewer 1.5x the settings
  panel's own width, drag the bar between them to change it) instead of
  a fixed 50/50 grid - same pointer-drag pattern RobotDetail.tsx's own
  right panel already uses, persisted to `settings.uiLayout` the same
  way.

## [0.5.5] - LumenPnP rig: 47 real CAD parts added (legs, control box, frame, cameras, feeders, gantry hardware)

The LumenPnP/JuanenPnP 3D rig previously shipped only the 7 rigid-body
kinematic groups (base/y_carriage/x_carriage/z_carriage_left/right/
nozzle_left/right) - correct for the moving assemblies, but visually
incomplete: the machine's own real legs and control box were entirely
absent, among other real parts. Added 47 individually-exported real CAD
parts (`public/models/lumenpnp/parts/*.glb`, ~9.3MB combined, avg
~200KB/part) straight from Opulo's own `assembly.FCStd` - all 4 legs +
extensions, the control box + lid, 7 V-slot frame extrusion segments,
both top/bottom cameras + ring lights + light mounts, all 6 real
strip-feeder sizes, the vacuum pump, a solenoid valve, the nozzle rack,
2 nozzle holders, and the X/Y gantry brackets/idler/motor mounts - each
attached under whichever of the 3 relevant links (`base_link`/
`y_carriage`/`x_carriage`) matches its own real mechanical role. See
`public/models/lumenpnp/ATTRIBUTION.txt` for the full per-part selection
and placement methodology and `parts/manifest.json` for every part's own
real CAD source label, assembled bounding box and triangle count.

## [0.5.4] - Fixed real readability bug: unreadable Industrial submenu labels

`Dashboard.tsx`'s own Industrial submenu button labels came straight
from a plain literal array (`'PickAndPlace'`, `'VacuumTable'`,
`'HeatedBed'`) rendered through the button's own `uppercase` CSS class -
correct for the multi-word entries in that same array (`'XY Table'` ->
"XY TABLE", `'ATC Tools'` -> "ATC TOOLS"), but these 3 have no space at
all, so they rendered as one unreadable run: "PICKANDPLACE",
"VACUUMTABLE", "HEATEDBED". Fixed with a new `INDUSTRIAL_MENU_LABELS`
display-only lookup ("Pick & Place" / "Vacuum Table" / "Heated Bed") -
the array items themselves, and the `activeTab` slug derived from them,
are unchanged, so nothing else in this file needed to move. SUITE
already had the correct labels (`HEADING_PICK_AND_PLACE`=`"Pick &
Place"` etc. in every one of its own `language/*.lng` files) - no
change needed there.

## [0.5.3] - First real persisted Work exercising the XY table

`public/WORKS/RobotA1/inspeccion_con_mesa_xy.json` - mirrors the same new
Work added to HYDRA-UMC-SERVER's own `data/WORKS/RobotA1/`, added to this
folder's own `index.json` too. Every Work ever actually saved here used
only `{x,y,z,a,b,c}` - the XY table's own `tx`/`ty` axes were exercised
exclusively by this repo's in-memory Examples (`src/examples/list/*.ts`),
never by anything a real user could load, save and replay from the file
picker.

## [0.5.2] - LumenPnP/JuanenPnP: nozzle no longer spins its own housing

`LumenPnPRig.tsx` used to merge each Z-carriage housing and its nozzle
into one rigid mesh per side (`z_carriage_n1`/`z_carriage_n2`) that
translated *and* rotated together. Real, visible bug, not a harmless
simplification: the housing's own real footprint at that joint is
~44x51mm (measured off the real per-part CAD bounding box), so the whole
rectangular slider block visibly swung around the Z axis every time a
nozzle rotated - the physical machine never does that, only the
~10x10mm nozzle barrel itself spins. Split into `z_carriage_left`/
`z_carriage_right` (translate only) + `nozzle_left`/`nozzle_right`
(rotate only, same joint origin as their carriage parent) - matching
this project's own formal `lumenpnp_juanenpnp.urdf` (7 links/6 joints)
link-for-link, which had already modeled this correctly but was never
wired into the live viewer. New meshes generated the same way as the
existing 5 (opening the real CAD headless, offline-merged to indexed
`.glb`), see `public/models/lumenpnp/ATTRIBUTION.txt` for the full story
and the new triangle counts. Same fix ported to HYDRA-UMC-SUITE's
`render/pnp_rig.py`/`viewport.py` and mirrored into HYDRA-UMC-SERVER's
own copy of these public assets.

## [0.5.1]

- Removed 2 real dead-code lint warnings surfaced on code review:
  an unused `SKY_SOFT` color constant in
  `EcosystemTelemetry.tsx`, and `activeController` destructured from
  `useHydraStore()` in `Dashboard.tsx` but never read (only mentioned inside
  a comment). No behavior change; `npm run lint` warning count for real
  bugs (`eslint(no-unused-vars)`) is now 0 - the remaining warnings are all
  `react(only-export-components)` (Vite Fast Refresh advice about
  co-locating a non-component export in a component file), a cosmetic
  dev-experience note, not a defect.

## [0.5.0] - A "stopped" camera could keep streaming forever, silently

Found live in production: toggling a camera off in Vision Center left
its real `hydra-umc-vision-streamer stream serve` process running on
the Server, still burning real CPU/memory for a feed nobody was asking
for anymore - and toggling it back on then showed nothing, because the
Server never heard about that either.

Root cause: the debounced `POST /api/settings` save (and its
`flushSettingsSave()`/`factoryReset()` siblings) called `fetch(...)`
and only ever handled a real network failure (`.catch(() => {})`) -
`fetch()` does not reject on a non-2xx response, so a 401 (expired
session token) or 403 (`/api/settings` requires an admin role) made
every save silently no-op forever. The local UI still showed the new
toggle state (it mutates local state immediately, before the network
round-trip), so nothing looked wrong on this side while the Server's
own state - and therefore its camera-process supervisor - never
changed at all. HYDRA-UMC SUITE's own `push_state()` already checked
this correctly; this was a real STUDIO-only gap, not an ecosystem-wide
one.

Fixed: all three save paths now check `response.ok`, surface a real
`settingsSaveError` (a plain, human-readable reason - expired session,
wrong role, unreachable server, or an HTTP status) instead of pretending
to succeed, and only mark a payload as "sent" once it actually was - so
either the next real change or a manual retry tries it again instead of
giving up silently. A new "Save failed - Retry" indicator next to the
existing System Online/Offline badge surfaces this the moment it
happens and lets an operator retry with one click
(`flushSettingsSave()`) instead of guessing why a camera, robot or
setting change never actually applied.

## [0.4.9] - Example data can no longer look like a live connection

Found on code review (P1): the example
robots/cameras this app seeds on a fresh install had `online`/
`urtcConnected`/`connected: true` (and populated firmware/hardware-ID
fields) for a few entries, and the example controller's own `status`
started `'online'` - indistinguishable from a real, live connection
before this app had ever actually heard from a real Server. Worse,
`status` lives inside the same `controllers` array the debounced save
effect POSTs to `settings.json`, so that fake claim could persist.

- `createDefaultRobots()`/`createDefaultCameras()` now start every live-
  connection field (`online`, `urtcConnected`, `connected`,
  `controllerBoard`/`urtcHead`/`urtcExpansion`) false/undefined - the
  useful example content (robot models, roles, tools, joint angles, the
  Pnp/CNC/Inspection role assignments) is unchanged.
- New `serverReachable` state in `HydraProvider`: a real, live signal set
  from the actual boot fetch and WebSocket open/close lifecycle - never
  from a fixture default, and never written into `settings`/`controllers`
  (so it can never persist into `settings.json` the way the old `status`
  field's fake `'online'` used to). The "System Online/Offline" badge
  (header and footer) now reads this instead of `activeController.status`,
  and shows an explicit "Example data" tag while no real connection has
  been confirmed yet.
- Config > Controllers' per-node status pill only shows a real Online/
  Offline verdict for the currently-active connection (the only one this
  app actually checks); every other listed node now honestly reads
  "Unverified" instead of replaying its last-saved `status` as if it were
  a live check. New `config.unverified` string in all 7 locales.
- New `tests/defaultFixtures.test.ts` (4 tests) locks in that every
  example robot/camera the app ships with starts with no live connection
  claimed, while still returning 8 usefully pre-configured examples.

## [0.4.8] - `typecheck` was still a no-op, plus a real automated test suite

- **Corrects the previous "Unreleased" entry below, which was itself
  incomplete.** That pass added a `typecheck` script (`tsc --noEmit`) and
  reported it "currently clean" - true only because it was checking
  NOTHING: this repo's root `tsconfig.json` is a solution-style config
  (`"files": []`, only `"references"` to `tsconfig.app.json`/
  `tsconfig.node.json`), and plain `tsc --noEmit` against a solution
  config like that silently no-ops rather than traversing the referenced
  projects - confirmed by hand by dropping an obvious type error into
  `src/` and watching `npm run typecheck` report nothing at all. The real
  fix needs project BUILD mode: `tsc -b --noEmit`.
- **8 real, pre-existing type errors surfaced immediately once typecheck
  actually ran for the first time** - `vite build`'s own esbuild/SWC
  transpilation never type-checks, so these had been silently
  accumulating on `main` the whole time `npm run typecheck` was a no-op:
  - `EcosystemTelemetry.tsx`/`SystemSupervisor.tsx` (5 sites): Recharts'
    own `Tooltip formatter` prop type passes `ValueType | undefined`, not
    a plain `number` - the existing `(v: number) => ...` annotations were
    narrower than what Recharts actually calls them with. Fixed by
    letting the parameter type infer contextually from the prop itself
    and coercing with `Number(v)` wherever `.toFixed()` is called.
  - `GamepadController.tsx`/`RobotDetail.tsx` (1 site each, identical
    code - `GamepadController.tsx`'s own header comment already says it
    mirrors `RobotDetail.tsx`'s `handleXYZJog`): an `axes: {axis: 'x'|'y'|'z'; ...}[]`
    array literal chained straight into `.filter(...)` loses its own
    literal `axis` type through the call (TypeScript's contextual typing
    from the outer annotation doesn't flow through a method call on the
    literal) - `.filter()` was returning `{axis: string; ...}[]`. Fixed
    by adding `as const` to each `axis` value so the literal survives the
    `.filter()` call.
  - `canOta.ts` (1 site): `fetch()`'s `body: firmware` (a `Uint8Array`)
    stopped satisfying `BodyInit` under this TypeScript version's newer,
    generic `Uint8Array<ArrayBufferLike>` - a real type-only regression
    (fetch has always accepted a typed array as a body at runtime), not a
    behavior change. Fixed by wrapping in `new Blob([firmware.slice()])`
    - `.slice()` guarantees a real (never-shared) `ArrayBuffer` backing,
    which both `BlobPart` and `BodyInit` accept unambiguously.
- **`tests/`** (new) - a real, first-ever automated test suite for this
  repo: 141 tests across 4 files, covering `src/examples/utils.ts`'s
  shared generic-arm FK/IK pair and its 5 path generators,
  `urKinematicsShared.ts`'s real DH-chain FK + multi-seeded
  Newton-Raphson IK engine (exercised through the real UR5e chain),
  `parol6Kinematics.ts`'s own hard-coded real chain, and - the single
  highest-value target - `robotKinematicsDispatch.ts`'s own dispatch
  table, generically parametrized over EVERY one of the 24 real robot
  models it fans out to (23 dedicated `*Kinematics.ts` files plus the
  generic fallback), rather than 23 near-duplicate bespoke test files.
  None of `src/examples/` had a single test before this. Run via
  `npm test` (`vitest run`, new `vitest.config.ts`); `npm run typecheck`
  now also covers `tests/` itself via a new, standalone
  `tsconfig.test.json` (kept separate from the existing app/node project
  references to avoid touching that graph's own composite/reference
  wiring).
- Verified for real: `npm run typecheck` (both halves), `npm test`
  (141/141), `npm run lint`, and `npm run build` all pass clean.

## [0.4.7]

- **Fixed a real remote-access gap found on code review:
  HYDRA-UMC-DSI's own client already sent `X-Hydra-Client: dsi` on every
  request, but there was no toggle for it in Config > Remote Access, and
  the server-side gate didn't recognize "dsi" at all - a DSI request fell
  into the same bucket as an ungated plain browser tab and always passed
  regardless of any setting.** Added a 5th `remoteAccess.dsi` toggle,
  same pattern as SUITE/Android/iOS/Watch (`server.ts`'s own
  `remoteAccessAllowed()` now recognizes "dsi" too - see that repo's own
  changelog). `tsc --noEmit` and `vite build`: clean.

- Build version synchronized with `hydra-umc.project.json` and the repository-native version source.

## [0.4.6]

- **Fixed a real permanent-freeze bug in Vision Center's own retry
  logic.** Found via a detailed live user report on camera 4 (2 real
  streams): after enough stream switches, the feed stopped reconnecting
  automatically at all, needing a manual server-side process kill. Root
  cause: the `<img>` element's own retry counter was a flat per-camera
  number that never reset - once ANY stream for a camera exhausted its
  6-attempt budget, EVERY future switch on that same camera inherited
  the already-exhausted count and got zero retries, even for a brand
  new stream it had never actually tried. Now the retry budget is
  tracked per stream identity (`rtspPath`/`hardwareSource`), so a real
  switch always starts fresh, and there's no hard retry ceiling at all -
  HYDRA-UMC-SERVER's own camera-process supervisor now actively kills
  and respawns a hung capture process on its own (see that repo's
  CHANGELOG), so the client just needs to keep asking, not give up.
- **New real PTZ (pan/tilt/zoom) control in Vision Center - IP cameras
  only.** A toggle button between the power and YOLOv8 buttons (USB
  cameras have no pan/tilt/zoom hardware to control) reveals a real
  direction pad + zoom controls; each button sends a real continuous-
  move command on press and a real stop on release, through
  HYDRA-UMC-SERVER's own new `POST /api/camera/:id/ptz`. A camera with
  no real PTZ hardware shows the server's own honest error instead of
  pretending the move worked.

## [0.4.5]

- **Fixed the real "picking a different stream always shows the same
  image" bug, found via live user testing.** `GET /api/camera/:id/stream`
  is a one-shot proxy (server.ts fetches the local capture process
  exactly once, then pipes bytes) - when the Vision Center combobox
  picks a different discovered stream, the server correctly restarts
  capture against the new `rtspPath`, but that kills the old proxy's
  own upstream connection, which ends the `<img>`'s response. A plain
  `<img src="...">` with a constant URL never re-requests after that -
  it just freezes on the last frame forever, so every stream selection
  looked identical. `CamerasView.tsx`'s feed `<img>` is now keyed on
  `rtspPath` (forces a real remount/reconnect on every stream switch)
  with a real bounded retry-with-backoff on error (the very first
  reconnect can genuinely land before the server finishes restarting
  capture - a real, honest transient 502/503, not a permanent failure).
- **Setup Camera now shows one real, editable path field per discovered
  stream** - a camera whose last "Discover Path" run found 2 real
  streams used to have nowhere to put the 2nd one; only the single
  `rtspPath` field existed. `Config.tsx` now renders one field per
  entry in `discoveredStreamPaths` (labelled Main/Sub/Sub N, reusing
  `ipStreamLabels()`), each independently editable; editing the field
  matching the CURRENTLY selected stream (Vision Center's own combobox)
  also updates the live `rtspPath`, editing another just updates its
  own stored path for when that stream gets selected later. A fresh
  discovery still autofills every field it found.

## [0.4.4]

- **Stopped is a real status now, not a red "error" badge** - the
  client half of HYDRA-UMC-SERVER's fix for a real bug: a camera
  toggled off in Vision Center used to leave its real capture process
  alive, silently burning CPU/memory (see that repo's own CHANGELOG).
  Now that the server genuinely stops that process and reports a real
  `"stopped"` status, the Config.tsx status badge shows it as its own
  neutral, deliberate state (new `config.stream_stopped` i18n key × 7
  languages) instead of falling into the catch-all "Stream Error" red
  badge a status it didn't recognize used to become.

## [0.4.3]

- **Real multi-stream RTSP support - the type combobox now reflects
  how many streams a camera ACTUALLY has, not a fixed Main/Sub pair.**
  A real IP camera on this ecosystem's own network can expose 1, 2, or
  more real RTSP streams at once (`HYDRA-UMC-SERVER`'s own
  `discoverRtspPath()` used to stop at the first match - see that
  repo's own CHANGELOG). New `store.tsx`'s `ipStreamLabels()` derives
  the real option list from a camera's own `discoveredStreamPaths`
  (every path the last real "Discover Path" run found, not just the
  first): 1 stream -> "Main" only, 2 -> "Main"/"Sub", 3+ -> "Main"/
  "Sub Stream 1"/"Sub Stream 2"/... `CamerasView.tsx`'s own Vision
  Center combobox now builds its IP options from this instead of a
  hardcoded pair - and picking a different one there is a REAL behavior
  change, not just a label: it re-points that camera's own `rtspPath`
  at the corresponding discovered stream, which the server's own
  process supervisor picks up and respawns the real capture for. A
  fresh "Discover Path" run in Config.tsx now records the FULL found
  list (`discoveredStreamPaths`) and resets the selection to Main by
  default. New `cameras.ip_vision_sub_n` i18n key × 7 languages
  (807/807 parity verified).

## [0.4.2]

- **Camera config UI: real Discover Path/Discover USB Devices buttons,
  live stream status, and an Apply Now action** - the client half of
  HYDRA-UMC-SERVER's new real per-camera process supervisor (see that
  repo's own CHANGELOG for the actual fix: saving a camera's config
  used to have zero effect on whether any real video ever showed up).
  `Config.tsx`'s Camera Setup tab: a "Discover Path" button next to the
  RTSP path field (IP mode) calls the server's new
  `POST /api/camera/discover-rtsp-path`, fills the field with the real
  discovered path or shows exactly which real paths were tried and
  failed; a "Discover USB Devices" button next to the hardware-source
  field (USB mode) calls the new `GET /api/camera/discover-usb-devices`
  and offers the real indices found as clickable chips. Every camera
  card now shows its own real live stream status (`GET
  /api/cameras/status`, polled every 3s while this tab is open) -
  Stream Live / Starting / Stream Error with the real error message on
  hover - real feedback a config edit never had before. New "Apply Now"
  button per card - real edits already auto-save via the ordinary
  500ms debounced `POST /api/settings` this app already uses for every
  other field, so this doesn't do anything an edit wasn't already going
  to do; it just skips the wait via a new `flushSettingsSave()`
  (`store.tsx`) for someone who wants immediate confirmation. New
  `store.tsx`'s `CameraType` also gained `"IP Vision Camera Main
  Stream"`/`"IP Vision Camera Sub Stream"` (a real IP camera can expose
  2 real streams at once - this ecosystem's own Hipcam cameras: `/11`
  main, `/12` sub) - the Vision Center's own per-camera type combobox
  (`CamerasView.tsx`) now offers the USB label only in USB mode and the
  2 IP stream labels only in IP mode (Thermal stays offered regardless
  of `sourceType`, unchanged, until those sensors get real
  functionality); switching `sourceType` in Config.tsx re-normalizes a
  stale label so it always matches one of that combobox's own current
  options. New i18n keys × 7 languages, all key-count-parity verified
  (806/806).
- **Supervisor panel scrolls now** - real feedback from live testing: this
  panel's own ancestor (`Dashboard.tsx`'s main content area) is
  `overflow-hidden` with no scroll container of its own, so the process
  table (and, on a short viewport, the charts above it too) just got
  silently clipped at the bottom with no way to reach the rest - it read
  as a table cut off mid-row. Gave the panel its own `overflow-y-auto`
  scrolling body under a fixed header, the same "fixed toolbar, scrolling
  body" shape `EcosystemServices.tsx`'s own families list already used.
- **Services panel: version number and Live/Running status split into two
  separate frames** - they used to share one bordered badge; real feedback
  was that stacking two different facts ("is it up" and "which build") in
  one frame read as one fact at a glance. The health status keeps its own
  color-coded frame, the version now gets its own neutral one right below.
- **New Supervisor panel** (HYDRA-UMC menu, alongside Server Logs/Server
  Admin) - a real, Netdata-style live monitor of the CM5 this Server runs
  on: per-core CPU load + frequency, a real memory breakdown (used vs.
  cached/buffers, not just one coarse percentage), flash/eMMC usage, CPU
  + RP1 temperature trends, and a live top-20 process table, all charted
  in real time (recharts, polled every 2s against the new
  `GET /api/system/supervisor` - see HYDRA-UMC-SERVER's own
  `[Unreleased]`). A field this host genuinely cannot supply (this
  dev machine's own Windows box has neither `/proc/meminfo` nor
  per-core cpufreq) renders as an honest empty state, never a guessed
  number.
- **Reset, Reset 3D, jog step, and the XY table now really sync across
  every connected client, in both directions** - real feedback from live
  multi-client testing found none of them did. Root cause: `RobotDetail.tsx`'s
  own Reset/HOME/HOME XY buttons, XY table sliders, and jog-step selector
  all wrote through `updateRobot()` - an optimistic-local +
  500ms-debounced-full-tree-save path that never broadcasts to any OTHER
  connected client (a second STUDIO window, or the Android app's own
  embedded 3D WebView), unlike `sendRobotCommand()`'s atomic, broadcasting
  channel `handleXYZJog`/`handleJ1Jog` already used. Moved every one of
  those onto `sendRobotCommand`, backed by two new HYDRA-UMC-SERVER
  commands (`reset`, `reset3D`) and `absolute` support added to the
  existing `jog` command (see that repo's own `[Unreleased]`).
  `robot.jogStep`/`robot.reset3DTrigger` are new, optional `RobotState`
  fields - "RESET 3D" (camera framing only, no real robot state) still
  only remounts `VirtualKinematics` locally on every client, but the
  trigger reaching that remount is now `reset3DTrigger`, broadcast the
  same way, so a press on any client now reaches every other one too.
- **RP1 temperature in the Overview footer** - shown next to the existing
  SoC temperature reading whenever `GET /api/system/metrics` reports a real
  `rp1_temp` (CM5/Pi 5 family only - hidden entirely, not a placeholder
  dash, on any host without a real RP1 chip). See HYDRA-UMC-SERVER's own
  `[Unreleased]` for the real hwmon read behind it.
- **README doc fixes** - the "Multi-Language UI" section undersold real
  coverage (said 5 languages; `src/locales/` actually ships 7 complete,
  wired-in translations - Japanese and Simplified Chinese were already
  correct in ja.json/zh.json's own README translations, just missing from
  English/Spanish/French/Italian/German). The "Versioning" section also
  still described the old `scripts/bump-version.mjs`-in-`npm run build`
  mechanism, which `package.json`'s own `build` script (`vite build` alone)
  hasn't done in a while - `bump_manifest_version.py` is the real, current
  sole owner of the version, exactly as this file's own header already
  said.

## [0.4.1]

- Build version synchronized with `hydra-umc.project.json` and the repository-native version source.

## [0.4.0]

- **Real production crash fixed: "Vision Center" black screen after a
  redeploy** - reported live on the CM5's own kiosk display right after
  `0.3.9` went out. Root cause confirmed by reading the CM5's own live
  `settings.json` (camera data itself was fine, ruling that out) and the
  build output: every Dashboard.tsx panel (`CamerasView` included) is
  `React.lazy()`-loaded from its own content-hashed chunk
  (`CamerasView-<hash>.js`, `vite.config.ts`), and this app had **no**
  error boundary anywhere. A browser tab left open across a redeploy (this
  app's normal state on a kiosk screen - the mouse cursor stayed visible,
  confirming the browser/OS itself was fine) still holds the OLD
  `index.html`, which references the OLD chunk hashes - the redeploy just
  overwrote those files with new hashes, so navigating to any not-yet-
  visited panel 404s fetching its own chunk. With no error boundary, that
  uncaught error unmounted the entire React tree - a blank page on this
  app's own near-black background reads as a literal black screen. Two-part
  real fix, not a workaround: `main.tsx` now listens for Vite's own
  `vite:preloadError` event (emitted for exactly this case) and reloads
  once automatically, so any user hitting this after a future deploy
  self-heals without even noticing; a new `ErrorBoundary.tsx` (new
  `errorBoundary.*` i18n keys, all 7 languages) now wraps the
  `<Suspense>` panel area as a backstop for any OTHER render crash,
  keyed by `activeTab` so switching away from a crashed panel actually
  retries the next one instead of staying stuck on the fallback.
- Build version synchronized with `hydra-umc.project.json` and the repository-native version source.

## [0.3.9] - Real IP (RTSP) camera support alongside USB, Config + Vision/Cameras

- **Config -> Camera Setup**: each of the 8 vision slots now has a real
  Source Type toggle (USB / IP Camera), matching
  `HYDRA-UMC-VISION-STREAMER`'s own real `CameraConfig(source_type=...)`
  one-to-one (see that project's own CHANGELOG). USB mode is
  unchanged (the existing Physical Hardware Source field, e.g.
  `/dev/video0`). IP mode adds real, generic RTSP fields - Host/IP
  Address, RTSP Port (defaults to 554, but a real camera on the local
  network answers on 8554 - confirmed, not hardcoded), RTSP Path,
  Username, Password - deliberately not tied to any one camera brand:
  any real IP camera that speaks RTSP plugs in here the same way. New
  `CameraState.sourceType`/`ipHost`/`rtspPort`/`rtspPath`/`ipUsername`/
  `ipPassword` fields (`store.tsx`), all optional so every existing saved
  controller config keeps working unchanged (`sourceType` undefined
  reads as `"usb"` everywhere it's checked).
- **Vision / Cameras (`CamerasView.tsx`)**: each camera tile now shows a
  small USB/IP badge next to its ROBOT/LIVE badges, reflecting the same
  `sourceType` - purely informational, since the real live feed itself
  (`GET /api/camera/:id/stream`, real as of `HYDRA-UMC-SERVER`'s own
  CHANGELOG entry) already works identically regardless of
  which real backend `mjpeg_server.py` opened.
- New `source_type`/`source_usb`/`source_ip`/`ip_host`/`rtsp_port`/
  `rtsp_path`/`ip_username`/`ip_password`/`ip_camera_hint` keys (Config
  namespace) and `source_usb`/`source_ip` (Cameras namespace) across all
  7 languages. `tsc --noEmit`, `oxlint`, and `vite build` all pass.

## [0.3.8]

- Build version synchronized with `hydra-umc.project.json` and the repository-native version source.

## [0.3.7] - Real per-project Start/Stop/Restart buttons; 4 new summary stat tiles

- **Real Start/Stop/Restart buttons on each service card** (admin-only) -
  real feedback from live testing. Calls HYDRA-UMC-SERVER's new
  `POST /api/ecosystem/service/:unit/:action` (see that repo's own
  `[0.3.7]`), only shown for a project that opted into
  `service.systemd_unit` at all. Stop/Restart go through `ConfirmDialog`
  first (non-blocking, unlike `window.confirm()` - this app keeps a live
  WebSocket and a WebGL viewport running underneath every dialog); Start
  fires immediately. Only the ONE card whose own action is in flight
  disables/spins, not the whole panel; a failed action's error message
  stays attached to that same card.
- **4 new summary stat tiles** - Running/Stopped/Error/N/A counts,
  alongside the existing Total/Live/Families - computed from the same
  `healthColor()` the badges use, so the strip and every card can never
  disagree about which bucket a project is in.
- Updated the panel's own footer note, which still claimed start/stop
  controls were "not built yet".

## [0.3.6] - Services badge: real green/red/amber health color, version moved inside it, duplicate port line removed

- **The status badge's color didn't distinguish "stopped on purpose" from
  "actually crashed"** - real feedback from live testing. Now driven by a
  dedicated `healthColor()`, separate from the badge's own label text:
  green for genuinely running, red for cleanly stopped, amber for a real
  error - systemd's own `ActiveState: "failed"` IS that error state
  (crashed / exited non-zero / exhausted its restart limit), never
  conflated with `"inactive"` (stopped as expected). A project whose
  systemd unit says active but whose own declared port probes down is a
  real contradiction (alive but not actually serving) - also amber,
  with its own "Error" label text, not silently shown as plain green or
  lumped in with "Down".
- **Version number moved inside the status badge, ~2x its own label's
  font size, directly under Live/Running/Down/Stopped/Error/N/A** - real
  feedback from live testing, same placement style as the PID chip
  below it. Removed from the card's own bottom row, which also dropped
  the port number that duplicated the one already shown next to the IP
  in the host:port chip.

## [0.3.5] - Clear survives navigation; Services shows real IP:port and Linux PID per project

- **Server Logs' Clear button didn't survive leaving and returning to the
  panel** - real feedback from live testing right after `[0.3.4]` shipped
  it. `AdminLogs.tsx` is conditionally mounted
  (`{activeTab === 'adminLogs' && <AdminLogs />}` in Dashboard.tsx), so
  its own local `clearedAt` state reset every time the operator
  navigated away and back, silently un-clearing the view. Lifted into
  the shared store (`logsClearedAt`/`setLogsClearedAt`) so it survives
  for the life of the session instead of the component's own mount.
- **Services showed only 6 of 19 real running projects as "Live"** - the
  other 13 never declared a `service.port` in their manifest (many are
  CLI/library-shaped, not network services) and looked identical to a
  project that isn't a service at all - real feedback from live testing.
  Each card now shows a real local IP:port when `serviceHost`/
  `servicePort` are set (a TCP/HTTP probe), and a real Linux PID when
  the project's manifest opts into `service.systemd_unit` (a
  `systemctl show` probe, independent of whether it also exposes a
  port - see HYDRA-UMC-SERVER's own `[0.3.6]`). The status badge now
  has 5 real states instead of 3: Live/Down (port probe) win when
  present, Running/Stopped (systemd `ActiveState`) cover everything
  else that opted into `systemd_unit`, N/A stays for a project with
  neither - so a portless-but-running service reads as "Running", not
  lumped in with something that genuinely isn't a service.

## [0.3.4] - Server Logs gets a real Clear button; both Ecosystem panels now fill and scroll properly

- **`AdminLogs.tsx` (Server Logs) had no way to clear the view** - real
  feedback from live testing. Added a Clear button next to Pause/Resume;
  since `lines` is always replaced wholesale from the server's own
  last-300-lines response on every poll, simply emptying local state
  wouldn't have stayed empty past one poll tick while live - Clear instead
  remembers the newest line (or that the log was empty) at the moment it
  was pressed, and only shows what comes after that same anchor in every
  later poll, same "clear the screen, keep tailing" behavior as a
  terminal or devtools console.
- **Server Logs and Services panels didn't fill or scroll properly on a
  wide/tall browser window** - real feedback from live testing (tested
  against the CM5's own served STUDIO, not the desktop build). Both
  panels' own root had a `max-w-5xl`/`max-w-6xl` cap, so a wide window
  left real empty space on the right instead of using it. Server Logs'
  own log box separately capped its height at `70vh` (a fraction of the
  browser viewport) instead of the real space `flex-1` already gave it
  inside its own container. Services was worse: its root had no scroll
  container of its own at all, and its ancestor (Dashboard.tsx's main
  content area) is `overflow-hidden` - a family list taller than the
  visible viewport was silently clipped at the bottom with no way to
  reach the rest, exactly the "services cut off halfway down" report.
  Both width caps removed; Services now has its own `flex-1 min-h-0
  overflow-y-auto` region around just the grouped cards (header/stats/
  search stay fixed above it, same fixed-toolbar-plus-scrolling-body
  shape as Server Logs' own log box), and Server Logs' box now genuinely
  fills whatever height its flex container gives it instead of a
  viewport-fraction cap.
- **Coordinated XY-table examples** - the nine examples that use an XY
  table now describe two deliberately independent motions at every playback
  step: `tx`/`ty` moves the robot base across the table pattern, while the
  local Cartesian pose drives a distinct, animated tool task. Raster, scan,
  circle, diagonal, spiral, snake and flower examples now include a bounded
  inspection/dispensing gesture; the PnP matrix performs an approach, place
  and retract cycle at each table cell. `xyTableTaskPoint()` is the shared
  authoring helper that prevents a future example from accidentally folding
  table travel into arm kinematics.
- **Work playback synchronization** - selecting a Work now sends one atomic
  `trajectory` command to HYDRA-UMC-SERVER instead of relying on the delayed
  full-settings save. Server stores the selected points and resets its cursor
  before Play is available, so it cannot replay the previously loaded Work.
  This applies to every robot model; Parol6 native-joint Works retain their
  `model-joints` path instead of being reinterpreted as generic joints.
- **Model-specific portable trajectories** - all 26 example trajectories and
  every A1–A8 Work now resolve their portable Cartesian intent through the
  selected robot's real IK before reaching Server. The result is persisted as
  explicit `model-joints`, so Faze4 and Parol6 no longer replay the same
  generic joint angles as unrelated physical poses. Example selection now uses
  the same atomic `trajectory` path as Works.

- **Canonical Work geometry** - the eight bundled Work names for every A1-A8
  robot (`aplicacion_pegamento`, `escalera_dibujo`, `impresion_espiral`,
  `inspeccion_optica`, `mover_objetos_palet`, `pintado_panel`,
  `silueta_arbol` and `soldadura_chasis`) are now authored as explicit,
  deterministic Cartesian XZ paths in the validated A1 workspace, rather
  than as unrelated generic joint-angle lists. `tools/generate_portable_works.py`
  regenerates the catalogue and CI rejects drift from that source.

## [0.3.3]

- Build version synchronized with `hydra-umc.project.json` and the repository-native version source.

## [0.3.2] - Gamepad real-time actions now use the atomic command path

- **`GamepadController.tsx`** - real-time actions (joint jog, XY-table
  jog, E-STOP/E-STOP ALL, START/STOP, playback speed) now fire
  `sendRobotCommand()`/`POST /api/robot/:id/command` - the same atomic
  path `RobotDetail.tsx`'s own jog buttons, E-STOP and play/pause already
  use - instead of `updateRobot()`'s 500ms-debounced full-tree
  `POST /api/settings`. A held gamepad stick is inherently low-latency
  input; routing it through the debounced save meant every connected
  client (this one's own optimistic UI included) lagged a held stick by
  up to 500ms, while also paying that save's full-tree serialization cost
  on every animation frame the stick stayed held (see `store.tsx`'s own
  `sendRobotCommand` comment - this is the exact "3D view at turtle
  speed" root cause class that comment already documents for jog/valve/
  pump/speed, just not yet fixed for gamepad input specifically).
  `ADD POINT` deliberately stays on `updateRobot()` - it is not a
  real-time action and has no atomic command of its own server-side.
- Joint jog now respects each model's real per-joint limits
  (`jointLimitsFor()`) instead of applying an unclamped +/-1.5° step -
  the gamepad path previously had no clamping at all, unlike every other
  jog surface in this app.
- XY-table jog now sends the real `target: 'xytable'` jog command
  (`server.ts`'s own dedicated branch) instead of writing `robot.pos`
  directly with an axis name (`tx`/`ty`) the server's `jog` case doesn't
  actually recognize for `target: 'robot'` - previously a silent no-op
  server-side beyond the optimistic local mutation.
- **`examples/robotKinematicsDispatch.ts`** - `jointLimitsFor()` moved
  here from `RobotDetail.tsx` (which now imports it), the same "single
  source of truth" move already applied to `jointsToCartesianForModel()`
  in this file, so `GamepadController.tsx` can reuse the exact same
  per-model joint-limit clamping instead of duplicating the ternary
  chain a second time.

## [0.3.1] - Real hardware transport now also reaches Tier 2 (URTC Tool Head)

- **`lib/canOta.ts`** - `resolveHardwareTarget()` now resolves `urtcHead`
  too (`{ targetTier: SPI_TARGET_STACKA, targetSlot, relay: true }`),
  since HYDRA-UMC-SERVER/spi_bridge's own new relay tunnel
  (RELAY_SEND/RELAY_RECV through the Robot Controller Board) now really
  reaches it - only `urtcExpansion` (Tier 3) still returns `null`, an
  honest boundary since that needs one further real tunnel hop (URTC's
  own I2C bridge) that doesn't exist yet. `hardwareQueryVersion()`/
  `hardwareStartFlash()` now send the new `relay` query parameter.
  `Flasher.tsx`'s `hardwareTargetUnreachable` check (and its UI/log
  messages) needed no code change - it was already derived from
  `resolveHardwareTarget()` returning `null`, so it now correctly stops
  flagging urtcHead as unreachable on its own.
- Verified: `tsc --noEmit`, `npm run build`.

## [0.3.0] - Real hardware transport for Flasher/Tester (Kinematic Brain + Robot Controller Board)

- **`lib/canOta.ts`** - `settings.canOta.transport === 'hardware'` now
  reaches a real path for Tier 0 (Kinematic Brain) and Tier 1 (Robot
  Controller Board): `hardwareQueryVersion()`/`hardwareStartFlash()` call
  HYDRA-UMC-SERVER's new `/api/hardware/canota/{version,flash}` relay,
  which itself relays to HYDRA-UMC's new `src/cm5_host/spi_bridge/` local
  service (the real SPI1 + `HYDRA_DATA_READY` GPIO link to the STM32H745).
  `resolveHardwareTarget()` is a new, explicit, honest boundary:
  urtcHead/urtcExpansion (Tier 2-3) return `null` - they need a real
  application-level relay tunnel the H745 firmware doesn't implement yet
  (still a FreeRTOS smoke-test stub), so they deliberately stay on the
  simulated transport rather than pretending to reach hardware that isn't
  actually connectable yet.
- **`Flasher.tsx`** - the "Flash Now" button is no longer disabled just
  because `transport === 'hardware'` (a real bug this fixes: it used to
  disable the button unconditionally in hardware mode, even for Tier 0/1,
  which are now genuinely reachable); it's disabled only when the
  resolved target truly isn't reachable yet (Tier 2-3), with an honest,
  specific message instead of the old generic "not implemented" banner.
  Real per-page flash progress is now watched live from the store's new
  `canotaProgress` (fed by a new `canota_progress` WebSocket message -
  see store.tsx below), not just the final HTTP response.
- **`Tester.tsx`** - a real bug this fixes: `transport` was never read
  at all, so Query Version silently ran the mock simulation even when
  `'hardware'` was selected. Query Version now reaches the same real path
  as Flasher.tsx; self-test/F-RAM/LEDs/bus monitor stay simulated (no
  real H745 *application* firmware to talk to yet - only the bootloader
  spi_bridge speaks is real), now said explicitly in the UI instead of
  silently implied.
- **`store.tsx`** - new `canotaProgress` state, fed by a new `type:
  "canota_progress"` WebSocket message handler (server.ts's own live
  per-page flash progress broadcast).
- All 7 language files (`en`/`es`/`de`/`fr`/`it`/`zh`/`ja`) gained the new
  `flasher.hardware_target_unreachable`, `flasher.log.
  hardware_target_unreachable`, `flasher.log.flash_hardware_failed` and
  `tester.simulated_below_note` keys; the old, now-inaccurate
  `flasher.hardware_not_implemented` key was replaced, not just added to.
- Verified: `tsc --noEmit`, `npm run build`, `npm run lint` (no new
  errors), and a real cross-language key-parity check (all 7 locale files
  valid JSON, 718 keys each, 0 missing/orphaned).

## [0.2.9] - Ecosystem panels: real charts, card layouts, cross-referenced data

Direct user feedback after `0.2.6`-`0.2.8`: the 5 Ecosystem panels were
functionally real (genuine live data, no fake state) but visually and
functionally thin - flat tables, no charts, no way to search/filter a
~48-project scan, panels that didn't talk to each other. This release
raises all of them, still on the exact same real data sources - no new
invented capability, just doing more with what was already real:

- **`EcosystemTelemetry.tsx`** - real charts via `recharts` (already an
  installed dependency, unused anywhere in this app until now): an
  `AreaChart` for raw points, a `BarChart` for aggregated buckets, both
  themed to STUDIO's own sky/slate palette. A Chart/Table toggle keeps
  exact values reachable when they matter, not just the shape. Added a
  real min/max/avg/count stat strip computed from the actual fetched
  series, and quick time-range presets (5m/1h/6h/24h) that compute real
  start/end epoch ms - hand-typing them is still available, just no
  longer the only way in.
- **`EcosystemServices.tsx`** - grouped by family (the same grouping the
  manifests themselves already carry) into a real card grid instead of
  one long flat table, with a search box, per-family filter chips, and a
  summary stat strip (total / live / families) that answers "is the
  ecosystem healthy" before scanning a single card.
- **`AiFamilyStatus.tsx`** - now cross-references Config > AI/Hailo's own
  `settings.aiHailo` (added in `0.2.7`): a family with real live nodes
  but its configured Hailo device set to "None" surfaces a real,
  actionable warning banner - genuine integration between two features
  from this same session, not two panels that happen to share a menu.
  Card layout per node (stack/version/live badge) instead of a bare
  table row.
- **`AdminClients.tsx`** - admin-first sort, a live "Xm ago" connection
  duration (ticking every second, independent of the 5s data poll) in
  place of a raw ISO timestamp, role-colored avatar icons, and a
  connected/admin-count stat strip.
- **`AdminLogs.tsx`** - a real search box plus tag filter chips extracted
  client-side from each line's own `[TAG]` prefix (`industrialLog()`'s
  real existing convention - `[ADMIN]`, `[WS]`, `[VOICE]`, ... - not an
  invented severity the server never sends).
- **`AdminServer.tsx`** - now also shows a real live snapshot from `GET
  /api/hydra-info` (product, uptime, controller/robot counts, hostname)
  above the port-config form, reusing the same endpoint `About.tsx`
  already calls elsewhere in this app.
- i18n: 24 new `ecosystem.*` keys across all 7 locales; 8 keys orphaned
  by `EcosystemServices.tsx`'s old flat-table layout removed from all 7
  rather than left as dead entries.
- Verified: `tsc --noEmit`, `npm run build` (recharts' real weight lands
  only in `EcosystemTelemetry`'s own lazy chunk, not the main bundle),
  `tools/ci_validate.py`, and every `ecosystem.*` key cross-checked 1:1
  against its actual `t()` call site across all 7 redesigned components.

## [0.2.8] - Real fixes while investigating the reported Android 3D-viewport desync

- **`apiBase.ts`'s `defaultProdBase()` hardcoded `:3000`** regardless of the
  port the page was actually loaded on. Invisible in the common case
  (Server almost always runs on 3000) - but ThreeDScreen.kt's own WebView
  (HYDRA-UMC-ANDROID-CONTROL) loads this page via `http://$ip:$port/...`
  using whatever port that app was configured with, so a deployment on a
  non-default port had every `fetch()`/WebSocket call from inside that
  WebView silently misdirected back to `:3000` instead of the port that
  actually served the page. Now prefers `window.location.port` (the
  page's own real port); `:3000` is only a fallback for a reverse-proxy
  case where the port isn't in the URL at all (80/443).
- **Found live while investigating**: the Server instance this session had
  been testing against was serving a STUDIO frontend build from ~03:16 -
  hours behind every fix landed today, including `0.2.2`'s own real
  Camera-PIP-vs-disabled-camera fix. Redeployed a fresh build (this
  version) into `HYDRA-UMC-SERVER/public/` - confirmed live via the
  running instance's own served `index.html` referencing the new build's
  real asset hashes. Not a code change in this repo, but recorded here
  since it directly explains why several already-fixed bugs could still
  have been visible against that specific running instance.
- Verified: `tsc --noEmit`, `npm run build`.

## [0.2.7] - Config > AI/Hailo, HYDRA-UMC > AI Family, and a new Help tab

- **Config > AI/Hailo** (new tab, same visual pattern as Config > CAN-OTA):
  records which Hailo AI accelerator is actually installed on this
  deployment - a real hardware fact, not a live query (neither AI node
  exposes an HTTP API of its own yet). Two SEPARATE devices tracked:
  vision (Hailo-8, already driving the real detection pipeline today)
  and cognitive (Hailo-10 8GB, a planned separate accelerator - defaults
  to "None", not silently claiming hardware that doesn't exist on any
  real deployment yet), plus a model registry path mirroring
  HYDRA-UMC-DETECTION-HEF's own real `models_dir` concept.
  `SystemSettings.aiHailo` added to `store.tsx`.
- **HYDRA-UMC > AI Family** (`AiFamilyStatus.tsx`, new panel) - the same
  real `GET /api/ecosystem/status` scan `EcosystemServices.tsx` uses,
  filtered to the two families the ecosystem's own manifests self-report
  as AI: "Vision AI Node" and "Cognitive AI Node" (10 real projects
  today: VISION-NODE, DETECTION-HEF, VISION-STREAMER, VISUAL-SERVOING-API,
  SAFETY-ZONES, DOCS-QA, COGNITIVE-NODE, VLA-ENGINE, SEMANTIC-PLANNER,
  VOICE-UI). Deliberately not a richer live AI dashboard - none of these
  nodes have their own API yet, so this stays honest about showing the
  same manifest/liveness data as Services, just pre-filtered.
- **Help > Ecosystem** (new tab) explains the whole HYDRA-UMC menu
  addition from `0.2.6`/this release - Services, Telemetry, AI Family,
  and the 3 admin-only panels - in the same descriptive style as the
  existing Help tabs.
- i18n: 9 new `config.ai_hailo*` keys, 6 new `ecosystem.*` keys, and a
  full `help.tabs.ecosystem` entry (label/heading/4 paragraphs) across
  all 7 locales.
- Verified: `tsc --noEmit`, `npm run build`, `tools/ci_validate.py`, and
  every new key cross-checked 1:1 against its actual `t()` call site.

## [0.2.6] - HYDRA-UMC menu becomes a real ecosystem control/visibility surface

- **Config > HYDRA-UMC menu** grew 5 new panels alongside the existing
  Firmware Update / Hardware Tester / Kinematic Brain: **Services**
  (`EcosystemServices.tsx`, `GET /api/ecosystem/status` - real manifest
  scan + live TCP/HTTP probe of every sibling HYDRA-UMC-* checkout that
  declares a port; view + manual refresh only - no start/stop yet, see
  the note in the panel itself), **Telemetry** (`EcosystemTelemetry.tsx`,
  raw points or bucketed aggregates against HYDRA-UMC-DATALAKE through
  Server's new proxy), and 3 admin-only panels ported from
  HYDRA-UMC-SERVER's own `admin-ui/` reference app rather than
  reinventing them: **Connected Apps** (`AdminClients.tsx`, `GET
  /api/admin/clients`), **Server Logs** (`AdminLogs.tsx`, `GET
  /api/admin/logs`, poll+pause+autoscroll-if-at-bottom), **Server Admin**
  (`AdminServer.tsx`, listen port + graceful restart).
- **`store.tsx`** now decodes `role` out of the session JWT's own payload
  (`decodeJwtRole()` - UI-only read, server still re-checks `requireAdmin`
  on every real request) and exposes `isAdmin`, so the 3 admin-only
  panels above are hidden from the menu entirely for a non-admin session
  instead of just 403ing when opened.
- i18n: new `ecosystem.*` namespace (73 keys) across all 7 locales.
- Verified: `tsc --noEmit`, `npm run build` (all 5 new panels code-split
  as their own lazy chunks), `tools/ci_validate.py`, and every
  `ecosystem.*` translation key cross-checked 1:1 against actual `t()`
  call sites (no unused or missing keys).
- Companion change in HYDRA-UMC-SERVER `0.2.6`: the new `/api/telemetry/*`
  proxy this panel depends on.

## [0.2.5] - 4th Remote Access toggle: HYDRA-UMC-WATCH

- **Config > Remote Access** gained a 4th independent toggle, HYDRA-UMC
  Watch, alongside the existing SUITE/Android/iOS ones - `SystemSettings.
  remoteAccess.watch`, gated server-side on the paired phone's own
  `X-Hydra-Client: watch` header (sent only for the 2 real Watch-relay
  calls, never for that phone's own direct traffic - see
  HYDRA-UMC-SERVER's own changelog for the server-side half).
- Also fixed this CHANGELOG's own stale "Versioning scheme" section,
  which claimed `scripts/bump-version.mjs` is wired into `npm run build`
  - it never has (confirmed against both the script's own header comment
  and `package.json`'s real scripts block); `bump_manifest_version.py`
  alone owns the version.

Verified: full `build-test.bat` suite passes (typecheck/tests/lint).

## [0.2.4] - Real, working Integrations panel (Config > Integrations)

- **Config > Integrations cards are now real, not just saved text.** Each
  of OpenPnP/CNC/Laser (existing) plus 2 new cards - ROS 2 Bridge and 3D
  Printer Bridge (OrcaSlicer/Cura/PrusaSlicer/LycheeSlicer/Bambu Studio)
  - now has a real **Test Connection** button: a genuine TCP reachability
  probe run server-side (`POST /api/integrations/test-connection` - see
  HYDRA-UMC-SERVER's own changelog), not a client-side ping that CORS
  would block anyway. Green/red result shown per card, independent of
  the others, matching this same real green/red-dot language the
  Android app's own Ecosystem tab already uses. CNC/Laser also gained
  the `ip` field they were missing (port-only before - a real reachability
  check needs a real host).
- `SystemSettings.integrations` gains `ros2`/`printer3d`, and `ip` on
  `cnc`/`laser`. Handled defensively (optional chaining, matching the
  existing pattern) everywhere `settings.integrations` is read, since an
  older persisted `settings.json` won't have these fields yet.
- New translation keys in all 7 locale files.
- Verified: `tsc --noEmit` clean, `npm run build` succeeds, `npm run
  lint` introduces zero new warnings (the `TestConnectionButton` is a
  real module-level component, not one declared during render). The
  built bundle confirmed to actually reference the new endpoint path.

## [0.2.3] - Dedicated base-rotation buttons on the XYZ Jog overlay

- **`RobotDetail.tsx`'s floating `JoystickOverlay`** now has 2 dedicated
  base-rotation (J1) buttons right under the XYZ jog `Joystick3D` -
  requested directly, so rotating the base and jogging the tool point are
  both reachable from the one window an operator actually keeps open,
  instead of needing the separate J1-J6 grid (`JointControlsOverlay`)
  just to nudge J1.
- New `handleJ1Jog(direction)`, mirroring `handleXYZJog`'s own real
  atomic-command pattern (`sendRobotCommand('jog', ...)`, not the passive
  `updateRobot`/debounced-POST path a plain joint-value change would
  otherwise take) - deliberately pure joint-space (no Cartesian
  round-trip through IK, unlike XYZ jog: rotating J1 alone doesn't need
  it), clamped to this model's own real J1 limits (`jointLimitsFor`, the
  same helper the J1-J6 grid's own slider already uses), and keeps
  `robot.pos` consistent afterward via forward kinematics
  (`jointsToCartesianForModel`) rather than leaving it stale.
- New `base_rotate_ccw`/`base_rotate_cw`/`base_rotation` translation
  keys added to all 7 locale files (`src/locales/*.json`).
- Verified: `tsc --noEmit` clean, `npm run build` succeeds, `npm run
  lint` shows no new warnings on the touched files. Not yet live-verified
  against a real robot - the button-level plumbing reuses the same
  `sendRobotCommand`/`jog` path `handleXYZJog` already sends real
  movement through, but a live device check is still the way to confirm
  ergonomics/feel before calling this fully done.

## [0.2.2] - Camera PIP fix, condensed Android action buttons, WS diagnostics

- **Fixes a robot's Camera PIP showing in the 3D viewport with every
  camera actually disconnected**, reported live. `visionEnabled` (a
  robot-level flag meant to mirror its assigned camera's real `connected`
  state) has its own `true` seed default independent of any camera ever
  connecting, and can drift from the real camera state on reassignment.
  The Camera PIP gate (and its "reopen" button) now also checks the
  camera's own `connected` state, looked up the same `assignedRobotId`
  way `Dashboard.tsx`'s own overview tiles already do - requiring both can
  only ever hide a PIP that was wrongly showing, never hide one that's
  genuinely supposed to be there.
- **Condensed the 3D-viewport action button row (E-STOP/START/PAUSE/HOME/
  HOME XY/RESET/RESET 3D/REPEAT/Add+Delete Point) to icon-only, on
  HYDRA-UMC-ANDROID-CONTROL's embedded WebView specifically** - detected
  via the distinctive token that WebView already appends to its own
  User-Agent (`ThreeDScreen.kt`), not a URL flag any other embedder would
  also trip. STUDIO's own desktop/tablet browser UI is completely
  unaffected - same text+icon buttons as always. Also fixes HOME and HOME
  XY sharing the exact same icon (HOME XY now uses a distinct grid icon)
  and RESET 3D's icon (was a camera/record glyph unrelated to what the
  button does - now a reset/reload icon) - both fixed for every client,
  not just Android, since neither icon choice was ever correct.
- Added real, permanent WebSocket connect/close/delta diagnostics
  (`console.log`, reaches Android's own logcat via `ThreeDScreenConsole`)
  while investigating a live-reported "Android's 3D view and STUDIO's own
  browser tab don't sync with each other" bug - not yet root-caused (the
  architecture read correctly on inspection; next real repro attempt can
  confirm directly whether the embedded WebView's own WS connection is
  opening/receiving deltas at all instead of guessing blind).
- Verified with a real `npm run build` (clean) and `npm run lint`
  (introduced zero new warnings).

## [0.2.1] - Skip the 10s branding splash when embedded (?hideUI=true)

- **Fixes ~10 extra seconds added to opening HYDRA-UMC-ANDROID-CONTROL's
  embedded 3D-viewport WebView, every time.** `App.tsx` showed a fixed,
  unconditional 10-second splash (`HYDRA_UMC_SPLASHSCREEN.svg`) on every
  single mount - correct for a standalone desktop/kiosk session, but
  `ThreeDScreen.kt` loads this exact page fresh via `?hideUI=true&robotId=...`
  every time that tab opens, paying the full 10s of branding on top of the
  WebView's own real cold-start cost every time. `hideUI=true` already
  means "embedded, no chrome" for Dashboard.tsx's own header/sidebar -
  the splash now reads the same flag once at mount and skips itself
  there too.
- Verified with a real `npm run build` (clean).

## [0.2.0] - Real per-model kinematics restored during server-driven playback

- **Fixes incoherent/nonsensical arm movement while playing a loaded WORKS
  file or stock example**, on any real-kinematics model (Parol6, Faze4,
  AR3, AR4, every UR variant, xArm6, Lite6, e.DO, Gen3 Lite, M-710iC,
  SO-ARM100, Gen2, PiPER, Z1, ViperX 300, WidowX 250, Koch). Root cause:
  0.1.9's server-side playback engine (HYDRA-UMC-SERVER) broadcasts each
  recorded point's stored `{j1..j6}` unmodified - correct only for the
  generic model, since a stock example's `{j1..j6}` is always computed
  against the shared generic 160mm/200mm formula (see `withCartesian`'s own
  comment), not that robot's real joint angles. `RobotDetail.tsx` now
  re-derives the correct joints itself, client-side, from the point's
  Cartesian `x/y/z/a/b/c` (already a real, robot-agnostic workspace target)
  via the exact same `resolveTargetJoints()` per-model dispatch jog already
  used - a `useLayoutEffect` scoped to active playback only, so a direct
  joint-slider edit is never fought with a stale re-derivation. Restores
  the same correctness the removed client-side `playRobotTrajectory` loop
  used to have, without needing HYDRA-UMC-SERVER itself to know anything
  about per-model kinematics (that stays purely a STUDIO/Android-WebView
  concern - the same fix applies to both, since Android's own 3D view
  embeds this exact page).
- A handful of defensive `min-h-0` additions on the viewportOnly 3D layout
  chain, found while diagnosing (separately) a blank 3D viewport specific
  to HYDRA-UMC-ANDROID-CONTROL's embedded WebView - not the actual cause
  there (see that repo's own changelog), but the correct standard class for
  a flex-1 child nested this deep regardless.
- Verified with a real `npm run build` (clean, 0 errors).

## [0.1.9] - Chinese and Japanese added to the UI language switcher

- New `src/locales/zh.json` (Simplified Chinese) and `src/locales/ja.json`
  (Japanese) - full translation of every existing key (dashboard, config,
  robot_detail, cameras, modules, help, flasher, tester, kbstage, auth,
  gamepad_config), matching the coverage of the existing en/es/de/fr/it
  files. Wired into `src/i18n.ts`'s `resources` map and into the language
  `<select>` in `Config.tsx` (Config > UI & Themes). New `language_zh`/
  `language_ja` keys added to all 7 locale files so the dropdown's own
  option labels are translated into whichever language is currently active.
  Verified with a real `npm run build` (clean, 0 errors) after the change.
- New `README_zho.md` / `README_jpn.md` documentation translations, plus the
  5 existing README files' language selectors updated to link them.
- **Play/pause/stop no longer depend on this tab driving playback
  locally.** `RobotDetail.tsx`'s own `playRobotTrajectory` (the ~215-line
  local interpolation loop with a real velocity/acceleration curve) is
  removed, along with the effect that used to start it whenever another
  client's own 'play' command arrived. HYDRA-UMC-SERVER's new V0
  server-side playback engine is now the sole driver of playback motion
  for every client, including this one - this component already renders
  `robot.pos`/`robot.joints`/`robot.playbackState` reactively from
  whatever the server broadcasts, the same way it always displayed a
  combined sibling's own state. Fixes play/pause/stop physically doing
  nothing when commanded from Android/iOS/DSI/SUITE while no STUDIO tab
  had that robot's panel open - the server has no such dependency.
  Verified with a real `npm run build` (clean) and `npm run lint`
  (introduced zero new warnings; two now-genuinely-unused things this
  removal exposed - the `playRobotTrajectory` declaration itself and the
  `unthrottledDelay` import it was the last user of - were removed too,
  not suppressed).

## [0.1.8] - Export a recorded trajectory as G-code

- New "Export as G-code" button (`RobotDetail.tsx`, next to Save/Open in
  the Trajectories tab) - exports `robot.recordedPoints` as standard
  G-code (`G21`/`G90`/`G1 X.. Y.. Z.. A.. B.. C..`/`M2`), using each
  point's own Cartesian pose rather than joint angles (G-code is a
  Cartesian tool-path format). A/B/C are emitted for orientation
  following the convention several real G-code dialects already use for
  rotary axes - the generated header comment says this isn't a
  universal 6-DOF standard, so it should be checked against whatever
  downstream machine/viewer actually consumes the file.

---

## [0.1.3] - Hardened against a partial xyTable patch (real crash fix)

- **`VirtualKinematics.tsx` dereferenced `xyTable.tableSize.width`/
  `xyTable.pos.x`/`.y` with no null-guard** - safe as long as `xyTable`
  was either absent or fully populated, but HYDRA-UMC-SERVER's own
  `"jog"` command for an XY table used to broadcast an incomplete patch
  (`{ xyTable: { pos } }`, missing `tableSize`), which this app's own
  shallow delta-merge (`applyRobotDelta`) applied as a top-level-key
  replace - silently deleting `tableSize` from every OTHER connected
  client's state the instant anyone jogged an XY table. The resulting
  `undefined.width` threw during render - a real, reproducible crash to
  a blank page, not a hypothetical. Fixed at the source in
  HYDRA-UMC-SERVER (now sends the complete `xyTable` object); this repo
  also hardened defensively here and in `RobotDetail.tsx`'s trajectory
  interpolation (same field, same fallback pattern already used
  elsewhere in both files) so the same class of partial-patch crash
  can't recur from some other future cause.

## [0.1.1] - Floating layout extended from robot A1 to A2-A8

- **`isFloatingLayout` is no longer per-robot** - was `robot.id === 1`
  (a proof-of-concept flag), now applies to every robot. None of
  `JointControlsOverlay`/`JoystickOverlay`/`XYTableOverlay` had anything
  A1-specific baked in (robot/jogStep/handlers are plain props, per
  [0.1.0] below), so every robot's 3D view now gets the same 3
  mini-windows and the same freed-up vertical space, no other change
  needed. The `Combine with Robot` checkbox (Config tab, right sidebar)
  and every other `combinedWith`-aware code path were already generic
  across all 8 robots and untouched by this - verified they don't live
  inside the classic panel this hides.

## [0.1.0] - Robot A1's floating layout: split into 3 mini-windows

- **Joystick and XY table controls split out of `JointControlsOverlay`
  into their own floating windows** (`JoystickOverlay`, `XYTableOverlay`)
  - matches STUDIO's own draggable/collapsible mini-window style.
  `XYTableOverlay` only mounts while the robot actually `hasXYTable`, so
  it disappears the instant that's disabled instead of showing an inert
  panel.
- **Step size moved into `JointControlsOverlay`**, alongside
  Speed/Acceleration/Joints - previously only available from the classic
  panel below the 3D view, which the floating layout otherwise left with
  nothing meaningful to show.
- **Add Point / Delete Point moved into the horizontal action-button row**
  (E-STOP/START/HOME/RESET/Repeat), in their own small frame right after
  Repeat - freeing the classic Joint Controls panel below the 3D view of
  its last remaining content.
- **The classic Joint Controls panel is now hidden entirely** for the
  floating layout (nothing left to show there once the above moved out),
  so the 3D viewport's own existing `flex: 1 1 0%` sizing naturally
  reclaims that space - no new layout code needed for the "3D view fills
  the vertical space" part, just removing what was competing with it.
- Still scoped to robot A1 only (`isFloatingLayout`, unchanged) - every
  new component takes robot/jogStep/handlers as plain props with nothing
  A1-specific baked in, so extending this to A2-A8 is a follow-up change
  to that one flag, not new component work.

## [0.0.9] - Factory reset + camera/robot assignment fixes

- **3D view's camera PIP window showed even with the camera off.**
  `RobotDetail.tsx` gated the floating camera PIP overlay purely on
  `robot.online` - a robot with vision explicitly disabled
  (`visionEnabled: false`, the same field OverviewPanel/CamerasView's own
  toggle writes) still got a live PIP window the instant it came online.
  Now gated on `online && visionEnabled` for both the robot itself and
  every combined follower; the "reopen a closed PIP" icon row is filtered
  the same way, so it no longer offers a dead button for a disabled
  camera.
- **Overview cards and the camera control buttons ignored camera
  reassignment.** `CameraState.assignedRobotId` exists specifically so
  Config.tsx's own "which robot does this camera serve" dropdown can
  reassign a camera away from its default (camera N -> robot AN) - but
  `Dashboard.tsx`'s `OverviewPanel` (the vision toggle on each robot's
  card) and `CamerasView.tsx`'s connect/retry buttons both matched
  `camera.id === robotId` directly instead, which only happened to work
  for cameras still sitting at their un-reassigned default. Any real
  reassignment (exactly the reported "cameras 1&2 don't behave like
  3-8") made those controls toggle the wrong robot's `visionEnabled` -
  or nothing at all, silently. Both now match on `assignedRobotId`.
- **Factory reset created a fake second controller.** `applyServerData()`'s
  fallback (used whenever `/api/settings` comes back with no real
  controllers - which is exactly what `factoryReset()` produces: it POSTs
  `{}` and reloads) seeded state from the WHOLE `defaultControllers` demo
  array. That array has 2 entries - `[0]` ("HYDRA-UMC Master") was
  correctly rewritten to this page's own real host, but `[1]` ("HYDRA-UMC
  Node 2", hardcoded at the fixed demo IP `192.168.1.101`) was never
  touched, so it came along every time and showed up as a real, selectable
  server entry that never actually existed. Now both fallback branches
  seed from `defaultControllers[0]` alone before rewriting it to the real
  host - `defaultControllers` itself is untouched, still used elsewhere as
  a plain not-undefined fallback.

## [0.0.6] - Non-blocking confirmations + Flasher/Tester Studio render fix

- Replaced 4 blocking `confirm()` calls (E-STOP, factory reset, delete user,
  confirm flash) with the existing non-blocking `ConfirmDialog.tsx`
  component, so none of those actions can freeze the tab on a blocking
  native dialog anymore.
- Hoisted the `tiers` arrays in Flasher/Tester Studio to module-level
  constants instead of recreating them on every render, avoiding
  unnecessary effect re-runs downstream.
- Shipped as build 0.0.5; this 0.0.6 build itself is a verification
  rebuild confirming no regressions, with no further source changes.

## [0.0.1] - Automatic build versioning

- Added `scripts/bump-version.mjs`: bumps `package.json`'s `version` on every
  `npm run build`, using the odometer rule described above.
- Wired it as the first step of the `build` npm script.
- Seeded this `CHANGELOG.md` with a summary of the project's real history
  (below), condensed from the private session log.
- Documented the versioning scheme in `README.md` and its 4 translations.
- No new UI added for this: the **About** dialog already displayed the live
  app version fetched from the server, which itself already read
  `package.json` at startup - that path now simply reflects the bumped
  number automatically after each build + server restart.

---

## Earlier history

### Project history (pre-versioning), summarized

Entries below predate this file and the automatic version bump, so they
carry no version number - order reflects roughly how the work happened,
oldest first.

Read-only review of the initial scaffold, followed by several passes of real
robot geometry: swapping a placeholder figure for Parol6's actual mesh and
proportions (sourced from real reference links), wiring its real
kinematics, and extending the same "real mesh + real kinematics" treatment
to further robots. A later pass found and fixed the root cause of 3D
trajectory paths drawing incorrectly for robots whose kinematics used a
different Euler rotation order than the renderer assumed.

Brought the CAN-OTA Flasher/Tester screens (previously a "coming soon"
placeholder) to life for both the URTC and HYDRA-UMC tiers, followed by real
scaffolding work on the STM32G474/STM32H745 firmware side. A full-scope
read-only audit (parallel subagents) then produced a confirmed bug list,
fixed in a later pass.

Added Universal Robots' e-Series (5 models) with joint limits/kinematics
pulled from UR's own official ROS2 description repo, plus a grouped
by-manufacturer model picker. Continued in batches through the rest of the
`awesome-robot-descriptions` list: xArm6/Lite 6 (UFACTORY), e.DO (Comau),
Gen3 Lite (Kinova)/M-710iC (FANUC), SO-ARM100, Gen2/PiPER/Z1/ViperX 300/
WidowX 250, Koch v1.1, and the classic UR3/UR5/UR10 line - closing the
series at 24 real robot models plus the Generic placeholder. Along the way:
found and fixed a toolhead-positioning bug affecting every robot, a
byte-for-byte truncated `LICENSE` file, a full `README.md` rewrite, the
`REMOTE_API.md` contract documenting the SUITE/Android/iOS remote clients,
and a per-client remote-access toggle in Config.

A background reconnaissance pass fed a real implementation pass. The
owner's own live testing surfaced a real robot-state bug (A1) fixed on the
spot, and a major structural finding: STUDIO never actually had a login
screen despite the server already expecting authenticated requests -
fixed with a real auth middleware, admin/operator account roles, and
per-client (SUITE/Android/iOS) remote-access control. Model-submission
wiring from the sibling HYDRA-UMC-EDITOR-URDF project, and a real
performance bug fix for slow robot-panel entry, followed shortly after.

Purged historical/dated narrative ("previously...", migration notices tied
to a specific day) from source comments and docs in favor of comments that
explain current behavior only - copyright headers excluded by design.
Translated `README.md` into Spanish, Italian, French, and German
(`README_spa.md`/`README_ita.md`/`README_fra.md`/`README_deu.md`).

A full line-by-line (not sampled) review of the backend and `src/` root plus
`components/` (excluding `3d/`), followed by two passes over the
accumulated known-issues backlog. Notable real fix: AR4's inverse
kinematics solver clamped j1/j2/j3 only *after* an unconstrained
Newton-Raphson solve, which could land on an internally inconsistent pose;
changed to clamp after every iteration (projected Newton-Raphson), raising
the realistic-sweep success rate from 32.5% to 58.1% with the remaining
misses confirmed as genuine out-of-reach cases, not solver gaps. A parallel
investigation into Faze4's own non-convergence confirmed it as the same
kind of real geometric reach limit, not a bug.
