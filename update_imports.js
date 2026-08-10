const fs = require('fs');

let content = fs.readFileSync('src/Dashboard.tsx', 'utf8');

// replace imports
content = content.replace("import { JuanenPnPConfig } from './components/JuanenPnPConfig';", "import { PickAndPlace } from './components/PickAndPlace';");
content = content.replace("import { LumenPnPConfig } from './components/LumenPnPConfig';", "");
content = content.replace("import { JuanenCNCConfig } from './components/JuanenCNCConfig';", "import { CNC } from './components/CNC';");
content = content.replace("import { JuanenLaserConfig } from './components/JuanenLaserConfig';", "import { Laser } from './components/Laser';");

// replace components
content = content.replace("{activeTab === 'juanenpnp' && <JuanenPnPConfig />}", "{activeTab === 'pickandplace' && <PickAndPlace />}");
content = content.replace("{activeTab === 'lumenpnp' && <LumenPnPConfig />}", "");
content = content.replace("{activeTab === 'juanencnc' && <JuanenCNCConfig />}", "{activeTab === 'cnc' && <CNC />}");
content = content.replace("{activeTab === 'juanenlaser' && <JuanenLaserConfig />}", "{activeTab === 'laser' && <Laser />}");

fs.writeFileSync('src/Dashboard.tsx', content);
