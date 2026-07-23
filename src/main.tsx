import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { Capacitor } from "@capacitor/core";
import { capgoLog } from "./components/CapgoDebug.tsx";

if (Capacitor.isNativePlatform()) {
  const d = window.__capgoDebug;

  capgoLog("Démarrage sur plateforme native: " + Capacitor.getPlatform());
  capgoLog("isNativePlatform: true");

  import("@capgo/capacitor-updater").then(({ CapacitorUpdater }) => {
    capgoLog("Module CapacitorUpdater chargé");

    // Récupérer le channel actuel
    CapacitorUpdater.getChannel()
      .then((res) => {
        d.channel = res?.id || null;
        capgoLog("Channel actuel: " + (res?.id || "AUCUN"));
      })
      .catch((err) => {
        capgoLog("Erreur getChannel: " + err.message);
        d.error = "getChannel: " + err.message;
      });

    // Récupérer le bundle ID
    CapacitorUpdater.getId()
      .then((res) => {
        d.bundleId = res?.id || null;
        capgoLog("Bundle ID: " + (res?.id || "AUCUN"));
      })
      .catch((err) => {
        capgoLog("Erreur getId: " + err.message);
      });

    // Notifier que l'app est prête
    try {
      CapacitorUpdater.notifyAppReady();
      d.notifySent = true;
      capgoLog("notifyAppReady() envoyé ✅");
    } catch (err: any) {
      d.error = "notifyAppReady failed: " + err.message;
      capgoLog("❌ Erreur notifyAppReady: " + err.message);
    }

    // Écouter les événements d'update
    CapacitorUpdater.addListener("updateAvailable", (res) => {
      d.updateAvailable = true;
      capgoLog("⚠️ Update disponible: " + JSON.stringify(res));
    }).then(() => {
      capgoLog("Listener 'updateAvailable' enregistré");
    }).catch((err) => {
      capgoLog("Erreur addListener updateAvailable: " + err.message);
    });

    CapacitorUpdater.addListener("updateFailed", (res) => {
      d.error = "updateFailed: " + JSON.stringify(res);
      capgoLog("❌ Update échouée: " + JSON.stringify(res));
    }).then(() => {
      capgoLog("Listener 'updateFailed' enregistré");
    }).catch((err) => {
      capgoLog("Erreur addListener updateFailed: " + err.message);
    });

    // Récupérer la version native
    CapacitorUpdater.getVersion()
      .then((res) => {
        d.nativeVersion = res?.version || null;
        capgoLog("Version native: " + (res?.version || "AUCUNE"));
      })
      .catch((err) => {
        capgoLog("Erreur getVersion: " + err.message);
      });

  }).catch((err) => {
    d.error = "Import failed: " + err.message;
    capgoLog("❌ Erreur import CapacitorUpdater: " + err.message);
  });
} else {
  capgoLog("Plateforme NON native (web) - pas d'OTA");
}

createRoot(document.getElementById("root")!).render(<App />);
