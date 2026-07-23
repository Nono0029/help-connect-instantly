import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

declare global {
  interface Window {
    __capgoDebug: {
      logs: string[];
      channel: string | null;
      bundleId: string | null;
      deviceId: string | null;
      nativeVersion: string | null;
      error: string | null;
      notifySent: boolean;
      updateAvailable: boolean;
    };
  }
}

window.__capgoDebug = {
  logs: [],
  channel: null,
  bundleId: null,
  deviceId: null,
  nativeVersion: null,
  error: null,
  notifySent: false,
  updateAvailable: false,
};

export function capgoLog(msg: string) {
  const ts = new Date().toLocaleTimeString('fr-FR');
  window.__capgoDebug.logs.push(`[${ts}] ${msg}`);
  if (window.__capgoDebug.logs.length > 50) {
    window.__capgoDebug.logs.shift();
  }
}

export function CapgoDebug() {
  const [visible, setVisible] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  if (!Capacitor.isNativePlatform()) return null;

  const d = window.__capgoDebug;

  return (
    <>
      <button
        onClick={() => setVisible(v => !v)}
        className="fixed bottom-20 right-2 z-[9999] bg-black/80 text-white text-[10px] px-2 py-1 rounded font-mono"
        style={{ touchAction: 'manipulation' }}
      >
        {d.error ? '🔴 OTA' : d.notifySent ? '🟢 OTA' : '⚪ OTA'}
      </button>

      {visible && (
        <div className="fixed inset-x-2 bottom-28 z-[9999] bg-black/95 text-white text-[11px] font-mono rounded-lg p-3 max-h-[50vh] overflow-y-auto shadow-2xl border border-white/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/60 text-[10px]">Capgo OTA Debug</span>
            <button onClick={() => setVisible(false)} className="text-white/60 text-xs">✕</button>
          </div>

          <div className="space-y-1 mb-3">
            <Row label="Channel" value={d.channel || '...'} color={d.channel === 'production' ? 'green' : 'yellow'} />
            <Row label="Bundle ID" value={d.bundleId || '...'} />
            <Row label="Device ID" value={d.deviceId ? d.deviceId.slice(0, 12) + '...' : '...'} />
            <Row label="Native version" value={d.nativeVersion || '...'} />
            <Row label="notifyAppReady" value={d.notifySent ? '✅ envoyé' : '❌ pas encore'} color={d.notifySent ? 'green' : 'red'} />
            <Row label="Update available" value={d.updateAvailable ? '⚠️ OUI' : 'non'} color={d.updateAvailable ? 'yellow' : 'green'} />
            {d.error && <Row label="Erreur" value={d.error} color="red" />}
          </div>

          <div className="text-white/60 text-[10px] mb-1">Logs ({d.logs.length})</div>
          <div className="bg-black/50 rounded p-2 max-h-[20vh] overflow-y-auto">
            {d.logs.length === 0 && <div className="text-white/30">Aucun log encore...</div>}
            {d.logs.map((log, i) => (
              <div key={i} className="text-white/80 leading-tight">{log}</div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  const textColor = color === 'green' ? 'text-green-400' : color === 'red' ? 'text-red-400' : color === 'yellow' ? 'text-yellow-400' : 'text-white';
  return (
    <div className="flex justify-between">
      <span className="text-white/50">{label}</span>
      <span className={textColor}>{value}</span>
    </div>
  );
}
