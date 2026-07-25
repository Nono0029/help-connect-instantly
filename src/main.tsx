import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { Capacitor } from "@capacitor/core";
if (Capacitor.isNativePlatform()) {
  import("@capgo/capacitor-updater").then(({ CapacitorUpdater }) => {
    CapacitorUpdater.notifyAppReady();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
