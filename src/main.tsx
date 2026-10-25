import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { Capacitor } from "@capacitor/core";
if (Capacitor.isNativePlatform()) {
  // OtaKit disabled — was causing main-thread deadlock on iPadOS 27
  // import("@otakit/capacitor-updater").then(({ OtaKit }) => {
  //   OtaKit.notifyAppReady();
  // });
  import("@capacitor/keyboard").then(({ Keyboard, KeyboardResize }) => {
    Keyboard.setResizeMode({ mode: KeyboardResize.None }).catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
