import { useEffect, useRef } from "react";

interface Demande {
  id: number;
  titre: string;
  categorie: string;
  ville?: string;
  urgent?: boolean;
}

interface Props {
  demandes: Demande[];
  ville: string;
  lat: number;
  lng: number;
}

const MapView = ({ demandes, ville, lat, lng }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    const loadLeaflet = async () => {
      if (!(window as any).L) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      const L = (window as any).L;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const centerCoords: [number, number] = [lat, lng];
      const map = L.map(mapRef.current, { zoomControl: false }).setView(centerCoords, 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      // Point utilisateur
      const userIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker(centerCoords, { icon: userIcon }).addTo(map);

      // Demandes dans la ville sélectionnée
      const demandesLocales = demandes.filter(d => !d.ville || d.ville === ville);
      if (demandesLocales.length > 0) {
        const hasUrgent = demandesLocales.some(d => d.urgent);
        const color = hasUrgent ? "#ef4444" : "#22c55e";
        const icon = L.divIcon({
          html: `<div style="background:${color};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:12px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${demandesLocales.length}</div>`,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        const popup = demandesLocales.slice(0, 3).map(d => `<div style="margin-bottom:4px;font-size:12px">• ${d.titre}</div>`).join("") +
          (demandesLocales.length > 3 ? `<div style="font-size:11px;color:#888">+${demandesLocales.length - 3} autres</div>` : "");
        L.marker([lat + 0.002, lng + 0.002], { icon })
          .addTo(map)
          .bindPopup(`<div style="font-family:sans-serif;min-width:160px"><b style="font-size:13px">${ville}</b><br/><span style="font-size:11px;color:#888">${demandesLocales.length} demande${demandesLocales.length > 1 ? "s" : ""}</span><div style="margin-top:6px">${popup}</div></div>`);
      }
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [demandes, ville, lat, lng]);

  return (
    <div className="mx-4 mt-3 rounded-2xl overflow-hidden border border-border relative h-44">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default MapView;
