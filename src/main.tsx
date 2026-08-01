import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { Capacitor } from "@capacitor/core";
if (Capacitor.isNativePlatform()) {
  import("@otakit/capacitor-updater").then(({ OtaKit }) => {
    OtaKit.notifyAppReady();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
