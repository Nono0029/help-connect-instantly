import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

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
}

const MapView = ({ demandes, ville, lat, lng, userLat, userLng }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!mapRef.current) return;

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

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
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
      L.marker(centerCoords, { icon: userIcon }).addTo(map);

      const demandesAvecCoords = demandes.filter(d => d.lat && d.lng);
      if (demandesAvecCoords.length > 0) {
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
          const dist = getDistance(centerLat, centerLng, d.lat!, d.lng!);
          const color = d.urgent ? "#ef4444" : "#22c55e";

          const icon = L.divIcon({
            html: `<div style="background:${color};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2)">${d.gratuit ? "❤️" : "€"}</div>`,
            className: "",
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const marker = L.marker([d.lat!, d.lng!], { icon, urgent: d.urgent });
          marker.bindPopup(`
            <div style="font-family:sans-serif;min-width:180px;cursor:pointer" onclick="window.__mapNavigate(${d.id})">
              <b style="font-size:13px">${d.titre}</b><br/>
              <span style="font-size:11px;color:#888">${d.categorie}${d.ville ? " · " + d.ville : ""}</span><br/>
              <span style="font-size:11px;color:#666">📍 ${dist < 1 ? (dist * 1000).toFixed(0) + "m" : dist.toFixed(1) + "km"}</span>
            </div>
          `);
          mcg.addLayer(marker);
        });

        map.addLayer(mcg);
      }

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
  }, [demandes, ville, lat, lng, userLat, userLng]);

  return (
    <div className="mx-4 mt-3 rounded-2xl overflow-hidden border border-border relative z-0 h-52">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default MapView;