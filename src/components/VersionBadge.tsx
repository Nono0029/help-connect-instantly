import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

interface Badge {
  native: string;
  bundle: string;
  builtin: string;
}

export default function VersionBadge() {
  const [badge, setBadge] = useState<Badge | null>(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;

    (async () => {
      let native = "";
      try {
        const info = await App.getInfo();
        native = `${info.version} (${info.build})`;
      } catch {
        native = "?";
      }
      let bundle = "?", builtin = "?";
      try {
        const { OtaKit } = await import("@otakit/capacitor-updater");
        const state = await OtaKit.getCurrent();
        bundle = `${state.current.version} [${state.current.id.slice(0, 8)}]`;
        builtin = state.builtinVersion || "?";
      } catch {
        bundle = "N/A";
      }
      if (!cancelled) setBadge({ native, bundle, builtin });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!badge) return null;

  return (
    <div className="fixed bottom-1 left-1 z-[100] pointer-events-none text-[9px] font-mono leading-tight bg-black/50 text-white/80 px-1.5 py-0.5 rounded">
      <div>native {badge.native}</div>
      <div>builtin {badge.builtin}</div>
      <div>ota {badge.bundle}</div>
    </div>
  );
}
