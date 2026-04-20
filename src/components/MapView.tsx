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
}

// Coordonnées approximatives par ville (centre de ville uniquement)
const VILLE_COORDS: Record<string, [number, number]> = {
  "Paris 1er": [48.8606, 2.3464], "Paris 2ème": [48.8672, 2.3472], "Paris 3ème": [48.8637, 2.3599],
  "Paris 4ème": [48.8534, 2.3530], "Paris 5ème": [48.8462, 2.3508], "Paris 6ème": [48.8496, 2.3340],
  "Paris 7ème": [48.8566, 2.3122], "Paris 8ème": [48.8752, 2.3084], "Paris 9ème": [48.8765, 2.3390],
  "Paris 10ème": [48.8757, 2.3602], "Paris 11ème": [48.8589, 2.3794], "Paris 12ème": [48.8402, 2.3887],
  "Paris 13ème": [48.8322, 2.3561], "Paris 14ème": [48.8330, 2.3243], "Paris 15ème": [48.8418, 2.2942],
  "Paris 16ème": [48.8637, 2.2769], "Paris 17ème": [48.8877, 2.3136], "Paris 18ème": [48.8927, 2.3444],
  "Paris 19ème": [48.8826, 2.3789], "Paris 20ème": [48.8636, 2.3980],
  "Lyon 1er": [45.7676, 4.8344], "Lyon 2ème": [45.7496, 4.8283], "Lyon 3ème": [45.7579, 4.8486],
  "Lyon 4ème": [45.7745, 4.8269], "Lyon 5ème": [45.7558, 4.8097], "Lyon 6ème": [45.7689, 4.8527],
  "Lyon 7ème": [45.7377, 4.8445], "Lyon 8ème": [45.7254, 4.8527], "Lyon 9ème": [45.7781, 4.8027],
  "Marseille 1er": [43.2965, 5.3698], "Marseille 2ème": [43.3052, 5.3636], "Marseille 3ème": [43.3089, 5.3803],
  "Marseille 4ème": [43.2918, 5.3947], "Marseille 5ème": [43.2831, 5.3947], "Marseille 6ème": [43.2876, 5.3808],
  "Marseille 7ème": [43.2836, 5.3663], "Marseille 8ème": [43.2604, 5.3783],
  "Bordeaux": [44.8378, -0.5792], "Toulouse": [43.6047, 1.4442], "Nantes": [47.2184, -1.5536],
  "Strasbourg": [48.5734, 7.7521], "Lille": [50.6292, 3.0573], "Rennes": [48.1173, -1.6778],
  "Reims": [49.2583, 4.0317], "Nice": [43.7102, 7.2620], "Toulon": [43.1242, 5.9280],
  "Grenoble": [45.1885, 5.7245], "Montpellier": [43.6108, 3.8767], "Béziers": [43.3442, 3.2150],
  "Clermont-Ferrand": [45.7797, 3.0863], "Rouen": [49.4432, 1.0993], "Caen": [49.1829, -0.3707],
  "Nancy": [48.6921, 6.1844], "Metz": [49.1193, 6.1757], "Amiens": [49.8942, 2.2957],
  "Tours": [47.3941, 0.6848], "Orléans": [47.9029, 1.9039], "Dijon": [47.3220, 5.0415],
  "Angers": [47.4784, -0.5632], "Le Mans": [48.0061, 0.1996], "Saint-Étienne": [45.4397, 4.3872],
  "Brest": [48.3905, -4.4860], "Nîmes": [43.8367, 4.3601], "Le Havre": [49.4944, 0.1079],
  "Mulhouse": [47.7508, 7.3359], "Perpignan": [42.6887, 2.8948], "Besançon": [47.2378, 6.0241],
};

const MapView = ({ demandes, ville }: Props) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Charger Leaflet dynamiquement
    const loadLeaflet = async () => {
      if (!(window as any).L) {
        // Charger le CSS
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);

        // Charger le JS
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
      }

      const centerCoords = VILLE_COORDS[ville] || [46.6034, 1.8883];
      const map = L.map(mapRef.current, { zoomControl: false }).setView(centerCoords, 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      // Point de l'utilisateur
      const userIcon = L.divIcon({
        html: `<div style="width:14px;height:14px;background:#3b82f6;border:2px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.3)"></div>`,
        className: "",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      L.marker(centerCoords, { icon: userIcon }).addTo(map);

      // Grouper les demandes par ville
      const demandesParVille: Record<string, Demande[]> = {};
      demandes.forEach(d => {
        const v = d.ville || ville;
        if (!demandesParVille[v]) demandesParVille[v] = [];
        demandesParVille[v].push(d);
      });

      // Afficher les marqueurs par ville
      Object.entries(demandesParVille).forEach(([v, ds]) => {
        const coords = VILLE_COORDS[v];
        if (!coords) return;

        const hasUrgent = ds.some(d => d.urgent);
        const color = hasUrgent ? "#ef4444" : "#22c55e";

        const icon = L.divIcon({
          html: `<div style="background:${color};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:11px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">${ds.length}</div>`,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const popup = ds.slice(0, 3).map(d => `<div style="margin-bottom:4px;font-size:12px">• ${d.titre}</div>`).join("") +
          (ds.length > 3 ? `<div style="font-size:11px;color:#888">+${ds.length - 3} autres</div>` : "");

        L.marker(coords, { icon })
          .addTo(map)
          .bindPopup(`<div style="font-family:sans-serif;min-width:160px"><b style="font-size:13px">${v}</b><br/><span style="font-size:11px;color:#888">${ds.length} demande${ds.length > 1 ? "s" : ""}</span><div style="margin-top:6px">${popup}</div></div>`);
      });
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [demandes, ville]);

  return (
    <div className="mx-4 mt-3 rounded-2xl overflow-hidden border border-border relative h-44">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
};

export default MapView;
