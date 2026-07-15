import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDistance } from "@/lib/utils";

interface Demande {
  id: number;
  titre: string;
  categorie: string;
  ville?: string;
  urgent?: boolean;
  prix?: string;
  gratuit?: boolean;
  lat?: number;
  lng?: number;
}

interface Props {
  demandes: Demande[];
  ville: string;
  lat: number;
  lng: number;
  userLat?: number;
  userLng?: number;
  onLocate?: (lat: number, lng: number) => void;
}

const MapView = ({ demandes, ville, lat, lng, userLat, userLng, onLocate }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const navigate = useNavigate();
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const loadLeaflet = async () => {
      const W = window as any;

      if (!W.L) {
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

      const L = W.L;

      if (!W.LeafletCluster) {
        await new Promise<void>((resolve) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js";
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
        const clusterCss = document.createElement("link");
        clusterCss.rel = "stylesheet";
        clusterCss.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css";
        document.head.appendChild(clusterCss);
        const clusterCss2 = document.createElement("link");
        clusterCss2.rel = "stylesheet";
        clusterCss2.href = "https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css";
        document.head.appendChild(clusterCss2);
        W.LeafletCluster = true;
      }

      const centerLat = userLat || lat;
      const centerLng = userLng || lng;
      const centerCoords: [number, number] = [centerLat, centerLng];

      const map = L.map(mapRef.current, { zoomControl: false }).setView(centerCoords, 12);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      const userIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3),0 2px 8px rgba(0,0,0,0.2)"></div>`,
        className: "",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      userMarkerRef.current = L.marker(centerCoords, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);

      (window as any).__mapNavigate = (id: number) => {
        navigate(`/demande/${id}`);
      };
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      delete (window as any).__mapNavigate;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    map.invalidateSize();
    map.flyTo([lat, lng], map.getZoom() < 10 ? 12 : map.getZoom(), { duration: 0.8 });

    if (userLat && userLng && userMarkerRef.current) {
      userMarkerRef.current.setLatLng([userLat, userLng]);
      if (!map.hasLayer(userMarkerRef.current)) {
        userMarkerRef.current.addTo(map);
      }
    } else if (userMarkerRef.current && map.hasLayer(userMarkerRef.current)) {
      map.removeLayer(userMarkerRef.current);
    }

    const demandesAvecCoords = demandes.filter(d => d.lat && d.lng);
    if (demandesAvecCoords.length === 0) return;

    const mcg = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        const urgentCount = cluster.getAllChildMarkers().filter((m: any) => m.options.urgent).length;
        const color = urgentCount > 0 ? "#ef4444" : "#22c55e";
        return L.divIcon({
          html: `<div style="background:${color};color:white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:14px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${count}</div>`,
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
      },
    });

    demandesAvecCoords.forEach((d) => {
      const dist = getDistance(lat, lng, d.lat!, d.lng!);
      const color = d.urgent ? "#ef4444" : "#22c55e";

      const icon = L.divIcon({
        html: `<div style="background:${color};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2)">${d.gratuit ? "❤️" : "€"}</div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([d.lat!, d.lng!], { icon, urgent: d.urgent });
      const sanitize = (s: string) => s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
      const distLabel = dist < 1 ? (dist * 1000).toFixed(0) + "m" : dist.toFixed(1) + "km";
      marker.bindTooltip(`
        <div style="font-family:sans-serif">
          <b style="font-size:13px">${sanitize(d.titre)}</b><br/>
          <span style="font-size:11px;color:#888">${sanitize(d.categorie)}${d.ville ? " · " + sanitize(d.ville) : ""}</span><br/>
          <span style="font-size:11px;color:#666">📍 ${distLabel} · touche pour voir l'annonce</span>
        </div>
      `, { direction: "top", offset: [0, -14] });
      marker.on("click", () => navigate(`/demande/${d.id}`));
      mcg.addLayer(marker);
    });

    markersLayerRef.current.addLayer(mcg);
  }, [demandes, lat, lng, userLat, userLng]);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const map = mapInstanceRef.current;
        if (map) {
          map.flyTo([latitude, longitude], Math.max(map.getZoom(), 14), { duration: 0.8 });
          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([latitude, longitude]);
            if (!map.hasLayer(userMarkerRef.current)) {
              userMarkerRef.current.addTo(map);
            }
          }
        }
        onLocate?.(latitude, longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="mx-4 mt-3 rounded-2xl overflow-hidden border border-border relative z-0 h-52">
      <div ref={mapRef} className="w-full h-full" />
      <button
        onClick={handleLocate}
        aria-label="Ma position"
        className="absolute top-2 right-2 z-[1000] flex items-center justify-center w-9 h-9 rounded-full transition-transform active:scale-90"
        style={{
          background: "linear-gradient(135deg, rgba(34,197,94,0.65), rgba(234,179,8,0.55))",
          backdropFilter: "blur(16px) saturate(1.6)",
          WebkitBackdropFilter: "blur(16px) saturate(1.6)",
          border: "1px solid rgba(255,255,255,0.25)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        {locating ? (
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        )}
      </button>
    </div>
  );
};

export default MapView;