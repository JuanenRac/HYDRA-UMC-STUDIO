const fs = require('fs');
const path = require('path');

const locales = ['en', 'es', 'de', 'fr', 'it'];
const dicts = {
  en: {
    dashboard: {
      save_scene: "Save Scene",
      load_scene: "Load Scene",
      configure: "Config",
      micro_factory_status: "Micro-Factory Status",
      combined_into: "Combined into ",
      model: "Model:",
      role: "Role:",
      tool: "Tool:",
      xy_assigned: "XY Assigned",
      camera_active: "Camera Active",
      camera_offline: "Camera Offline",
      networked_robots: "Networked Robots",
      shared_resources: "Shared Resources",
      modules: "Modules",
      back: "Back",
      overview: "Overview",
      vision_cameras: "Vision / Cameras"
    },
    config: {
      controllers: "Controllers",
      ui_themes: "UI & Themes",
      robot_names: "Robot Names",
      custom_models: "Custom Models",
      integrations: "Integrations",
      controller_management: "Controller Management (Ethernet/IP)",
      name: "Name",
      ip_address: "IP Address",
      status: "Status",
      online: "Online",
      offline: "Offline",
      add_node: "Add Node",
      auto_search: "Auto-Search HYDRA-UMC",
      advanced_config: "Advanced Config",
      shared_resources: "Shared Resources Visibility",
      vision_required: "(Required)",
      rename_robots: "Rename Robots",
      add_custom_model: "Add Custom Model",
      software_integrations: "Software Integrations",
      enabled: "Enabled",
      port: "Port"
    }
  },
  es: {
    dashboard: {
      save_scene: "Guardar Escena",
      load_scene: "Cargar Escena",
      configure: "Configuración",
      micro_factory_status: "Estado de la Micro-Fábrica",
      combined_into: "Combinado en ",
      model: "Modelo:",
      role: "Rol:",
      tool: "Herramienta:",
      xy_assigned: "XY Asignado",
      camera_active: "Cámara Activa",
      camera_offline: "Cámara Inactiva",
      networked_robots: "Robots en Red",
      shared_resources: "Recursos Compartidos",
      modules: "Módulos",
      back: "Atrás",
      overview: "Vista General",
      vision_cameras: "Visión / Cámaras"
    },
    config: {
      controllers: "Controladores",
      ui_themes: "Interfaz y Temas",
      robot_names: "Nombres de Robots",
      custom_models: "Modelos Personalizados",
      integrations: "Integraciones",
      controller_management: "Gestión de Controladores (Ethernet/IP)",
      name: "Nombre",
      ip_address: "Dirección IP",
      status: "Estado",
      online: "En línea",
      offline: "Desconectado",
      add_node: "Añadir Nodo",
      auto_search: "Búsqueda Automática HYDRA-UMC",
      advanced_config: "Configuración Avanzada",
      shared_resources: "Visibilidad de Recursos Compartidos",
      vision_required: "(Requerido)",
      rename_robots: "Renombrar Robots",
      add_custom_model: "Añadir Modelo Personalizado",
      software_integrations: "Integraciones de Software",
      enabled: "Habilitado",
      port: "Puerto"
    }
  },
  de: {
    dashboard: {
      save_scene: "Szene Speichern",
      load_scene: "Szene Laden",
      configure: "Konfigurieren",
      micro_factory_status: "Mikrofabrik Status",
      combined_into: "Kombiniert in ",
      model: "Modell:",
      role: "Rolle:",
      tool: "Werkzeug:",
      xy_assigned: "XY Zugewiesen",
      camera_active: "Kamera Aktiv",
      camera_offline: "Kamera Inaktiv",
      networked_robots: "Vernetzte Roboter",
      shared_resources: "Gemeinsame Ressourcen",
      modules: "Module",
      back: "Zurück",
      overview: "Übersicht",
      vision_cameras: "Vision / Kameras"
    },
    config: {
      controllers: "Controller",
      ui_themes: "UI & Themen",
      robot_names: "Roboternamen",
      custom_models: "Benutzerdefinierte Modelle",
      integrations: "Integrationen",
      controller_management: "Controller-Verwaltung (Ethernet/IP)",
      name: "Name",
      ip_address: "IP-Adresse",
      status: "Status",
      online: "Online",
      offline: "Offline",
      add_node: "Knoten Hinzufügen",
      auto_search: "Automatische Suche HYDRA-UMC",
      advanced_config: "Erweiterte Konfiguration",
      shared_resources: "Sichtbarkeit gemeinsamer Ressourcen",
      vision_required: "(Erforderlich)",
      rename_robots: "Roboter Umbenennen",
      add_custom_model: "Benutzerdefiniertes Modell Hinzufügen",
      software_integrations: "Software-Integrationen",
      enabled: "Aktiviert",
      port: "Port"
    }
  },
  fr: {
    dashboard: {
      save_scene: "Sauvegarder Scène",
      load_scene: "Charger Scène",
      configure: "Configurer",
      micro_factory_status: "Statut de la Micro-Usine",
      combined_into: "Combiné dans ",
      model: "Modèle:",
      role: "Rôle:",
      tool: "Outil:",
      xy_assigned: "XY Assigné",
      camera_active: "Caméra Active",
      camera_offline: "Caméra Hors Ligne",
      networked_robots: "Robots en Réseau",
      shared_resources: "Ressources Partagées",
      modules: "Modules",
      back: "Retour",
      overview: "Aperçu",
      vision_cameras: "Vision / Caméras"
    },
    config: {
      controllers: "Contrôleurs",
      ui_themes: "Interface & Thèmes",
      robot_names: "Noms des Robots",
      custom_models: "Modèles Personnalisés",
      integrations: "Intégrations",
      controller_management: "Gestion des Contrôleurs (Ethernet/IP)",
      name: "Nom",
      ip_address: "Adresse IP",
      status: "Statut",
      online: "En ligne",
      offline: "Hors ligne",
      add_node: "Ajouter un Nœud",
      auto_search: "Recherche Auto HYDRA-UMC",
      advanced_config: "Configuration Avancée",
      shared_resources: "Visibilité des Ressources Partagées",
      vision_required: "(Requis)",
      rename_robots: "Renommer les Robots",
      add_custom_model: "Ajouter un Modèle",
      software_integrations: "Intégrations Logicielles",
      enabled: "Activé",
      port: "Port"
    }
  },
  it: {
    dashboard: {
      save_scene: "Salva Scena",
      load_scene: "Carica Scena",
      configure: "Configura",
      micro_factory_status: "Stato della Micro-Fabbrica",
      combined_into: "Combinato in ",
      model: "Modello:",
      role: "Ruolo:",
      tool: "Strumento:",
      xy_assigned: "XY Assegnato",
      camera_active: "Fotocamera Attiva",
      camera_offline: "Fotocamera Offline",
      networked_robots: "Robot in Rete",
      shared_resources: "Risorse Condivise",
      modules: "Moduli",
      back: "Indietro",
      overview: "Panoramica",
      vision_cameras: "Visione / Fotocamere"
    },
    config: {
      controllers: "Controller",
      ui_themes: "UI & Temi",
      robot_names: "Nomi dei Robot",
      custom_models: "Modelli Personalizzati",
      integrations: "Integrazioni",
      controller_management: "Gestione Controller (Ethernet/IP)",
      name: "Nome",
      ip_address: "Indirizzo IP",
      status: "Stato",
      online: "Online",
      offline: "Offline",
      add_node: "Aggiungi Nodo",
      auto_search: "Ricerca Automatica HYDRA-UMC",
      advanced_config: "Configurazione Avanzata",
      shared_resources: "Visibilità Risorse Condivise",
      vision_required: "(Richiesto)",
      rename_robots: "Rinomina Robot",
      add_custom_model: "Aggiungi Modello Personalizzato",
      software_integrations: "Integrazioni Software",
      enabled: "Abilitato",
      port: "Port"
    }
  }
};

for (const loc of locales) {
  const p = path.join(__dirname, 'locales', `${loc}.json`);
  const data = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const group of ['dashboard', 'config']) {
    for (const [key, val] of Object.entries(dicts[loc][group])) {
      data[group][key] = val;
    }
  }
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}
